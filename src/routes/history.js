// route de l'historique global des commits
//  regroupe tous les commits de tous les depots
//  de l'utilisateur et les organise par mois
//  c'est la vue "journal de bord" de l'application
//
// liste des routes definies ici :
//  GET /history = historique filtre et groupe par mois
//
// query params disponibles :
//   ?search=fix = filtre par mot dans le message du commit
//   ?month=2026-03 = filtre par mois (format YYYY-MM)
//   ?concept=authentification = filtre par nom de concept lie

const express = require('express')

// middleware jwt pour proteger la route
const jwtAuth = require('../middleware/jwtAuth')

// le controller qui construit l'historique groupe par mois
const { getHistory } = require('../controllers/historyController')

const router = express.Router()

// GET /history recupere l'historique complet des commits de l'utilisateur
// groupe par mois, avec des filtres optionnels
// exemple de GET /history
//  GET /history?month=2026-03
//  GET /history?search=fix&concept=jwt
router.get('/history', jwtAuth, getHistory)

// on exporte le routeur pour que app.js puisse le brancher
module.exports = router