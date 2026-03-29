const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const { getStats } = require('../controllers/statsController')

const router = express.Router()

router.get('/stats', jwtAuth, getStats)

module.exports = router