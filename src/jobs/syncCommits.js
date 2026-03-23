const cron = require('node-cron')

const startSyncJob = () => {
  // S'exécute toutes les heures
  cron.schedule('0 * * * *', () => {
    console.log(`[CRON] Running commit sync job - ${new Date().toISOString()}`)
  })

  console.log('[CRON] Sync job scheduled - runs every hour')
}

module.exports = { startSyncJob }