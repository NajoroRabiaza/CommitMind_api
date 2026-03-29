const prisma = require('../utils/prisma')

const getStats = async (req, res) => {
  try {
    // Total commits
    const totalCommits = await prisma.commit.count({
      where: {
        repository: { userId: req.user.id }
      }
    })

    // Total repositories
    const totalRepositories = await prisma.repository.count({
      where: { userId: req.user.id }
    })

    // Total concepts
    const totalConcepts = await prisma.concept.count({
      where: { userId: req.user.id }
    })

    // Commits par mois
    const commits = await prisma.commit.findMany({
      where: {
        repository: { userId: req.user.id }
      },
      select: {
        committedAt: true
      }
    })

    const commitsByMonth = {}
    for (const commit of commits) {
      const date = new Date(commit.committedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      commitsByMonth[monthKey] = (commitsByMonth[monthKey] || 0) + 1
    }

    // Concepts les plus utilisés
    const topConcepts = await prisma.concept.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { commits: true }
        }
      },
      orderBy: {
        commits: {
          _count: 'desc'
        }
      },
      take: 5
    })

    // Repos les plus actifs
    const topRepositories = await prisma.repository.findMany({
      where: { userId: req.user.id },
      include: {
        _count: {
          select: { commits: true }
        }
      },
      orderBy: {
        commits: {
          _count: 'desc'
        }
      },
      take: 5
    })

    res.json({
      overview: {
        totalCommits,
        totalRepositories,
        totalConcepts
      },
      commitsByMonth: Object.entries(commitsByMonth)
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month)),
      topConcepts: topConcepts.map(c => ({
        id: c.id,
        name: c.name,
        totalCommits: c._count.commits
      })),
      topRepositories: topRepositories.map(r => ({
        id: r.id,
        name: r.name,
        totalCommits: r._count.commits
      }))
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getStats }