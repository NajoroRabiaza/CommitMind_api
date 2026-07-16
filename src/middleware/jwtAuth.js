/**
 * Middleware d'authentification JWT.
 *
 * Verifie la presence et la validite du token JWT dans le header
 * Authorization de chaque requete entrante. Si le token est valide,
 * l'user est attache a req.user pour les controllers suivants.
 *
 * Format attendu du header : Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')

const jwtAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'unauthorized. please login first at /auth/github'
      })
    }

    const token = authHeader.split(' ')[1]

    // jwt.verify affiche une erreur si le token est expirer ou falsifie,
    // ce qui fait tomber directement dans le catch
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(401).json({ message: 'user not found' })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'invalid or expired token' })
  }
}

module.exports = jwtAuth