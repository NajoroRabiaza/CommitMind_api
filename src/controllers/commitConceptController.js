/**
 * Controller de liaison entre commits et concepts.
 *
 * Gère trois opérations : liaison manuelle d'un concept à un commit,
 * détection automatique des concepts d'un commit via le service dédié,
 * et suppression d'un lien existant.
 *
 * Chaque opération vérifie la chaîne de propriété complète :
 * dépôt => commit => concept, tous rattachés à l'utilisateur connecté.
 */

const prisma = require('../utils/prisma')
const { detectConceptsFromCommit } = require('../services/conceptDetectionService')

const linkConceptToCommit = async (req, res) => {
  try {
    const { repoId, commitId } = req.params
    const { conceptId } = req.body

    const repository = await prisma.repository.findFirst({
      where: { id: parseInt(repoId), userId: req.user.id }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: { id: parseInt(commitId), repositoryId: repository.id }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    const concept = await prisma.concept.findFirst({
      where: { id: parseInt(conceptId), userId: req.user.id }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    // upsert pour éviter les doublons si le lien existe déjà,
    // sans renvoyer d'erreur au client
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
      message: `concept "${concept.name}" linked to commit "${commit.message}"`,
      link
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const autoDetectConcepts = async (req, res) => {
  try {
    const { repoId, commitId } = req.params

    const repository = await prisma.repository.findFirst({
      where: { id: parseInt(repoId), userId: req.user.id }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: { id: parseInt(commitId), repositoryId: repository.id }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    const files = await prisma.commitFile.findMany({
      where: { commitId: commit.id }
    })

    const detectedConceptNames = detectConceptsFromCommit(commit.message, files)
    const linkedConcepts = []

    for (const conceptName of detectedConceptNames) {
      const concept = await prisma.concept.upsert({
        where: {
          name_userId: { name: conceptName, userId: req.user.id }
        },
        update: {},
        create: { name: conceptName, userId: req.user.id }
      })

      await prisma.commitConcept.upsert({
        where: {
          commitId_conceptId: { commitId: commit.id, conceptId: concept.id }
        },
        update: {},
        create: { commitId: commit.id, conceptId: concept.id }
      })

      linkedConcepts.push(conceptName)
    }

    res.json({
      message: linkedConcepts.length > 0
        ? `${linkedConcepts.length} concepts detected and linked automatically`
        : 'no concepts detected for this commit',
      detectedConcepts: linkedConcepts
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const unlinkConceptFromCommit = async (req, res) => {
  try {
    const { repoId, commitId, conceptId } = req.params

    const repository = await prisma.repository.findFirst({
      where: { id: parseInt(repoId), userId: req.user.id }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: { id: parseInt(commitId), repositoryId: repository.id }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    const concept = await prisma.concept.findFirst({
      where: { id: parseInt(conceptId), userId: req.user.id }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    const link = await prisma.commitConcept.findUnique({
      where: {
        commitId_conceptId: { commitId: commit.id, conceptId: concept.id }
      }
    })

    if (!link) {
      return res.status(404).json({
        message: `no link found between commit "${commit.message}" and concept "${concept.name}"`
      })
    }

    await prisma.commitConcept.delete({
      where: {
        commitId_conceptId: { commitId: commit.id, conceptId: concept.id }
      }
    })

    res.json({
      message: `concept "${concept.name}" unlinked from commit "${commit.message}"`
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

module.exports = { linkConceptToCommit, autoDetectConcepts, unlinkConceptFromCommit }