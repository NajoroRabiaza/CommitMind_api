const express = require('express')
const passport = require('./middleware/passport')

const healthRouter = require('./routes/health')
const authRouter = require('./routes/auth')
const repositoriesRouter = require('./routes/repositories')
const commitsRouter = require('./routes/commits')
const conceptsRouter = require('./routes/concepts')
const historyRouter = require('./routes/history')
const statsRouter = require('./routes/stats')

const app = express()

app.use(express.json())
app.use(passport.initialize())

app.use(healthRouter)
app.use(authRouter)
app.use(repositoriesRouter)
app.use(commitsRouter)
app.use(conceptsRouter)
app.use(historyRouter)
app.use(statsRouter)

// Middleware de gestion d'erreur global.
// Attrape toutes les erreurs non gérées transmises via next(err).
// Doit être enregistré après tous les routers pour fonctionner correctement.
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ message: 'internal server error' })
})

module.exports = app