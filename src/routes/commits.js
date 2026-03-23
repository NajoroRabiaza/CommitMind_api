const express = require('express')
const isAuthenticated = require('../middleware/isAuthenticated')
const { syncCommits, getCommits } = require('../controllers/commitController')

const router = express.Router()

router.post('/repositories/:repoId/commits/sync', isAuthenticated, syncCommits)
router.get('/repositories/:repoId/commits', isAuthenticated, getCommits)

module.exports = router