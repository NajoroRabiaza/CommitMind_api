// routes liees aux depots github de l'utilisateur
//  avant de voir des commits, l'utilisateur doit
//  d'abord synchroniser ses depots
//
// liste des routes definies ici :
//   POST /repositories/sync = importe les depots depuis github
//   GET  /repositories = liste les depots deja synchronises

const express = require('express')

// middleware jwt pour proteger les deux routes
const jwtAuth = require('../middleware/jwtAuth')

// les deux fonctions du controller de depots
const { syncRepositories, getRepositories } = require('../controllers/repositoryController')

const router = express.Router()

// POST /repositories/sync appelle l'api github pour recuperer la liste des
//  depots de l'utilisateur connecte et les sauvegarder
//  en base (ou les mettre a jour s'ils existent deja)
//  c'est la premiere action a faire apres la connexion
//  ex: POST /repositories/sync
//   body: vide, on utilise req.user.accessToken
router.post('/repositories/sync', jwtAuth, syncRepositories)

// GET /repositories liste les depots deja synchronises de l'utilisateur
//  supporte ?page= et ?limit= pour la pagination
//  trie par date de derniere mise a jour (les plus recents en premier)
//   ex: GET /repositories?page=1&limit=20
router.get('/repositories', jwtAuth, getRepositories)

// on exporte le routeur pour que app.js puisse le brancher
module.exports = router