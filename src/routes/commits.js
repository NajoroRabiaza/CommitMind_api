// toutes les routes liees aux commits et aux fichiers
//  toutes ces routes sont protegees par jwtAuth
//  il faut donc envoyer le token dans chaque requete
//
// liste des routes definies ici :
//  POST /repositories/:repoId/commits/sync
//  - synchronise les commits d'un depot depuis github
//
//  GET  /repositories/:repoId/commits
//  - liste les commits d'un depot (avec pagination et recherche)
//
//  POST /repositories/:repoId/commits/:commitId/files/sync
//  - synchronise les fichiers modifies d'un commit specifique
//
//  GET  /repositories/:repoId/commits/:commitId/files
//  - liste les fichiers modifies d'un commit
//
//  POST /repositories/:repoId/commits/:commitId/concepts
//  - lie un concept a un commit

const express = require('express')

// middleware de verification du token jwt
// toutes les routes ici en ont besoin
const jwtAuth = require('../middleware/jwtAuth')

// on importe validate et le schema pour lier un concept a un commit
// validate(linkConceptSchema) sera utilise comme middleware
// pour valider req.body avant d'arriver dans le controller
const { validate, linkConceptSchema } = require('../middleware/validate')

// on importe les 4 fonctions du controller de commits
// chacune gere la logique d'une route specifique
const {
  syncCommits, // synchronise les commits depuis github
  getCommits, // liste les commits d'un depot
  syncCommitFiles, // synchronise les fichiers d'un commit
  getCommitFiles // liste les fichiers d'un commit
} = require('../controllers/commitController')

// linkConceptToCommit vient d'un controller separé
// car la liaison commit/concept est une responsabilite distincte
const { linkConceptToCommit, autoDetectConcepts, unlinkConceptFromCommit } = require('../controllers/commitConceptController')

const router = express.Router()

// POST /repositories/:repoId/commits/sync
// ça declenche la synchronisation des commits d'un depot
//  appelle l'api github et sauvegarde les commits en base
// :repoId est un parametre dynamique dans l'url
//   ex: POST /repositories/42/commits/sync
//   dans le controller on recupere req.params.repoId
router.post('/repositories/:repoId/commits/sync', jwtAuth, syncCommits)

// GET /repositories/:repoId/commits
// recupere la liste paginee des commits d'un depot
// supporte ?page=, ?limit= et ?search= en query params
// ex: GET /repositories/42/commits?page=2&limit=10&search=fix
router.get('/repositories/:repoId/commits', jwtAuth, getCommits)

// POST /repositories/:repoId/commits/:commitId/files/sync
//  recupere depuis github les fichiers modifies
//  dans un commit precis et les sauvegarde en base
//  ex: POST /repositories/42/commits/7/files/sync
router.post('/repositories/:repoId/commits/:commitId/files/sync', jwtAuth, syncCommitFiles)

// GET /repositories/:repoId/commits/:commitId/files
// liste les fichiers deja synchronises pour un commit
//  ex: GET /repositories/42/commits/7/files
router.get('/repositories/:repoId/commits/:commitId/files', jwtAuth, getCommitFiles)

// POST /repositories/:repoId/commits/:commitId/concepts
// crée un lien entre un commit et un concept existant
//  le body doit contenir { conceptId: 3 }
//  validate(linkConceptSchema) verifie le body avant
//  que linkConceptToCommit ne soit appele
//   ex: POST /repositories/42/commits/7/concepts
//    body: { "conceptId": 3 }
router.post('/repositories/:repoId/commits/:commitId/concepts', jwtAuth, validate(linkConceptSchema), linkConceptToCommit)

router.post('/repositories/:repoId/commits/:commitId/concepts/auto', jwtAuth, autoDetectConcepts)

router.delete('/repositories/:repoId/commits/:commitId/concepts/:conceptId', jwtAuth, unlinkConceptFromCommit)

// on exporte le routeur pour que app.js puisse le brancher
module.exports = router