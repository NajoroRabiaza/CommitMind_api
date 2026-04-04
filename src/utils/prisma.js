// creation et export d'une instance unique du client prisma
// tous les autres fichiers importent prisma depuis ici
// au lieu de creer chacun leur propre instance
//
// pourquoi un seul fichier pour ca ?
// si chaque controller creait son propre "new PrismaClient()"
// on aurait plusieurs connexions ouvertes vers la base en meme temps
// ce qui peut causer des problemes de performance et de limite
// en passant par ce fichier, node.js met en cache le module
// donc new PrismaClient() n'est execute qu'une seule fois
// au premier import, et tous les autres imports recoivent
// la meme instance deja creee

// PrismaClient est la classe principale de prisma
// elle contient toutes les methodes pour interroger la base :
// prisma.user.findMany()
// prisma.commit.create()
// prisma.repository.upsert()
// etc.
const { PrismaClient } = require('@prisma/client');

// on cree l'instance une seule et unique fois
// prisma lit automatiquement DATABASE_URL depuis .env
// pour savoir a quelle base de donnees se connecter
const prisma = new PrismaClient();

// on exporte directement l'instance (pas la classe)
// tous les fichiers qui font require('../utils/prisma')
// recoivent ce meme objet prisma pret a l'emploi
module.exports = prisma;