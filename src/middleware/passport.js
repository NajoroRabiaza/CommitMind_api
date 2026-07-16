/**
 * Configuration de la strategie d'authentification GitHub OAuth via Passport.
 *
 * Le flux OAuth se deroule en trois etapes :
 *   1. L'user est redirige vers GitHub (/auth/github)
 *   2. GitHub renvoie un code d'autorisation vers callbackURL
 *   3. Passport echange ce code contre un accessToken et appelle ce fichier
 *
 * À chaque connexion reussie, on effectue un upsert de l'user en base
 * pour gerer à la fois la première connexion et les reconnexions suivantes.
 */

const passport = require('passport')
const GitHubStrategy = require('passport-github2').Strategy
const prisma = require('../utils/prisma')

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        // upsert pour gerer en une seule requête la creation du compte
        // à la première connexion et la mise à jour des infos aux suivantes
        const user = await prisma.user.upsert({
          where: { githubId: profile.id.toString() },
          update: {
            username: profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: accessToken
          },
          create: {
            githubId: profile.id.toString(),
            username: profile.username,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: accessToken
          }
        })

        return done(null, user)
      } catch (error) {
        return done(error, null)
      }
    }
  )
)

module.exports = passport