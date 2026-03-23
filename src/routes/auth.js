const express = require('express')
const passport = require('passport')
const jwt = require('jsonwebtoken')
const jwtAuth = require('../middleware/jwtAuth')
const router = express.Router()

router.get('/auth/github',
  passport.authenticate('github', {
    scope: ['user:email', 'repo'],
    session: false
  })
)

router.get('/auth/github/callback',
  passport.authenticate('github', {
    failureRedirect: '/auth/failure',
    session: false
  }),
  (req, res) => {
    // Génère le token JWT
    const token = jwt.sign(
      { userId: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
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
  res.status(401).json({ message: 'Authentication Failed' })
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
  res.json({ message: 'Logout successful. Delete your token.' })
})

module.exports = router