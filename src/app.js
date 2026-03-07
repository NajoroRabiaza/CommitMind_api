const express = require('express');
const healthRouter = require('./routes/health');
const app = express();

// Middleware pour lire les JSON dans les requetes
app.use(express.json());
app.use(healthRouter)
module.exports = app;

