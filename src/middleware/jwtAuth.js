const jwt = require('jsonwebtoken')
const prisma = require('../utils/prisma')

const jwtAuth = async (req, res, next) => {
  try {
    // Récupère le header Authorization: Bearer <token>
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Unauthorized. Please login first at /auth/github'
      })
    }

    // Extrait le token depuis "Bearer <token>"
    const token = authHeader.split(' ')[1]

    // Vérifie et décode le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Récupère l'utilisateur depuis la DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    // Met l'utilisateur dans req.user comme avant
    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

module.exports = jwtAuth