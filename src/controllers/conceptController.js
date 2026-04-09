// logique metier complete pour les concepts
// un concept est un tag d'apprentissage cree par l'utilisateur
//  ex: "jwt", "recursivite", "tests unitaires"
//  ce controller gere toutes les operations crud :
//  creer, lire (liste + detail), modifier, supprimer
// et aussi une requete speciale : commits par concept
//
// crud = create, read, update, delete
//  createConcept = create
//  getConcepts  = read (liste)
//  getConceptById = read (detail)
//  updateConcept  = update
//  deleteConcept  = delete
//  getCommitsByConcept = read special (commits lies)

// client prisma pour toutes les requetes en base
const prisma = require('../utils/prisma')

// fonction : createConcept
//  POST /concepts
//  creer un nouveau concept pour l'utilisateur connecte
//  le body a deja ete valide par validate(conceptSchema)
//  donc name est garanti present et valide
const createConcept = async (req, res) => {
  try {
    // on extrait les donnees validees du corps de la requete
    // req.body a ete nettoye et valide par le middleware validate()
    const { name, description } = req.body

    // on cree le concept en base avec prisma
    const concept = await prisma.concept.create({
      data: {
        name,
        // si description n'a pas ete fourni, on stocke null
        // plutot que undefined (prisma prefere null pour les champs optionnels)
        description: description || null,
        // on lie le concept a l'utilisateur connecte
        // sans ca, le concept n'appartient a personne
        userId: req.user.id
      }
    })

    // 201 = "created" : code http standard pour une creation reussie
    res.status(201).json({ concept })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : getConcepts
//  GET /concepts
//  lister tous les concepts de l'utilisateur
//  avec pagination et recherche par nom
//  supporte ?page=, ?limit=, ?search=
const getConcepts = async (req, res) => {
  try {
    // on importe les fonctions de pagination ici plutot qu'en haut
    // c'est une pratique acceptable dans certains projets
    // mais normalement on prefere importer en haut du fichier
    // pour que ce soit visible immediatement
    const { getPagination, paginatedResponse } = require('../utils/pagination')

    // on calcule les parametres de pagination depuis l'url
    const { page, limit, skip } = getPagination(req.query)

    // on recupere le terme de recherche ou une chaine vide par defaut
    // une chaine vide est "falsy" en javascript, donc le filtre
    // ne sera pas applique si search est vide
    const search = req.query.search || ''

    // construction du filtre dynamique
    // on commence avec le filtre de base : seulement les concepts de cet user
    // puis on ajoute le filtre de recherche si search est fourni
    const where = {
      userId: req.user.id,

      // la syntaxe "...(condition && { cle: valeur })" s'appelle
      // "spread conditionnel" : si search est truthy (non vide),
      // on etale l'objet { name: { contains: search } } dans where
      // si search est falsy (vide), on etale false qui ne fait rien
      // c'est une facon concise d'ajouter un filtre conditionnellement
      ...(search && {
        name: {
          contains: search  // equivalent du LIKE '%search%' en sql
        }
      })
    }

    // on compte d'abord pour la pagination
    // le meme filtre "where" s'applique au count et au findMany
    const total = await prisma.concept.count({ where })

    // on recupere les concepts de la page demandee
    const concepts = await prisma.concept.findMany({
      where,
      orderBy: { createdAt: 'desc' },  // les plus recents en premier
      skip, // nombre d'enregistrements a sauter
      take: limit  // nombre max de resultats a retourner
    })

    // on renvoie la reponse avec les metadonnees de pagination
    res.json(paginatedResponse(concepts, total, page, limit))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : getConceptById
//  GET /concepts/:id
//  recuperer un seul concept par son identifiant
//  verifie que le concept appartient a l'utilisateur
const getConceptById = async (req, res) => {
  try {
    // req.params.id est toujours une string depuis l'url
    // on destructure directement pour plus de lisibilite
    const { id } = req.params

    // findFirst avec double critere pour la securite :
    //  id  : on cherche le bon concept
    //  userId : on s'assure qu'il appartient a cet utilisateur
    // si on utilisait findUnique avec seulement l'id,
    // un utilisateur pourrait voir les concepts des autres
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id), // parseInt car id est une string dans l'url
        userId: req.user.id // securite : seulement ses propres concepts
      }
    })

    // si null est retourne, le concept n'existe pas
    // ou n'appartient pas a cet utilisateur
    // on renvoie 404 dans les deux cas (on ne precise pas lequel
    // pour eviter de donner des informations a un attaquant)
    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // concept trouve : on le renvoie
    res.json({ concept })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : updateConcept
//  PUT /concepts/:id
//  modifier le nom et/ou la description d'un concept
//  on verifie d'abord que le concept existe
//  et appartient a l'utilisateur avant de modifier
const updateConcept = async (req, res) => {
  try {
    const { id } = req.params

    // les nouvelles valeurs validees par validate(conceptSchema)
    const { name, description } = req.body

    // on verifie d'abord que le concept existe et appartient a l'user
    // on fait cette verification AVANT le update pour renvoyer un 404
    // propre plutot qu'une erreur prisma cryptique si le concept
    // n'existe pas ou n'appartient pas a cet utilisateur
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // maintenant qu'on a confirme que le concept existe et appartient
    // a l'utilisateur, on peut faire la mise a jour en toute securite
    // on utilise findUnique implicitement via "where: { id }"
    // car id est le champ @id (unique) dans prisma
    const updated = await prisma.concept.update({
      where: { id: parseInt(id) },
      data: {
        name,
        // si description n'est pas fourni dans le body, on stocke null
        // ca permet d'effacer une description existante
        description: description || null
      }
    })

    // on renvoie le concept mis a jour
    res.json({ concept: updated })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : deleteConcept
//  DELETE /concepts/:id
//  supprimer definitivement un concept
//  la suppression efface aussi toutes les liaisons
//  commitconcept associees (gere par le schema prisma)
//  on verifie que le concept appartient a l'utilisateur
//  avant de le supprimer
const deleteConcept = async (req, res) => {
  try {
    const { id } = req.params

    // on verifie que le concept existe et appartient a l'utilisateur
    // avant de le supprimer pour eviter de supprimer par erreur
    // le concept d'un autre utilisateur
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // on supprime le concept
    // prisma s'occupe automatiquement de supprimer les lignes
    // dans la table commitconcept grace aux regles de cascade
    // definies dans le schema prisma
    await prisma.concept.delete({
      where: { id: parseInt(id) }
    })

    // on confirme la suppression avec un message clair
    res.json({ message: 'concept deleted successfully' })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : getCommitsByConcept
//  GET /concepts/:conceptId/commits
//  recuperer tous les commits lies a un concept precis
//  utile pour voir "tous mes commits ou j'ai applique JWT"
//  on passe par la table intermediaire commitconcept
//  pour recuperer les commits associes
const getCommitsByConcept = async (req, res) => {
  try {
    // l'id du concept vient de l'url (:conceptId dans la route)
    const { conceptId } = req.params

    // on verifie que le concept existe et appartient a l'utilisateur
    // avant de chercher ses commits
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(conceptId),
        userId: req.user.id  // securite : seulement ses propres concepts
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // on cherche dans la table de liaison commitconcept
    // toutes les lignes qui pointent vers ce concept
    // et on inclut le commit complet (avec ses fichiers) dans la reponse
    const commitConcepts = await prisma.commitConcept.findMany({
      where: {
        conceptId: concept.id  // on filtre par l'id du concept confirme
      },
      include: {
        commit: {
          include: {
            files: true  // on charge aussi les fichiers de chaque commit
          }
        }
      },
      // on trie par date de commit descendante (le plus recent en premier)
      // on trie sur le commit inclus, pas sur commitconcept lui-meme
      orderBy: {
        commit: {
          committedAt: 'desc'
        }
      }
    })

    // on extrait directement les commits depuis les liaisons
    // commitConcepts est un tableau de { id, commitId, conceptId, commit }
    // on veut juste le tableau de commits, pas les liaisons
    const commits = commitConcepts.map(cc => cc.commit)

    // on renvoie le nom du concept, le total et la liste des commits
    res.json({
      concept: concept.name, // le nom du concept pour contexte
      totalCommits: commits.length, // combien de commits sont lies
      commits  // la liste complete des commits
    })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte les 6 fonctions pour que le fichier de routes puisse les utiliser
module.exports = { createConcept, getConcepts, getConceptById, deleteConcept, getCommitsByConcept, updateConcept }