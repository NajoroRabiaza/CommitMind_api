/**
 * Controller de l'historique des commits.
 *
 * Retourne tous les commits de l'user groupés par mois,
 * avec des filtres optionnels sur le message, le mois et le concept lié.
 *
 * Les commits n'ont pas de userId direct dans le schéma : ils appartiennent
 * à des dépôts, qui eux appartiennent à des user. Le filtre passe
 * donc par la relation repository.userId.
 */

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
      // On utilise le début du mois suivant comme borne exclusive
      // pour éviter les problèmes liés aux heures (23:59:59 vs 00:00:00)
      const end = new Date(parseInt(year), parseInt(monthNumber), 1)
      where.committedAt = { gte: start, lt: end }
    }

    if (concept) {
      where.concepts = {
        // "some" = au moins une liaison doit correspondre (équivalent de EXISTS en SQL)
        some: {
          concept: {
            name: { contains: concept, mode: 'insensitive' }
          }
        }
      }
    }

    const commits = await prisma.commit.findMany({
      where,
      include: {
        concepts: { include: { concept: true } },
        files: true,
        repository: { select: { name: true } }
      },
      orderBy: { committedAt: 'desc' }
    })

    const history = {}

    for (const commit of commits) {
      const date = new Date(commit.committedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!history[monthKey]) {
        history[monthKey] = { month: monthKey, totalCommits: 0, commits: [] }
      }

      history[monthKey].commits.push({
        id: commit.id,
        sha: commit.sha,
        message: commit.message,
        committedAt: commit.committedAt,
        repository: commit.repository.name,
        concepts: commit.concepts.map(cc => ({ id: cc.concept.id, name: cc.concept.name })),
        totalFiles: commit.files.length
      })

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