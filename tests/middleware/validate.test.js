// tests unitaires pour le middleware de validation zod
// validate.js exporte trois elements :
//   validate        : fabrique de middleware (higher-order function)
//   conceptSchema   : schema pour creer/modifier un concept
//   linkConceptSchema : schema pour lier un concept a un commit
//
// objectif des tests :
//   verifier que les schemas rejettent les donnees invalides
//   verifier que les schemas acceptent les donnees valides
//   verifier que validate() bloque la requete si la validation echoue
//   verifier que validate() laisse passer si la validation reussit

const { validate, conceptSchema, linkConceptSchema } = require('../../src/middleware/validate')

// helper : simuler une requete express avec un body donne
const buildReq = (body) => ({ body })

// helper : simuler la reponse express avec chaining
const buildRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

// Tests de conceptSchema via validate()

describe('validate(conceptSchema)', () => {

  const middleware = validate(conceptSchema)

  // cas valides

  test('laisse passer si name est present et valide', () => {
    const req = buildReq({ name: 'JWT Authentication' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  test('laisse passer avec name et description valides', () => {
    const req = buildReq({
      name: 'Prisma ORM',
      description: 'Un ORM Node.js pour PostgreSQL'
    })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  test('laisse passer si description est absente (champ optionnel)', () => {
    const req = buildReq({ name: 'Redis' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  test('remplace req.body par les donnees validees et nettoyees', () => {
    const req = buildReq({
      name: 'Docker',
      description: 'Containerisation',
      champInconnu: 'a supprimer'  // zod doit supprimer ce champ
    })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    // zod strip() enleve les champs non declares dans le schema
    expect(req.body).toHaveProperty('name', 'Docker')
    expect(req.body).toHaveProperty('description', 'Containerisation')
  })

  test('accepte un name avec exactement 1 caractere (minimum)', () => {
    const req = buildReq({ name: 'A' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  test('accepte un name avec exactement 100 caracteres (maximum)', () => {
    const name = 'A'.repeat(100)
    const req = buildReq({ name })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  // cas invalides

  test('renvoie 400 si name est absent', () => {
    const req = buildReq({ description: 'sans nom' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si name est une chaine vide', () => {
    const req = buildReq({ name: '' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si name depasse 100 caracteres', () => {
    const name = 'A'.repeat(101)
    const req = buildReq({ name })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si description depasse 500 caracteres', () => {
    const req = buildReq({
      name: 'Concept valide',
      description: 'D'.repeat(501)
    })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si name est un nombre (pas une chaine)', () => {
    const req = buildReq({ name: 42 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si body est null', () => {
    const req = buildReq(null)
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('la reponse d erreur contient message et errors', () => {
    const req = buildReq({ name: '' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    // on verifie la structure de la reponse d'erreur
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.any(String),
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            message: expect.any(String)
          })
        ])
      })
    )
  })

})

// Tests de linkConceptSchema via validate()

describe('validate(linkConceptSchema)', () => {

  const middleware = validate(linkConceptSchema)

  // ── cas valides──

  test('laisse passer si conceptId est un nombre positif', () => {
    const req = buildReq({ conceptId: 5 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  test('convertit conceptId string "5" en nombre 5 (coerce)', () => {
    // z.coerce.number() doit convertir automatiquement "5" en 5
    const req = buildReq({ conceptId: '5' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.body.conceptId).toBe(5)
  })

  test('laisse passer si conceptId est 1 (minimum positif)', () => {
    const req = buildReq({ conceptId: 1 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  // cas invalides

  test('renvoie 400 si conceptId est absent', () => {
    const req = buildReq({})
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si conceptId est 0', () => {
    // .positive() interdit 0
    const req = buildReq({ conceptId: 0 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si conceptId est negatif', () => {
    const req = buildReq({ conceptId: -3 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si conceptId est un decimal (3.14)', () => {
    const req = buildReq({ conceptId: 3.14 })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 400 si conceptId est une chaine non numerique', () => {
    const req = buildReq({ conceptId: 'abc' })
    const res = buildRes()
    const next = jest.fn()

    middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(next).not.toHaveBeenCalled()
  })

})

// Tests de la fabrique validate() elle-meme

describe('validate (fonction fabrique)', () => {

  test('retourne une fonction (middleware)', () => {
    const middleware = validate(conceptSchema)
    expect(typeof middleware).toBe('function')
  })

  test('peut etre appele avec n importe quel schema zod', () => {
    // on verifie que la fabrique est generique
    // et fonctionne avec les deux schemas du projet
    const m1 = validate(conceptSchema)
    const m2 = validate(linkConceptSchema)
    expect(typeof m1).toBe('function')
    expect(typeof m2).toBe('function')
  })

})