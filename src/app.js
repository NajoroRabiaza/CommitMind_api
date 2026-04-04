// c'est ici que se fait la configuration centrale de l'application express
// on cree l'app, on branche les middlewares globaux,
// et on enregistre toutes les routes disponibles
// ce fichier ne demarre pas le serveur, il le prepare
// c'est server.js qui appelle app.listen()

// express est le framework principal de notre api
// il gere la reception des requetes http et l'envoi des reponses
const express = require('express')

// on importe passport depuis notre propre fichier de config
// passport s'occupe de la connexion via github (oauth)
const passport = require('./middleware/passport')

// on importe chaque "routeur" par fonctionnalite
// chaque routeur regroupe les urls d'un domaine precis
// ca evite d'avoir toutes les routes dans un seul gros fichier

// route de sante : GET /health → verifie que l'api tourne
const healthRouter = require('./routes/health')

// routes d'authentification : /auth/github, /auth/me, etc.
const authRouter = require('./routes/auth')

// routes des depots github : /repositories
const repositoriesRouter = require('./routes/repositories')

// routes des commits : /repositories/:id/commits
const commitsRouter = require('./routes/commits')

// routes des concepts (tags d'apprentissage) : /concepts
const conceptsRouter = require('./routes/concepts')

// route d'historique filtre par mois/concept : /history
const historyRouter = require('./routes/history')

// route des statistiques globales : /stats
const statsRouter = require('./routes/stats')


// on cree l'instance principale de l'application express
const app = express()

// --- middlewares globaux ---
// un middleware est une fonction qui s'execute sur toutes
// les requetes avant d'arriver au bon controller

// express.json() permet de lire le corps des requetes en json
// sans ca, req.body serait undefined quand le client envoie du json
app.use(express.json())

// passport.initialize() prepare passport pour chaque requete
// il doit etre enregistre avant les routes qui utilisent passport
app.use(passport.initialize())

// --- enregistrement des routes ---
// app.use(router) branche le routeur sur l'application
// express va tester chaque routeur dans l'ordre jusqu'a trouver
// une route qui correspond a l'url demandee

app.use(healthRouter)         // /health
app.use(authRouter)           // /auth/*
app.use(repositoriesRouter)   // /repositories/*
app.use(commitsRouter)        // /repositories/:id/commits/*
app.use(conceptsRouter)       // /concepts/*
app.use(historyRouter)        // /history
app.use(statsRouter)          // /stats


// on exporte l'app pour que server.js puisse l'utiliser
// et appeler app.listen() dessus
module.exports = app