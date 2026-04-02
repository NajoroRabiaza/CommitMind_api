const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const { validate, linkConceptSchema } = require('../middleware/validate')
const {
  syncCommits,
  getCommits,
  syncCommitFiles,
  getCommitFiles
} = require('../controllers/commitController')
const { linkConceptToCommit } = require('../controllers/commitConceptController')

const router = express.Router()

router.post('/repositories/:repoId/commits/sync', jwtAuth, syncCommits)
router.get('/repositories/:repoId/commits', jwtAuth, getCommits)
router.post('/repositories/:repoId/commits/:commitId/files/sync', jwtAuth, syncCommitFiles)
router.get('/repositories/:repoId/commits/:commitId/files', jwtAuth, getCommitFiles)
router.post('/repositories/:repoId/commits/:commitId/concepts', jwtAuth, validate(linkConceptSchema), linkConceptToCommit)

module.exports = router