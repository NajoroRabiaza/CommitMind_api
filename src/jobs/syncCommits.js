const cron = require('node-cron')
const prisma = require('../utils/prisma')
const { getRepositoryCommits } = require('../services/githubService')

const syncAllUsersCommits = async () => {
  console.log(`[cron] starting sync - ${new Date().toISOString()}`)

  try {
    const users = await prisma.user.findMany()
    console.log(`[cron] found ${users.length} users to sync`)

    for (const user of users) {
      console.log(`[cron] syncing user: ${user.username}`)

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
            // upsert remplace le pattern findUnique + create conditionnel.
            // Cela élimine une requête SQL par commit et gère proprement
            // les doublons sans condition explicite dans le code applicatif.
            const result = await prisma.commit.upsert({
              where: { sha: commit.sha },
              update: {},
              create: {
                sha: commit.sha,
                message: commit.message,
                authorName: commit.authorName,
                authorEmail: commit.authorEmail,
                committedAt: commit.committedAt,
                url: commit.url,
                repositoryId: repository.id
              }
            })

            // Prisma ne distingue pas nativement un create d'un update dans
            // un upsert. On compare createdAt et updatedAt pour savoir si
            // l'enregistrement vient d'être créé ou s'il existait déjà.
            if (result.createdAt.getTime() === result.updatedAt.getTime()) {
              newCommitsCount++
            }
          }

          await prisma.repository.update({
            where: { id: repository.id },
            data: { lastSyncedAt: new Date() }
          })

          console.log(`[cron] ${repository.fullName} = ${newCommitsCount} new commits`)

        } catch (repoError) {
          console.error(`[cron] error syncing ${repository.fullName}: ${repoError.message}`)
        }
      }
    }

    console.log(`[cron] sync completed - ${new Date().toISOString()}`)

  } catch (error) {
    console.error(`[cron] fatal error: ${error.message}`)
  }
}

const startSyncJob = () => {
  cron.schedule('0 * * * *', syncAllUsersCommits)
  console.log('[cron] sync job scheduled - runs every hour')
}

module.exports = { startSyncJob, syncAllUsersCommits }