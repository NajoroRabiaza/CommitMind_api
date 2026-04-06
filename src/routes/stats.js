// route des statistiques globales de l'utilisateur
//  renvoie un tableau de bord chiffre :
//  nombre de commits, depots, concepts,
//  commits par mois, top concepts, top depots
//
// liste des routes definies ici :
//  GET /stats = tableau de bord statistique complet

const express = require('express')

// middleware jwt pour proteger la route
const jwtAuth = require('../middleware/jwtAuth')

// le controller qui calcule et assemble toutes les statistiques
const { getStats } = require('../controllers/statsController')

const router = express.Router()

// GET /stats renvoie un objet avec toutes les statistiques
// de l'utilisateur connecte en une seule requete
// utile pour afficher un tableau de bord
//  ex: GET /stats
//  reponse :
//    {
//      overview: { totalCommits, totalRepositories, totalConcepts },
//      commitsByMonth: [...],
//      topConcepts: [...],
//      topRepositories: [...]
//    }
router.get('/stats', jwtAuth, getStats)

// on exporte pour que app.js le branche
module.exports = router