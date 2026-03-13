const express = require('express');
const isAuthenticated = require('../middleware/isAuthenticated');
const {syncRepositories, getRepositories} = require('../controllers/repositoryController');

const router = express.Router()

router.post('/repositories/sync', isAuthenticated, syncRepositories)
router.get('/repositories', isAuthenticated, getRepositories)

module.exports = router;