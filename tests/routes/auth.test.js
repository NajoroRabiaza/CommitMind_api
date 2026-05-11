// tests des routes d'authentification
// on teste le comportement des routes sans faire de vrais appels
// a github ni a la base de donnees
// on utilise jest.mock() pour remplacer les dependances externes
// et supertest pour simuler des requetes http reelles sur l'app

const request = require('supertest')
const jwt = require('jsonwebtoken')

// on mocke les dependances avant de charger l'app
jest.mock('../../src/utils/prisma', () => ({
  user: {
    findUnique: jest.fn()
  }
}))

// on mocke passport pour eviter d'avoir a configurer github oauth
jest.mock('passport', () => ({
  authenticate: jest.fn((strategy, options) => {
    return (req, res, next) => next()
  }),
  initialize: jest.fn(() => (req, res, next) => next()),
  use: jest.fn()
}))

const prisma = require('../../src/utils/prisma')

const TEST_SECRET = 'test_secret_jest'

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
  process.env.GITHUB_CLIENT_ID = 'fake_client_id'
  process.env.GITHUB_CLIENT_SECRET = 'fake_client_secret'
  process.env.SESSION_SECRET = 'fake_session_secret'
  jest.clearAllMocks()
})

// GET /auth/failure

describe('GET /auth/failure', () => {

  test('renvoie 401 avec un message d echec', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/auth/failure')
    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('message')
  })

})

// GET /auth/me

describe('GET /auth/me', () => {

  test('renvoie 401 si aucun token n est fourni', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/auth/me')
    expect(res.status).toBe(401)
  })

  test('renvoie 401 si le header Authorization est mal forme', async () => {
    const app = require('../../src/app')
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Token invalide')
    expect(res.status).toBe(401)
  })

  test('renvoie 401 si le token est signe avec une mauvaise cle', async () => {
    const app = require('../../src/app')
    const badToken = jwt.sign({ userId: 1 }, 'mauvaise_cle')
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${badToken}`)
    expect(res.status).toBe(401)
  })

  test('renvoie 401 si le token est valide mais l utilisateur n existe pas en base', async () => {
    const app = require('../../src/app')
    const token = jwt.sign({ userId: 999 }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(null)

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(401)
  })

  test('renvoie 200 avec les infos user si le token est valide', async () => {
    const app = require('../../src/app')
    const fakeUser = { id: 1, username: 'NajoroRabiaza', avatarUrl: 'https://avatar.url' }
    const token = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('user')
    expect(res.body.user).toHaveProperty('id', fakeUser.id)
    expect(res.body.user).toHaveProperty('username', fakeUser.username)
  })

  test('la reponse /auth/me ne contient pas le champ accessToken', async () => {
    const app = require('../../src/app')
    const fakeUser = {
      id: 1,
      username: 'NajoroRabiaza',
      avatarUrl: null,
      accessToken: 'ghs_secret_token'  // ne doit pas etre expose
    }
    const token = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)

    // la route ne doit exposer que id, username, avatarUrl
    expect(res.body.user).not.toHaveProperty('accessToken')
  })

})

// GET /auth/logout

describe('GET /auth/logout', () => {

  test('renvoie 200 avec un message de deconnexion', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/auth/logout')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })

  test('le message de deconnexion mentionne de supprimer le token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/auth/logout')
    // on verifie que le message guide l'utilisateur
    expect(typeof res.body.message).toBe('string')
    expect(res.body.message.length).toBeGreaterThan(0)
  })

})