const prisma = require('../utils/prisma')
const { getPagination, paginatedResponse } = require('../utils/pagination')

const createConcept = async (req, res) => {
  try {
    const { name, description } = req.body

    const concept = await prisma.concept.create({
      data: {
        name,
        description: description || null,
        userId: req.user.id
      }
    })

    res.status(201).json({ concept })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getConcepts = async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query)
    const search = req.query.search || ''

    const where = {
      userId: req.user.id,
      ...(search && {
        name: {
          contains: search
        }
      })
    }

    const total = await prisma.concept.count({ where })

    const concepts = await prisma.concept.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    })

    res.json(paginatedResponse(concepts, total, page, limit))
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getConceptById = async (req, res) => {
  try {
    const { id } = req.params

    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    res.json({ concept })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const updateConcept = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    const updated = await prisma.concept.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description: description || null
      }
    })

    res.json({ concept: updated })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const deleteConcept = async (req, res) => {
  try {
    const { id } = req.params

    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(id),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    await prisma.concept.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'concept deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

const getCommitsByConcept = async (req, res) => {
  try {
    const { conceptId } = req.params

    const concept = await prisma.concept.findFirst({
      where: {
        id: parseInt(conceptId),
        userId: req.user.id
      }
    })

    if (!concept) {
      return res.status(404).json({ message: 'concept not found' })
    }

    const commitConcepts = await prisma.commitConcept.findMany({
      where: {
        conceptId: concept.id
      },
      include: {
        commit: {
          include: {
            files: true
          }
        }
      },
      orderBy: {
        commit: {
          committedAt: 'desc'
        }
      }
    })

    const commits = commitConcepts.map(cc => cc.commit)

    res.json({
      concept: concept.name,
      totalCommits: commits.length,
      commits
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { createConcept, getConcepts, getConceptById, deleteConcept, getCommitsByConcept, updateConcept }