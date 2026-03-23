const prisma = require('../utils/prisma')

const createConcept = async (req, res) => {
  try {
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ message: 'Le champ "name" est obligatoire' })
    }

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
    const concepts = await prisma.concept.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    })

    res.json({ concepts })
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
      return res.status(404).json({ message: 'Concept not found' })
    }

    res.json({ concept })
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
      return res.status(404).json({ message: 'Concept not found' })
    }

    await prisma.concept.delete({
      where: { id: parseInt(id) }
    })

    res.json({ message: 'Concept deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { createConcept, getConcepts, getConceptById, deleteConcept }