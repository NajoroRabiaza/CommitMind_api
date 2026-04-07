// toutes les routes liees aux concepts (tags d'apprentissage)
//  un concept c'est un tag qu'on cree soi-meme
//  ex: "jwt", "pagination", "tests unitaires"
//  on peut ensuite le lier a des commits
//
// liste des routes definies ici :
//   POST   /concepts  = creer un nouveau concept
//   GET    /concepts  = lister ses concepts (pagine)
//   GET    /concepts/:id  = voir un concept precis
//   DELETE /concepts/:id  = supprimer un concept
//   GET    /concepts/:conceptId/commits = voir les commits lies a un concept
//   PUT    /concepts/:id  = modifier un concept existant

const express = require('express')

// middleware jwt pour proteger toutes les routes
const jwtAuth = require('../middleware/jwtAuth')

// validate et conceptSchema pour valider le body
// sur les routes de creation et de modification
const { validate, conceptSchema } = require('../middleware/validate')

// on importe les 6 fonctions du controller des concepts
const {
  createConcept, // creer un nouveau concept
  getConcepts,   // lister les concepts avec pagination
  getConceptById, // recuperer un concept par son id
  deleteConcept,  // supprimer un concept
  getCommitsByConcept, // lister les commits lies a un concept
  updateConcept  // modifier le nom ou la description d'un concept
} = require('../controllers/conceptController')

const router = express.Router()

// POST /concepts
// creer un nouveau concept pour l'utilisateur connecte
// le body doit contenir { name: "jwt", description: "..." }
// validate(conceptSchema) verifie les donnees avant le controller
//  ex: POST /concepts
//  body: { "name": "authentification", "description": "..." }
router.post('/concepts', jwtAuth, validate(conceptSchema), createConcept)

// GET /concepts
// lister tous les concepts de l'utilisateur connecte
// supporte ?page=, ?limit= et ?search= en query params
// ex: GET /concepts?search=auth&page=1&limit=10
router.get('/concepts', jwtAuth, getConcepts)

// GET /concepts/:id
// recuperer un seul concept par son identifiant
// ex: GET /concepts/5
router.get('/concepts/:id', jwtAuth, getConceptById)

// DELETE /concepts/:id
//  supprimer definitivement un concept
//  les liaisons avec les commits seront aussi supprimees
//  car prisma gere la suppression en cascade
//  ex: DELETE /concepts/5
router.delete('/concepts/:id', jwtAuth, deleteConcept)

// GET /concepts/:conceptId/commits
// recuperer tous les commits lies a un concept precis
//  utile pour voir "tous les commits ou j'ai applique JWT"
//  ex: GET /concepts/5/commits
router.get('/concepts/:conceptId/commits', jwtAuth, getCommitsByConcept)

// PUT /concepts/:id
// modifier le nom ou la description d'un concept existant
// PUT remplace tout l'objet (contrairement a PATCH qui
// ne modifie que les champs envoyes)
//   validate(conceptSchema) verifie le body avant le controller
//   ex: PUT /concepts/5
//   body: { "name": "nouveau nom", "description": "..." }
router.put('/concepts/:id', jwtAuth, validate(conceptSchema), updateConcept)

// on exporte le routeur pour que app.js puisse le brancher
module.exports = router