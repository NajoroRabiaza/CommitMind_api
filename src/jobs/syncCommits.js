const cron = require('node-cron')
const prisma = require('../utils/prisma')
const { getRepositoryCommits } = require('../services/githubService')

const syncAllUsersCommits = async () => {
  console.log(`[CRON] Starting sync - ${new Date().toISOString()}`)

  try {
    const users = await prisma.user.findMany()
    console.log(`[CRON] Found ${users.length} users to sync`)

    for (const user of users) {
      console.log(`[CRON] Syncing user: ${user.username}`)

      const repositories = await prisma.repository.findMany({
        where: { userId: user.id }
      })

      for (const repository of repositories) {
        try {
          const [owner, repo] = repository.fullName.split('/')

          const commits = await getRepositoryCommits(
            user.accessToken,
            owner,
            repo,
            repository.lastSyncedAt
          )

          let newCommitsCount = 0

          for (const commit of commits) {
            const existing = await prisma.commit.findUnique({
              where: { sha: commit.sha }
            })

            if (!existing) {
              await prisma.commit.create({
                data: {
                  sha: commit.sha,
                  message: commit.message,
                  authorName: commit.authorName,
                  authorEmail: commit.authorEmail,
                  committedAt: commit.committedAt,
                  url: commit.url,
                  repositoryId: repository.id
                }
              })
              newCommitsCount++
            }
          }

          await prisma.repository.update({
            where: { id: repository.id },
            data: { lastSyncedAt: new Date() }
          })

          console.log(`[CRON] ${repository.fullName} → ${newCommitsCount} new commits`)
        } catch (repoError) {
          console.error(`[CRON] Error syncing ${repository.fullName}: ${repoError.message}`)
        }
      }
    }

    console.log(`[CRON] Sync completed - ${new Date().toISOString()}`)
  } catch (error) {
    console.error(`[CRON] Fatal error: ${error.message}`)
  }
}

const startSyncJob = () => {
  cron.schedule('0 * * * *', syncAllUsersCommits)
  console.log('[CRON] Sync job scheduled - runs every hour')
}

module.exports = { startSyncJob, syncAllUsersCommits }