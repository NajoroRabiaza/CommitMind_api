const prisma = require('../utils/prisma')

const getHistory = async (req, res) => {
  try {
    // Récupère tous les commits de l'utilisateur
    // avec leurs concepts et fichiers
    const commits = await prisma.commit.findMany({
      where: {
        repository: {
          userId: req.user.id
        }
      },
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

    // Grouper les commits par mois
    const history = {}

    for (const commit of commits) {
      // Créer la clé du mois : "2026-03"
      const date = new Date(commit.committedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // Créer le groupe si il n'existe pas encore
      if (!history[monthKey]) {
        history[monthKey] = {
          month: monthKey,
          totalCommits: 0,
          commits: []
        }
      }

      // Reformater le commit
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

    // Convertir l'objet en tableau trié
    const timeline = Object.values(history)

    res.json({
      totalMonths: timeline.length,
      totalCommits: commits.length,
      timeline
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getHistory }