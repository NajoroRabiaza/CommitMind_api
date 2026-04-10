// logique metier pour tout ce qui concerne les commits,
// les fichiers modifies dans ces commits et l'extraction de concepts
//
// ce controller gere 4 operations :
//   syncCommits = importer les commits depuis github
//   getCommits  = lister les commits d'un depot (pagine)
//   syncCommitFiles = importer les fichiers d'un commit depuis github ET detecter les concepts
//   getCommitFiles = lister les fichiers d'un commit deja synchronise
//
// principe de securite appliqué partout dans ce fichier :
//   avant chaque operation, on verifie que le depot demande
//   appartient bien a l'utilisateur connecte
//   et que le commit appartient bien a ce depot
//   ca evite qu'un utilisateur accede aux donnees d'un autre

// client prisma pour toutes les requetes en base de donnees
const prisma = require('../utils/prisma')

// on importe les deux fonctions du service github dont on a besoin :
//   getRepositoryCommits : liste les commits d'un depot
//   getCommitDetail : recupere les fichiers d'un commit precis
const { getRepositoryCommits, getCommitDetail } = require('../services/githubService')

// fonctions utilitaires de pagination
const { getPagination, paginatedResponse } = require('../utils/pagination')

// fonction : syncCommits
//  POST /repositories/:repoId/commits/sync
//   recuperer tous les commits d'un depot depuis github
//   et les sauvegarder (ou mettre a jour) dans notre base
//   c'est une synchronisation manuelle declenchee par l'user
const syncCommits = async (req, res) => {
  try {
    // on recupere l'id du depot depuis l'url
    // ex: /repositories/42/commits/sync = repoId = "42"
    const { repoId } = req.params

    // verification de securite : le depot appartient-il a l'user ?
    // on cherche un depot qui correspond a l'id ET qui appartient
    // a l'utilisateur connecte
    // si le depot existe mais appartient a quelqu'un d'autre,
    // findFirst retourne null et on renvoie 404 (comme si ca n'existait pas)
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId), // parseInt car repoId est un string
        userId: req.user.id // securite : seulement ses propres depots
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    // on decoupe le fullName pour obtenir owner et repo separement
    // repository.fullName ressemble a "john/commitmind"
    // split('/') donne ["john", "commitmind"]
    // la destructuration assigne le premier a "owner" et le second a "repo"
    const [owner, repo] = repository.fullName.split('/')

    // on appelle le service github pour recuperer les commits
    // on ne passe pas de date "since" ici (synchronisation complete)
    // donc github renvoie tous les commits (jusqu'a 100)
    const commits = await getRepositoryCommits(
      req.user.accessToken, // le token oauth de l'utilisateur
      owner,  // ex: "john"
      repo   // ex: "commitmind"
    )

    // tableau pour collecter tous les commits sauvegardes
    const savedCommits = []

    // on traite chaque commit recupere depuis github
    for (const commit of commits) {
      // on utilise upsert pour gerer proprement les deux cas :
      //  le commit existe deja = on met a jour ses infos
      //  c'est un nouveau commit = on le cree
      // on identifie le commit par son sha (unique dans git)
      const saved = await prisma.commit.upsert({
        where: { sha: commit.sha },

        // si le commit existe deja en base, on rafraichit ses donnees
        update: {
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          url: commit.url
        },

        // si c'est un nouveau commit, on le cree avec toutes ses donnees
        // on ajoute repositoryId pour lier ce commit a son depot
        create: {
          sha: commit.sha,
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          url: commit.url,
          repositoryId: repository.id // lien vers le depot parent
        }
      })
      savedCommits.push(saved)
    }

    // on met a jour la date de derniere synchronisation du depot
    await prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() }  // date et heure actuelles
    })

    // on renvoie le nombre de commits traites et leur liste
    res.json({
      message: `${savedCommits.length} commits synced`,
      commits: savedCommits
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : getCommits
//  GET /repositories/:repoId/commits
//   lister les commits d'un depot avec pagination
//   et possibilite de rechercher par mot cle
//   supporte ?page=, ?limit=, ?search=
const getCommits = async (req, res) => {
  try {
    const { repoId } = req.params

    // on calcule les parametres de pagination
    // getPagination lit ?page= et ?limit= et calcule skip
    const { page, limit, skip } = getPagination(req.query)

    // on recupere le terme de recherche ou une chaine vide
    const search = req.query.search || ''

    // verification de securite
    // meme verification que dans syncCommits
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    // construction du filtre dynamique
    // base : tous les commits de ce depot
    const where = {
      repositoryId: repository.id,

      // spread conditionnel : on n'ajoute le filtre message
      // que si search est fourni et non vide
      ...(search && {
        message: {
          contains: search  // LIKE '%search%' en sql
        }
      })
    }

    // on compte le total pour la pagination
    const total = await prisma.commit.count({ where })

    // on recupere les commits de la page demandee
    // tries du plus recent au plus ancien
    const commits = await prisma.commit.findMany({
      where,
      orderBy: { committedAt: 'desc' },
      skip,  // sauter les commits des pages precedentes
      take: limit  // limiter le nombre de resultats
    })

    // on renvoie les resultats avec les metadonnees de pagination
    res.json(paginatedResponse(commits, total, page, limit))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// fonction : syncCommitFiles
//  POST /repositories/:repoId/commits/:commitId/files/sync
//   recuperer depuis github la liste des fichiers modifies
//   dans un commit specifique, les sauvegarder, ET 
//   détecter les concepts clés liés à ce commit.
const syncCommitFiles = async (req, res) => {
  try {
    const { repoId, commitId } = req.params
    // import specifique du service de detection de concepts
    const { detectConceptsFromCommit } = require('../services/conceptDetectionService')

    // verification 1 : le depot appartient-il a l'user ?
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    // verification 2 : le commit appartient-il a ce depot ?
    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id  // securite : commit de ce depot
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'Commit not found' })
    }

    // on decoupe le fullName pour l'appel github
    const [owner, repo] = repository.fullName.split('/')

    // on appelle github pour recuperer les details du commit
    // getCommitDetail retourne un tableau de fichiers modifies
    const files = await getCommitDetail(
      req.user.accessToken,  // token de l'utilisateur pour s'authentifier
      owner,  // proprietaire du depot
      repo,   // nom du depot
      commit.sha   // le sha identifie le commit de facon unique
    )

    // tableau pour collecter les fichiers sauvegardes
    const savedFiles = []

    // on sauvegarde chaque fichier en base
    for (const file of files) {
      const saved = await prisma.commitFile.create({
        data: {
          filename: file.filename, // chemin du fichier (ex: "src/app.js")
          status: file.status, // "added", "modified", "deleted", etc.
          additions: file.additions, // nombre de lignes ajoutees
          deletions: file.deletions, // nombre de lignes supprimees
          patch: file.patch, // le diff complet (peut etre null)
          commitId: commit.id  // lien vers le commit parent
        }
      })
      savedFiles.push(saved)
    }

    // Détection automatique des concepts
    // On analyse le message du commit et les fichiers pour extraire
    // les mots-clés ou technologies concernées par ce commit
    const detectedConceptNames = detectConceptsFromCommit(commit.message, files)
    const linkedConcepts = []

    for (const conceptName of detectedConceptNames) {
      // Créer le concept s'il n'existe pas encore
      // on utilise upsert pour gerer la creation ou eviter les doublons
      const concept = await prisma.concept.upsert({
        where: {
          // On utilise la combinaison name + userId comme identifiant unique
          // pour s'assurer qu'un utilisateur n'a pas deux fois le meme concept
          name_userId: {
            name: conceptName,
            userId: req.user.id
          }
        },
        update: {}, // si le concept existe deja, on ne modifie rien
        create: {
          name: conceptName,
          userId: req.user.id
        }
      })

      // Lier le concept au commit
      // on utilise egalement upsert sur la table de liaison (many-to-many)
      await prisma.commitConcept.upsert({
        where: {
          // l'identifiant unique de la liaison est la paire commitId / conceptId
          commitId_conceptId: {
            commitId: commit.id,
            conceptId: concept.id
          }
        },
        update: {}, // si la liaison existe deja, on ne fait rien
        create: {
          commitId: commit.id,
          conceptId: concept.id
        }
      })

      // on garde une trace des concepts trouves pour la reponse de l'API
      linkedConcepts.push(conceptName)
    }

    // on renvoie le bilan : les fichiers synchronises et les concepts detectes
    res.json({
      message: `${savedFiles.length} files synced`,
      files: savedFiles,
      detectedConcepts: linkedConcepts
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
  
// fonction : getCommitFiles
//  GET /repositories/:repoId/commits/:commitId/files
//  lister les fichiers deja synchronises pour un commit
//  cette route lit uniquement notre base de donnees
//  elle ne fait pas d'appel a github
const getCommitFiles = async (req, res) => {
  try {
    const { repoId, commitId } = req.params

    // verification 1 : securite sur le depot
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    // verification 2 : securite sur le commit
    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'Commit not found' })
    }

    // on recupere tous les fichiers associes a ce commit
    const files = await prisma.commitFile.findMany({
      where: { commitId: commit.id }
    })

    // on renvoie directement le tableau de fichiers
    res.json({ files })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte les 4 fonctions pour que le fichier de routes puisse les utiliser
module.exports = { syncCommits, getCommits, syncCommitFiles, getCommitFiles }