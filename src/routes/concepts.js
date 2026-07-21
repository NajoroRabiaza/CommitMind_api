const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const validateParams = require('../middleware/validateParams')
const { validate, conceptSchema } = require('../middleware/validate')
const { createConcept, getConcepts, getConceptById, deleteConcept, getCommitsByConcept, updateConcept } = require('../controllers/conceptController')

const router = express.Router()

router.post('/concepts',
  jwtAuth, validate(conceptSchema),
  createConcept
)

router.get('/concepts',
  jwtAuth,
  getConcepts
)

router.get('/concepts/:id',
  jwtAuth, validateParams('id'),
  getConceptById
)

router.delete('/concepts/:id',
  jwtAuth, validateParams('id'),
  deleteConcept
)

router.get('/concepts/:conceptId/commits',
  jwtAuth, validateParams('conceptId'),
  getCommitsByConcept
)

router.put('/concepts/:id',
  jwtAuth, validateParams('id'),
  validate(conceptSchema),
  updateConcept
)

module.exports = router