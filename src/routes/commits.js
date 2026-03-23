const express = require('express')
const isAuthenticated = require('../middleware/isAuthenticated')
const {
  syncCommits,
  getCommits,
  syncCommitFiles,
  getCommitFiles
} = require('../controllers/commitController')

const router = express.Router()

router.post('/repositories/:repoId/commits/sync', isAuthenticated, syncCommits)
router.get('/repositories/:repoId/commits', isAuthenticated, getCommits)
router.post('/repositories/:repoId/commits/:commitId/files/sync', isAuthenticated, syncCommitFiles)
router.get('/repositories/:repoId/commits/:commitId/files', isAuthenticated, getCommitFiles)

module.exports = router