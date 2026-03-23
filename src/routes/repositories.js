const express = require('express');
const jwtAuth = require('../middleware/jwtAuth')
const {syncRepositories, getRepositories} = require('../controllers/repositoryController');

const router = express.Router()

router.post('/repositories/sync', jwtAuth, syncRepositories)
router.get('/repositories', jwtAuth, getRepositories)

module.exports = router;