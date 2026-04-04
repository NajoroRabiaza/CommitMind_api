// c'est ici le point d'entree de l'application
// c'est le premier fichier qui s'execute quand on
// lance "node src/server.js" ou "npm run dev"

// dotenv permet de lire le fichier .env et de mettre toutes
// les variables dedans dans process.env
// exemple : process.env.PORT, process.env.JWT_SECRET, etc.
// on appelle .config() tout de suite, avant tout le reste,
// pour que les autres fichiers puissent acceder aux variables
require('dotenv').config();

// on importe l'application express qu'on a configuree dans app.js
// "app" c'est l'objet qui contient toutes nos routes et middlewares
const app = require('./app');

// on importe la fonction qui demarre la tache automatique
// cette tache tourne en arriere-plan pour synchroniser les commits
const { startSyncJob } = require('./jobs/syncCommits')

// on definit le port sur lequel le serveur va ecouter
// si la variable PORT existe dans .env on l'utilise,
// sinon on utilise 3000 par defaut (utile en developpement local)
const PORT = process.env.PORT || 3000;

// app.listen() demarre vraiment le serveur
// il commence a ecouter les requetes http sur le port choisi
// la fonction de callback (les lignes entre {}) s'execute
// une seule fois, quand le serveur est pret
app.listen(PORT, () => {
    // on affiche un message pour confirmer que le serveur tourne
    console.log(`server running on port ${PORT}`)

    // on demarre la tache cron qui tourne toutes les heures
    // pour synchroniser les commits de tous les utilisateurs
    // on la lance ici et pas dans app.js car c'est une tache
    // liee au cycle de vie du serveur, pas a la configuration http
    startSyncJob()
})