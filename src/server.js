/**
 * Point d'entree de l'application.
 *
 * Charge les variables d'environnement, demarre le serveur HTTP
 * et lance la tache cron de synchronisation automatique des commits.
 */

require('dotenv').config()

const app = require('./app')
const { startSyncJob } = require('./jobs/syncCommits')

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
  // La tache cron est demarree ici et non dans app.js car elle est
  // liee au cycle de vie du serveur, pas a la configuration HTTP
  startSyncJob()
})