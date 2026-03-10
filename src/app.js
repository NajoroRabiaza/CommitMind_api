const express = require('express')
const session = require('express-session')
const passport = require('./middleware/passport')
const healthRouter = require('./routes/health')
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
module.exports = app