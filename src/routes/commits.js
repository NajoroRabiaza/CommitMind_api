const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const validateParams = require('../middleware/validateParams')
const { validate, linkConceptSchema } = require('../middleware/validate')
const { syncCommits, getCommits, syncCommitFiles, getCommitFiles } = require('../controllers/commitController')
const { linkConceptToCommit, autoDetectConcepts, unlinkConceptFromCommit } = require('../controllers/commitConceptController')

const router = express.Router()

router.post('/repositories/:repoId/commits/sync',
  jwtAuth, validateParams('repoId'),
  syncCommits
)

router.get('/repositories/:repoId/commits',
  jwtAuth, validateParams('repoId'),
  getCommits
)

router.post('/repositories/:repoId/commits/:commitId/files/sync',
  jwtAuth, validateParams('repoId', 'commitId'),
  syncCommitFiles
)

router.get('/repositories/:repoId/commits/:commitId/files',
  jwtAuth, validateParams('repoId', 'commitId'),
  getCommitFiles
)

router.post('/repositories/:repoId/commits/:commitId/concepts',
  jwtAuth, validateParams('repoId', 'commitId'),
  validate(linkConceptSchema),
  linkConceptToCommit
)

router.post('/repositories/:repoId/commits/:commitId/concepts/auto',
  jwtAuth, validateParams('repoId', 'commitId'),
  autoDetectConcepts
)

router.delete('/repositories/:repoId/commits/:commitId/concepts/:conceptId',
  jwtAuth, validateParams('repoId', 'commitId', 'conceptId'),
  unlinkConceptFromCommit
)

module.exports = router