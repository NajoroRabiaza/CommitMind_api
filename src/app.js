const express = require('express')
const session = require('express-session')
const passport = require('./middleware/passport')
const healthRouter = require('./routes/health')
const authRouter = require('./routes/auth')

const app = express()

app.use(express.json())

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(healthRouter)
app.use(authRouter)

module.exports = app