// ici c'est le  route de verification que l'api est bien en ligne
// c'est une route publique (pas de jwt necessaire)
// tres simple : elle repond toujours "ok" si le serveur tourne
//
// a quoi ca sert dans la vraie vie ?
//   les services de monitoring (uptime robot, etc.) et les
//   plateformes d'hebergement (railway, render, etc.) appellent
//   regulierement /health pour savoir si l'app repond encore
//   si cette route ne repond pas, ils alertent qu'il y a un probleme
//
// liste des routes definies ici :
//   GET /health → verifie que l'api est operationnelle

const express = require('express')
const router = express.Router()

// GET /health
// renvoyer un statut 200 avec un message de confirmation
//  route publique, aucune authentification requise
//  utile pour le monitoring et les health checks automatiques
// exemple: GET /health
//  reponse : { "status": "ok", "message": "CommitMind API is running" }
router.get('/health', (req, res) => {
  // 200 est le code http standard pour "tout va bien"
  // on renvoie un objet json simple avec le statut
  res.status(200).json({
    status: 'ok',
    message: 'commitmind api is running'
  })
})

// on exporte le routeur pour que app.js puisse le brancher
module.exports = router