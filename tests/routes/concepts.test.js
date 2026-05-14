// tests des routes /concepts
// routes couvertes :
//   POST   /concepts               : creer un concept
//   GET    /concepts               : lister ses concepts
//   GET    /concepts/:id           : voir un concept
//   DELETE /concepts/:id           : supprimer un concept
//   PUT    /concepts/:id           : modifier un concept
//   GET    /concepts/:id/commits   : commits lies a un concept

const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../src/utils/prisma', () => ({
  user: { findUnique: jest.fn() },
  concept: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  commitConcept: {
    findMany: jest.fn()
  }
}))

jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => next()),
  initialize: jest.fn(() => (req, res, next) => next()),
  use: jest.fn()
}))

const prisma = require('../../src/utils/prisma')

const TEST_SECRET = 'test_secret_jest'
const fakeUser = { id: 1, username: 'NajoroRabiaza' }
const fakeConcept = { id: 7, name: 'Prisma ORM', description: 'ORM Node.js', userId: 1 }

const makeToken = () => jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
const bearer = () => ({ Authorization: `Bearer ${makeToken()}` })

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
  process.env.GITHUB_CLIENT_ID = 'fake'
  process.env.GITHUB_CLIENT_SECRET = 'fake'
  process.env.SESSION_SECRET = 'fake'
  jest.clearAllMocks()
  prisma.user.findUnique.mockResolvedValue(fakeUser)
})

// POST /concepts

describe('POST /concepts', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).post('/concepts').send({ name: 'Test' })
    expect(res.status).toBe(401)
  })

  test('renvoie 400 si name est absent', async () => {
    const app = require('../../src/app')
    const res = await request(app)
      .post('/concepts')
      .set(bearer())
      .send({})
    expect(res.status).toBe(400)
  })

  test('renvoie 400 si name est une chaine vide', async () => {
    const app = require('../../src/app')
    const res = await request(app)
      .post('/concepts')
      .set(bearer())
      .send({ name: '' })
    expect(res.status).toBe(400)
  })

  test('cree un concept et renvoie 201', async () => {
    const app = require('../../src/app')
    prisma.concept.create.mockResolvedValue(fakeConcept)

    const res = await request(app)
      .post('/concepts')
      .set(bearer())
      .send({ name: 'Prisma ORM', description: 'ORM Node.js' })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('concept')
    expect(res.body.concept).toHaveProperty('name', 'Prisma ORM')
  })

  test('renvoie 500 si prisma lance une erreur', async () => {
    const app = require('../../src/app')
    prisma.concept.create.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .post('/concepts')
      .set(bearer())
      .send({ name: 'JWT' })

    expect(res.status).toBe(500)
  })

})

// GET /concepts

describe('GET /concepts', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/concepts')
    expect(res.status).toBe(401)
  })

  test('renvoie 200 avec les concepts pagines', async () => {
    const app = require('../../src/app')
    prisma.concept.count.mockResolvedValue(2)
    prisma.concept.findMany.mockResolvedValue([fakeConcept])

    const res = await request(app)
      .get('/concepts')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('pagination')
  })

  test('renvoie un tableau vide si aucun concept', async () => {
    const app = require('../../src/app')
    prisma.concept.count.mockResolvedValue(0)
    prisma.concept.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/concepts')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
    expect(res.body.pagination.total).toBe(0)
  })

})

// GET /concepts/:id

describe('GET /concepts/:id', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/concepts/7')
    expect(res.status).toBe(401)
  })

  test('renvoie 404 si le concept est introuvable', async () => {
    const app = require('../../src/app')
    prisma.concept.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/concepts/99')
      .set(bearer())

    expect(res.status).toBe(404)
  })

  test('renvoie 200 avec le concept si trouve', async () => {
    const app = require('../../src/app')
    prisma.concept.findFirst.mockResolvedValue(fakeConcept)

    const res = await request(app)
      .get('/concepts/7')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('concept')
    expect(res.body.concept.id).toBe(7)
  })

})

//  DELETE /concepts/:id

describe('DELETE /concepts/:id', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).delete('/concepts/7')
    expect(res.status).toBe(401)
  })

  test('renvoie 404 si le concept est introuvable', async () => {
    const app = require('../../src/app')
    prisma.concept.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .delete('/concepts/99')
      .set(bearer())

    expect(res.status).toBe(404)
  })

  test('renvoie 200 si la suppression reussit', async () => {
    const app = require('../../src/app')
    prisma.concept.findFirst.mockResolvedValue(fakeConcept)
    prisma.concept.delete.mockResolvedValue(fakeConcept)

    const res = await request(app)
      .delete('/concepts/7')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

})

// PUT /concepts/:id

describe('PUT /concepts/:id', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).put('/concepts/7').send({ name: 'Nouveau' })
    expect(res.status).toBe(401)
  })

  test('renvoie 400 si name est absent du body', async () => {
    const app = require('../../src/app')
    const res = await request(app)
      .put('/concepts/7')
      .set(bearer())
      .send({})
    expect(res.status).toBe(400)
  })

  test('renvoie 404 si le concept est introuvable', async () => {
    const app = require('../../src/app')
    prisma.concept.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .put('/concepts/99')
      .set(bearer())
      .send({ name: 'Nouveau nom' })

    expect(res.status).toBe(404)
  })

  test('modifie le concept et renvoie 200', async () => {
    const app = require('../../src/app')
    const updatedConcept = { ...fakeConcept, name: 'Prisma ORM v2' }
    prisma.concept.findFirst.mockResolvedValue(fakeConcept)
    prisma.concept.update.mockResolvedValue(updatedConcept)

    const res = await request(app)
      .put('/concepts/7')
      .set(bearer())
      .send({ name: 'Prisma ORM v2' })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('concept')
  })

})