const prisma = require('../utils/prisma')
const { getUserRepositories } = require('../services/githubService')
const { getPagination, paginatedResponse } = require('../utils/pagination')

const syncRepositories = async (req, res) => {
  try {
    const repos = await getUserRepositories(req.user.accessToken)
    const savedRepos = []

    for (const repo of repos) {
      const saved = await prisma.repository.upsert({
        where: { githubId: repo.githubId },
        update: {
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private
        },
        create: {
          githubId: repo.githubId,
          name: repo.name,
          fullName: repo.fullName,
          description: repo.description,
          private: repo.private,
          userId: req.user.id
        }
      })
      savedRepos.push(saved)
    }

    res.json({
      message: `${savedRepos.length} repositories synced`,
      repositories: savedRepos
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const getRepositories = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query)

    const total = await prisma.repository.count({
      where: { userId: req.user.id }
    })

    const repos = await prisma.repository.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit
    })

    res.json(paginatedResponse(repos, total, page, limit))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

module.exports = { syncRepositories, getRepositories }