/**
 * Configuration de la stratégie d'authentification GitHub OAuth via Passport.
 *
 * Le flux OAuth se déroule en trois étapes :
 *   1. L'user est redirigé vers GitHub (/auth/github)
 *   2. GitHub renvoie un code d'autorisation vers callbackURL
 *   3. Passport échange ce code contre un accessToken et appelle ce fichier
 *
 * L'accessToken reçu de GitHub est chiffré avec AES-256-GCM avant d'être
 * stocké en base de données, pour limiter l'exposition en cas de compromission.
 */

const passport = require('passport')
const GitHubStrategy = require('passport-github2').Strategy
const prisma = require('../utils/prisma')
const { encrypt } = require('../utils/crypto')

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const encryptedToken = encrypt(accessToken)

        // upsert pour gérer en une seule requête la création du compte
        // à la première connexion et la mise à jour des infos aux suivantes
        const user = await prisma.user.upsert({
          where: { githubId: profile.id.toString() },
          update: {
            username: profile.username,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: encryptedToken
          },
          create: {
            githubId: profile.id.toString(),
            username: profile.username,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            accessToken: encryptedToken
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