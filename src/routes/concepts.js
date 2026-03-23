const express = require('express')
const isAuthenticated = require('../middleware/isAuthenticated')
const {
  createConcept,
  getConcepts,
  getConceptById,
  deleteConcept
} = require('../controllers/conceptController')

const router = express.Router()

router.post('/concepts', isAuthenticated, createConcept)
router.get('/concepts', isAuthenticated, getConcepts)
router.get('/concepts/:id', isAuthenticated, getConceptById)
router.delete('/concepts/:id', isAuthenticated, deleteConcept)

module.exports = router