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