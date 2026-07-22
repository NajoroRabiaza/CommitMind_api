/**
 * Middleware d'authentification JWT.
 *
 * Vérifie la présence et la validité du token JWT dans le header
 * Authorization de chaque requête entrante. Si le token est valide,
 * l'user est attaché à req.user pour les controllers suivants.
 *
 * L'accessToken stocké en base est déchiffré avant d'être attaché
 * à req.user, de sorte que les controllers et services reçoivent
 * toujours le token en clair prêt à l'emploi.
 *
 * Format attendu du header : Authorization: Bearer <token>
 */

const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')
const { decrypt } = require('../utils/crypto')

const jwtAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'unauthorized. please login first at /auth/github'
      })
    }

    // jwt.verify lève une erreur si le token est expiré ou falsifié,
    // ce qui fait tomber directement dans le catch
    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(401).json({ message: 'user not found' })
    }

    // On déchiffre l'accessToken ici une seule fois pour tous les
    // controllers qui en auront besoin via req.user.accessToken
    req.user = {
      ...user,
      accessToken: decrypt(user.accessToken)
    }

    next()
  } catch (error) {
    return res.status(401).json({ message: 'invalid or expired token' })
  }
}

module.exports = jwtAuth