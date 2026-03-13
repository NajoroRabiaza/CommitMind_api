const express = require('express');
const passport = require('passport');
const isAuthenticated = require('../middleware/isAuthenticated');
const { createGithubClient } = require('../services/githubService');
const router = express.Router();

// Route 1 : l'utilisateur clique "Login with Github"
// Passport redirige automatiquement vers Github
router.get('/auth/github', 
    passport.authenticate('github', {
        scope: ['user:email', 'repo']
    })
);

// Route 2 : Github renvoie l'utilisateur ici après son accord
router.get('/auth/github/callback',
    passport.authenticate('github', {
        failureRedirect: '/auth/failure'
    }),
    (req, res) => {
        res.json({
            message: 'Login successful',
            user: {
                id: req.user.id,
                username: req.user.username,
                avatarUrl: req.user.avatarUrl
            }
        })
    }
)

// Route 3 : si l'auth échoue
router.get('/auth/failure', (req, res) => {
    res.status(401).json({
        message: 'Authentication Failed'
    })
})

// Route protégé pour tester le middleware
router.get('/auth/me', isAuthenticated, (req, res) => {
    res.json({
        user: {
            id: req.user.id,
            username: req.user.username,
            avatarUrl: req.user.avatarUrl
        }
    })
})

// Route de déconnexion
router.get('/auth/logout', isAuthenticated, (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                message: 'Error during logout'
            })
        }

        res.json({
            message: 'Logout successful'
        })
    })
})

module.exports = router;