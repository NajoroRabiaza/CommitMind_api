const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const jwtAuth = require('../middleware/jwtAuth')

const router = express.Router()

router.get('/auth/github',
  passport.authenticate('github', {
    scope: ['read:user', 'user:email'],
    session: false
  })
)

router.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'login successful',
      token,
      user: {
        id: req.user.id,
        username: req.user.username,
        avatarUrl: req.user.avatarUrl
      }
    })
  }
)

router.get('/auth/failure', (req, res) => {
  res.status(401).json({ message: 'authentication failed' })
})

router.get('/auth/me', jwtAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      avatarUrl: req.user.avatarUrl
    }
  })
})

router.get('/auth/logout', (req, res) => {
  res.json({ message: 'logout successful. delete your token.' })
})

module.exports = router