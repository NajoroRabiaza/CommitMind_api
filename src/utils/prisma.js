/**
 * Instance unique du client Prisma partagee dans toute l'application.
 *
 * Node.js met en cache les modules au premier require(), donc tous les
 * fichiers qui importent ce module recoivent la meme instance Prisma.
 * Cela evite d'ouvrir plusieurs connexions inutiles vers la base.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

module.exports = prisma