// logique metier pour les depots github
//  ce controller gere deux actions :
//  1. synchroniser les depots depuis github vers notre base
//  2. lister les depots deja synchronises
//
//   dans une architecture mvc (model-view-controller),
//   le controller est la partie qui recoit la requete,
//   fait les operations necessaires (appels api, base de donnees),
//   et renvoie la reponse au client
//   les routes branchent les urls sur les controllers
//   les controllers utilisent les services et prisma pour travailler

// client prisma pour acceder a la base de donnees
const prisma = require('../utils/prisma')

// fonction du service github pour recuperer les depots de l'utilisateur
// on n'appelle jamais l'api github directement depuis un controller,
// on passe toujours par le service pour garder le code organise
const { getUserRepositories } = require('../services/githubService')

// fonctions utilitaires pour calculer et formater la pagination
const { getPagination, paginatedResponse } = require('../utils/pagination')

// fonction : syncRepositories
// route : POST /repositories/sync
//  recuperer tous les depots de l'utilisateur depuis
//  github et les sauvegarder dans notre base de donnees
//  si un depot existe deja, on met a jour ses infos
//  si c'est un nouveau depot, on le cree
const syncRepositories = async (req, res) => {
  try {
    // on appelle le service github avec le token de l'utilisateur connecte
    // req.user est disponible car jwtAuth a deja verifie le token
    // et attache l'utilisateur complet a la requete
    // getUserRepositories retourne un tableau de depots reformates
    const repos = await getUserRepositories(req.user.accessToken)

    // on va stocker ici tous les depots sauvegardes ou mis a jour
    // pour les inclure dans la reponse finale
    const savedRepos = []

    // on boucle sur chaque depot retourne par github
    // pour le traiter un par un et le sauvegarder en base
    for (const repo of repos) {

      // upsert = update + insert combine en une seule operation
      // prisma cherche d'abord si un depot avec ce githubId existe :
      //  - s'il existe = il execute le bloc "update"
      //  - s'il n'existe pas = il execute le bloc "create"
      // c'est plus efficace et propre qu'un if/else manuel
      const saved = await prisma.repository.upsert({
        // on cherche par githubId car c'est l'identifiant unique
        // cote github (et il est marque @unique dans schema.prisma)
        where: { githubId: repo.githubId },

        // si le depot existe deja, on rafraichit ses donnees
        // le nom, fullName ou la description peuvent avoir change
        // on ne touche pas a userId car il ne change jamais
        update: {
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private
        },

        // si c'est un nouveau depot, on le cree avec toutes ses infos
        // on ajoute userId pour le lier a l'utilisateur connecte
        // c'est important : sans ca, le depot n'appartient a personne
        create: {
          githubId: repo.githubId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private,
          userId: req.user.id   // lie ce depot a l'utilisateur connecte
        }
      })

      // on ajoute le depot sauvegarde dans notre tableau de resultats
      savedRepos.push(saved)
    }

    // on renvoie un message de confirmation avec le compte et la liste
    // le template literal `${...}` insere dynamiquement le nombre
    res.json({
      message: `${savedRepos.length} repositories synced`,
      repositories: savedRepos
    })

  } catch (error) {
    // 500 = erreur interne du serveur
    // on renvoie le message d'erreur pour aider au debogage
    // en production on eviterait d'exposer les messages d'erreur bruts
    res.status(500).json({ message: error.message })
  }
}

// fonction : getRepositories
// route : GET /repositories
//  recuperer la liste paginee des depots de l'utilisateur
//  trie du plus recemment modifie au plus ancien
//  supporte ?page= et ?limit= en query params
const getRepositories = async (req, res) => {
  try {
    // on extrait les parametres de pagination depuis l'url
    // ex: /repositories?page=2&limit=10
    // getPagination securise et calcule page, limit, et skip
    const { page, limit, skip } = getPagination(req.query)

    // on compte d'abord le nombre total de depots de cet utilisateur
    // on en a besoin pour calculer le nombre total de pages
    // c'est une requete COUNT en sql, tres rapide
    const total = await prisma.repository.count({
      where: { userId: req.user.id }
    })

    // on recupere uniquement les depots de la page demandee
    // "where" filtre pour ne prendre que les depots de cet utilisateur
    // "orderBy" trie par updatedAt descendant (les plus recents en premier)
    // "skip" saute les enregistrements des pages precedentes
    // "take" limite le nombre de resultats retournes
    const repos = await prisma.repository.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      skip, // calculé par getPagination : (page-1) * limit
      take: limit  // nombre de resultats par page
    })

    // paginatedResponse construit un objet standard avec :
    //  data : les depots de cette page
    //  pagination : total, page, limit, totalPages, hasNextPage, etc.
    res.json(paginatedResponse(repos, total, page, limit))

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// on exporte les deux fonctions pour que le fichier de routes puisse
// les brancher sur les urls correspondantes
module.exports = { syncRepositories, getRepositories }