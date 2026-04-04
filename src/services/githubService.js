// toutes les communications avec l'api github
// ce fichier centralise les appels reseau vers github
// les controllers n'appellent jamais github directement,
// ils passent toujours par les fonctions de ce fichier
//
// pourquoi separer ca dans un fichier "service" ?
// ca permet de changer de librairie github (octokit) plus tard
// sans avoir a modifier les controllers
// et ca rend le code plus facile a tester et a comprendre

// octokit est la librairie officielle de github pour node.js
// elle transforme les appels a l'api github en fonctions js simples
// au lieu de faire fetch("https://api.github.com/...") a la main,
// on peut faire octokit.repos.listCommits({...})
const { Octokit } = require('@octokit/rest')

// avec la fonction createGithubClient :
// - d'abord on creer un client octokit authentifie
// on appelle cette fonction au debut de chaque
// fonction de ce fichier pour creer un client
// configure avec le bon token
// - ensuite : accessToken → le token oauth de l'utilisateur
// recupere depuis la base de donnees via req.user
// - enfin : une instance octokit prete a faire des requetes
const createGithubClient = (accessToken) => {
  // new Octokit({ auth: token }) cree le client avec authentification
  // sans auth, les requetes seraient anonymes et tres limitees
  // avec auth, on a acces aux repos prives et un quota plus eleve
  return new Octokit({
    auth: accessToken
  })
}

// fonction : getUserRepositories
// - d'abord : recuperer tous les depots github de l'utilisateur
// appele quand on fait POST /repositories/sync
// - puis : accessToken → le token de l'utilisateur connecte
// - enfin : un tableau de depots reformates pour notre base
// -----------------------------------------------------------
const getUserRepositories = async (accessToken) => {
  // on cree le client octokit avec le token de cet utilisateur
  // chaque utilisateur a son propre token donc son propre client
  const octokit = createGithubClient(accessToken)

  // octokit.repos.listForAuthenticatedUser() appelle l'api github
  // pour recuperer les depots de l'utilisateur connecte
  // on destructure directement { data } depuis la reponse
  // car octokit retourne { data, headers, status, ... }
  // et on n'a besoin que de data
  const { data } = await octokit.repos.listForAuthenticatedUser({
    // on trie par date de derniere modification
    // pour avoir les depots les plus recents en premier
    sort: 'updated',
    // on recupere jusqu'a 100 depots par page
    // (la limite maximale de l'api github)
    per_page: 100
  })

  // github nous renvoie beaucoup d'infos par depot (50+ champs)
  // on ne garde que ce dont on a besoin avec .map()
  // ca allege notre base de donnees et clarifie ce qu'on stocke
  return data.map((repo) => ({
    githubId: repo.id, // identifiant numerique github
    name: repo.name,                // nom court (ex: "commitmind")
    fullName: repo.full_name,       // nom complet (ex: "john/commitmind")
    description: repo.description,  // description du depot
    private: repo.private           // true si le depot est prive
  }))
}

// fonction : getRepositoryCommits
// recuperer les commits d'un depot github specifique
// appele lors de la synchronisation manuelle et
// aussi par la tache cron automatique
// arguments :
// accessToken = le token oauth de l'utilisateur
// owner = le proprietaire du depot (ex: "john")
// repo = le nom du depot (ex: "commitmind")
// since = date optionnelle pour ne recuperer que
// les commits plus recents que cette date
// null = on recupere tout depuis le debut
// retourne : un tableau de commits reformates

const getRepositoryCommits = async (accessToken, owner, repo, since = null) => {
  const octokit = createGithubClient(accessToken)

  // on construit l'objet de parametres progressivement
  // pour pouvoir ajouter "since" de facon conditionnelle
  const params = {
    owner: owner,  // proprietaire du depot
    repo: repo,    // nom du depot
    per_page: 100  // jusqu'a 100 commits par page
  }

  // si une date "since" est fournie, on l'ajoute aux parametres
  // ca permet de ne recuperer que les nouveaux commits
  // et d'eviter de re-synchro des commits qu'on a deja
  // .toISOString() convertit la date en format "2026-03-01T00:00:00.000Z"
  // c'est le format que l'api github attend pour le parametre "since"
  if (since) {
    params.since = since.toISOString()
  }

  // on appelle l'api github pour lister les commits du depot
  const { data } = await octokit.repos.listCommits(params)

  // on reformate chaque commit pour ne garder que nos champs
  // la structure de l'api github est imbrique (commit.commit.author.name)
  // on l'aplatit pour nos besoins
  return data.map((commit) => ({
    sha: commit.sha, // identifiant unique du commit
    message: commit.commit.message, // message du commit
    authorName: commit.commit.author.name,  // nom de l'auteur
    authorEmail: commit.commit.author.email, // email de l'auteur
    committedAt: new Date(commit.commit.author.date), // date convertie en objet Date js
    url: commit.html_url // lien vers la page github
  }))
}

// fonction : getCommitDetail
// recuperer la liste des fichiers modifies
// dans un commit specifique
// appele quand on fait POST /commits/:id/files/sync
// arguments :
// accessToken = le token oauth de l'utilisateur
// owner = le proprietaire du depot
// repo = le nom du depot
// sha = l'identifiant unique du commit (ex: "a3f8c2d")
// retourne : un tableau de fichiers modifies avec leurs stats

const getCommitDetail = async (accessToken, owner, repo, sha) => {
  const octokit = createGithubClient(accessToken)

  // octokit.repos.getCommit() recupere le detail d'un seul commit
  // "ref" peut etre un sha, un nom de branche ou un tag
  // ici on utilise le sha qui est l'identifiant le plus precis
  const { data } = await octokit.repos.getCommit({
    owner: owner,
    repo: repo,
    ref: sha
  })

  // data.files est le tableau des fichiers touches dans ce commit
  // on reformate chaque fichier pour ne garder que ce qu'on stocke
  return data.files.map((file) => ({
    filename: file.filename, // chemin du fichier (ex: "src/app.js")
    status: file.status, // "added", "modified", "deleted", "renamed"
    additions: file.additions, // nombre de lignes ajoutees
    deletions: file.deletions, // nombre de lignes supprimees
    // file.patch contient le diff complet (les +/- de chaque ligne)
    // pour les fichiers binaires ou tres gros, patch n'existe pas
    // on utilise || null pour etre explicite plutot que undefined
    patch: file.patch || null
  }))
}

// on exporte les 4 fonctions
// createGithubClient est exporte au cas ou on en aurait besoin
// ailleurs mais elle est surtout utilisee en interne ici
module.exports = {
  createGithubClient,
  getUserRepositories,
  getRepositoryCommits,
  getCommitDetail
}