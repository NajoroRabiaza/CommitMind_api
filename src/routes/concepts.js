const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const { validate, conceptSchema } = require('../middleware/validate')
const {
  createConcept,
  getConcepts,
  getConceptById,
  deleteConcept,
  getCommitsByConcept,
  updateConcept
} = require('../controllers/conceptController')

const router = express.Router()

router.post('/concepts', jwtAuth, validate(conceptSchema), createConcept)
router.get('/concepts', jwtAuth, getConcepts)
router.get('/concepts/:id', jwtAuth, getConceptById)
router.delete('/concepts/:id', jwtAuth, deleteConcept)
router.get('/concepts/:conceptId/commits', jwtAuth, getCommitsByConcept)
router.put('/concepts/:id', jwtAuth, validate(conceptSchema), updateConcept)

module.exports = router