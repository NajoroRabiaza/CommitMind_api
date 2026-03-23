const express = require('express')
const jwtAuth = require('../middleware/jwtAuth')
const { getHistory } = require('../controllers/historyController')

const router = express.Router()

router.get('/history', jwtAuth, getHistory)

module.exports = router