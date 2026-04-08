// gerer la liaison entre un commit et un concept
// c'est la fonctionnalite centrale de commitmind :
// on peut "taguer" un commit avec un concept
//  pour dire "dans ce commit j'ai applique ce concept"
//
// ici on gere deux types de liaisons :
//   1. liaison manuelle  = l'utilisateur choisit lui-meme le concept
//   2. liaison auto = le systeme detecte les concepts automatiquement
//    en analysant le message du commit et les fichiers
//
// pourquoi un controller separe ?
//  la liaison commit/concept est une responsabilite distincte
//  des commits et des concepts eux-memes
//  la separer dans son propre fichier rend le code plus lisible
//  et plus facile a maintenir si on veut ajouter des fonctionnalites

// client prisma pour acceder a la base de donnees
const prisma = require('../utils/prisma')

// service de detection automatique de concepts
// il contient le dictionnaire de mots-cles et la logique d'analyse
const { detectConceptsFromCommit } = require('../services/conceptDetectionService')

// fonction : linkConceptToCommit
// route : POST /repositories/:repoId/commits/:commitId/concepts
//  creer un lien MANUEL entre un commit et un concept existant
//   l'utilisateur choisit lui-meme quel concept lier
//   avant de creer le lien, on verifie que :
//   1. le depot appartient bien a l'utilisateur connecte
//   2. le commit appartient bien a ce depot
//   3. le concept appartient bien a l'utilisateur connecte
//   ces 3 verifications evitent qu'un utilisateur puisse
//   lier des donnees qui ne lui appartiennent pas
const linkConceptToCommit = async (req, res) => {
  try {
    // req.params contient les segments dynamiques de l'url
    // ex: pour /repositories/42/commits/7/concepts
    //     repoId = "42" et commitId = "7" (ce sont des strings)
    const { repoId, commitId } = req.params

    // req.body contient les donnees envoyees par le client
    // validate(linkConceptSchema) a deja verifie que conceptId
    // est present et que c'est un nombre entier positif
    const { conceptId } = req.body

    // verification 1 : le depot appartient-il a l'utilisateur ?
    // on cherche un depot qui correspond aux deux criteres en meme temps :
    //  - son id numerique correspond a repoId
    //  - il appartient a l'utilisateur connecte (userId)
    // si on ne verifie pas userId, n'importe qui pourrait
    // acceder aux depots des autres utilisateurs
    // parseInt() convertit le string "42" en nombre 42
    // car les params d'url sont toujours des strings
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id  // securite : on s'assure que c'est son depot
      }
    })

    // si aucun depot trouve, on renvoie 404 (not found)
    // on utilise "return" pour stopper l'execution ici
    // sans "return", le code continuerait malgre l'erreur
    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    // verification 2 : le commit appartient-il a ce depot ?
    // on cherche un commit avec l'id ET qui appartient a ce depot
    // ca evite qu'on passe un commitId d'un autre depot
    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id  // securite : commit de ce depot precis
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    // verification 3 : le concept appartient-il a l'utilisateur ?
    // un utilisateur ne peut lier que ses propres concepts
    // il ne peut pas utiliser les concepts d'un autre utilisateur
    // conceptId vient du body et a deja ete valide par zod
    // parseInt() est quand meme applique par securite
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(conceptId),
        userId: req.user.id  // securite : concept de cet utilisateur
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // creation du lien
    // on utilise upsert plutot que create pour eviter les doublons :
    //  si le lien existe deja = on ne fait rien (update: {} vide)
    //  si le lien n'existe pas = on le cree
    // la contrainte @@unique([commitId, conceptId]) dans schema.prisma
    // garantit qu'on ne peut pas avoir deux fois le meme lien
    // prisma utilise cette contrainte comme critere de recherche
    // via la cle composee "commitId_conceptId"
    const link = await prisma.commitConcept.upsert({
      where: {
        // "commitId_conceptId" est le nom que prisma donne automatiquement
        // a la contrainte @@unique([commitId, conceptId]) du schema
        // c'est la combinaison des deux ids qui identifie un lien unique
        commitId_conceptId: {
          commitId: commit.id,
          conceptId: concept.id
        }
      },
      // update vide car si le lien existe deja il n'y a rien a modifier
      // on veut juste eviter l'erreur de doublon
      update: {},
      // si le lien n'existe pas, on le cree avec les deux ids
      create: {
        commitId: commit.id,
        conceptId: concept.id
      }
    })

    // 201 = "created", le code http standard pour une creation reussie
    // on inclut un message lisible et l'objet lien cree
    res.status(201).json({
      message: `concept "${concept.name}" linked to commit "${commit.message}"`,
      link
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : autoDetectConcepts
// route : POST /repositories/:repoId/commits/:commitId/concepts/auto
// role : detecter AUTOMATIQUEMENT les concepts d'un commit
//  en analysant trois sources de donnees :
//  1. le message du commit
//  2. les noms des fichiers modifies
//  3. le contenu du code modifie (patch)
//
// difference avec linkConceptToCommit :
//   linkConceptToCommit = l'utilisateur choisit le concept
//   autoDetectConcepts  = le systeme detecte les concepts tout seul
//
// le systeme utilise un dictionnaire de regles dans
// conceptDetectionService.js pour faire correspondre
// des mots-cles a des concepts techniques
const autoDetectConcepts = async (req, res) => {
  try {
    const { repoId, commitId } = req.params

    // verification 1 : le depot appartient a l'utilisateur ?
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    // verification 2 : le commit appartient a ce depot ?
    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    // on recupere les fichiers deja stockes en DB pour ce commit
    // ces fichiers ont ete syncronises avec POST .../files/sync
    // le patch contient le code modifie ligne par ligne
    const files = await prisma.commitFile.findMany({
      where: { commitId: commit.id }
    })

    // detection automatique
    // on passe le message du commit et ses fichiers au service
    // le service parcourt le dictionnaire de regles et retourne
    // les noms des concepts detectes (ex: ["JWT Authentication", "Prisma ORM"])
    const detectedConceptNames = detectConceptsFromCommit(commit.message, files)
    const linkedConcepts = []

    // pour chaque concept detecte, on fait deux choses :
    for (const conceptName of detectedConceptNames) {
      // etape 1 : creer le concept s'il n'existe pas encore
      // on utilise upsert avec la contrainte unique (name + userId) :
      //  si le concept existe deja pour cet utilisateur = on ne change rien
      //  sinon = on le cree automatiquement
      // ca evite de demander a l'utilisateur de creer le concept manuellement
      const concept = await prisma.concept.upsert({
        where: {
          // "name_userId" est le nom que prisma donne a la contrainte
          // @@unique([name, userId]) qu'on a ajoutee dans schema.prisma
          // ca permet d'identifier un concept par son nom + son proprietaire
          name_userId: {
            name: conceptName,
            userId: req.user.id
          }
        },
        // si le concept existe deja, on ne le modifie pas
        update: {},
        // si le concept n'existe pas, on le cree avec le nom detecte
        create: {
          name: conceptName,
          userId: req.user.id
        }
      })

      // etape 2 : lier le concept au commit
      // meme logique upsert pour eviter les doublons
      // si le lien existe deja = on ne fait rien
      // si le lien n'existe pas = on le cree
      await prisma.commitConcept.upsert({
        where: {
          commitId_conceptId: {
            commitId: commit.id,
            conceptId: concept.id
          }
        },
        update: {},
        create: {
          commitId: commit.id,
          conceptId: concept.id
        }
      })

      linkedConcepts.push(conceptName)
    }

    // on renvoie le resultat avec :
    //  - le nombre de concepts detectes
    //  - la liste des concepts detectes et lies
    //  - un message si aucun concept n'a ete detecte
    res.json({
      message: linkedConcepts.length > 0
        ? `${linkedConcepts.length} concepts detected and linked automatically`
        : 'no concepts detected for this commit',
      detectedConcepts: linkedConcepts
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte les deux fonctions pour que le fichier de routes puisse les utiliser
module.exports = { linkConceptToCommit, autoDetectConcepts }