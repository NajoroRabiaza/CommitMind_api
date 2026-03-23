const prisma = require('../utils/prisma')
const { getRepositoryCommits } = require('../services/githubService')

const syncCommits = async (req, res) => {
  try {
    const { repoId } = req.params

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    const [owner, repo] = repository.fullName.split('/')

    const commits = await getRepositoryCommits(
      req.user.accessToken,
      owner,
      repo
    )

    const savedCommits = []

    for (const commit of commits) {
      const saved = await prisma.commit.upsert({
        where: { sha: commit.sha },
        update: {
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          url: commit.url
        },
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
      savedCommits.push(saved)
    }

    await prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() }
    })

    res.json({
      message: `${savedCommits.length} commits synced`,
      commits: savedCommits
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getCommits = async (req, res) => {
  try {
    const { repoId } = req.params

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    const commits = await prisma.commit.findMany({
      where: { repositoryId: repository.id },
      orderBy: { committedAt: 'desc' }
    })

    res.json({ commits })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { syncCommits, getCommits }