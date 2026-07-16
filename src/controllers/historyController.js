const prisma = require('../utils/prisma')

const getHistory = async (req, res) => {
  try {
    const { search, month, concept } = req.query

    const where = {
      repository: {
        userId: req.user.id
      }
    }

    if (search) {
      where.message = {
        contains: search,
        mode: 'insensitive'
      }
    }

    if (month) {
      const [year, monthNumber] = month.split('-')
      const start = new Date(parseInt(year), parseInt(monthNumber) - 1, 1)
      const end = new Date(parseInt(year), parseInt(monthNumber), 1)
      where.committedAt = {
        gte: start,
        lt: end
      }
    }

    if (concept) {
      where.concepts = {
        some: {
          concept: {
            name: {
              contains: concept,
              mode: 'insensitive'
            }
          }
        }
      }
    }

    const commits = await prisma.commit.findMany({
      where,
      include: {
        concepts: {
          include: {
            concept: true
          }
        },
        files: true,
        repository: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        committedAt: 'desc'
      }
    })

    const history = {}

    for (const commit of commits) {
      const date = new Date(commit.committedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!history[monthKey]) {
        history[monthKey] = {
          month: monthKey,
          totalCommits: 0,
          commits: []
        }
      }

      const formattedCommit = {
        id: commit.id,
        sha: commit.sha,
        message: commit.message,
        committedAt: commit.committedAt,
        repository: commit.repository.name,
        concepts: commit.concepts.map(cc => ({
          id: cc.concept.id,
          name: cc.concept.name
        })),
        totalFiles: commit.files.length
      }

      history[monthKey].commits.push(formattedCommit)
      history[monthKey].totalCommits++
    }

    const timeline = Object.values(history)

    res.json({
      filters: { search, month, concept },
      totalMonths: timeline.length,
      totalCommits: commits.length,
      timeline
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

module.exports = { getHistory }