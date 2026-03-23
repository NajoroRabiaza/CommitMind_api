const express = require('express')
const passport = require('./middleware/passport')
const healthRouter = require('./routes/health')
const authRouter = require('./routes/auth')
const repositoriesRouter = require('./routes/repositories')
const commitsRouter = require('./routes/commits')
const conceptsRouter = require('./routes/concepts')
const historyRouter = require('./routes/history')

const app = express()

app.use(express.json())
app.use(passport.initialize())

app.use(healthRouter)
app.use(authRouter)
app.use(repositoriesRouter)
app.use(commitsRouter)
app.use(conceptsRouter)
app.use(historyRouter)

module.exports = app