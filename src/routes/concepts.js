const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const {
  createConcept,
  getConcepts,
  getConceptById,
  deleteConcept,
  getCommitsByConcept,
  updateConcept
} = require('../controllers/conceptController')

const router = express.Router()

router.post('/concepts', jwtAuth, createConcept)
router.get('/concepts', jwtAuth, getConcepts)
router.get('/concepts/:id', jwtAuth, getConceptById)
router.delete('/concepts/:id', jwtAuth, deleteConcept)
router.get('/concepts/:conceptId/commits', jwtAuth, getCommitsByConcept)
router.put('/concepts/:id', jwtAuth, updateConcept)

module.exports = router