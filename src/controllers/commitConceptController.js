const prisma = require('../utils/prisma')

const linkConceptToCommit = async (req, res) => {
  try {
    const { repoId, commitId } = req.params
    const { conceptId } = req.body

    // Vérifier que le repo appartient à l'utilisateur connecté
    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    // Vérifier que le commit appartient bien à ce repo
    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'Commit not found' })
    }

    // Vérifier que le concept appartient à l'utilisateur connecté
    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(conceptId),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'Concept not found' })
    }

    // Créer la liaison (upsert pour éviter les doublons)
    const link = await prisma.commitConcept.upsert({
      where: {
        commitId_conceptId: {
          commitId: commit.id,
          conceptId: concept.id
        }
      },
      update: {},
      create: {
        commitId: commit.id,
        conceptId: concept.id
      }
    })

    res.status(201).json({
      message: `Concept "${concept.name}" linked to commit "${commit.message}"`,
      link
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { linkConceptToCommit }