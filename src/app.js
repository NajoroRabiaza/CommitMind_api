const express = require('express');
const app = express();

// Middleware pour lire les JSON dans les requetes
app.use(express.json());
module.exports = app;