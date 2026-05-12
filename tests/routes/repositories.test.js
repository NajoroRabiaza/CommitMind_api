// tests des routes /repositories
// on verifie :
//   POST /repositories/sync : synchronise les depots depuis github
//   GET  /repositories      : liste les depots pagines
//
// toutes ces routes sont protegees par jwtAuth
// un token valide est donc necesaire pour chaque requete

const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../src/utils/prisma', () => ({
  user: { findUnique: jest.fn() },
  repository: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  }
}))

jest.mock('../../src/services/githubService', () => ({
  getUserRepositories: jest.fn()
}))

jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => next()),
  initialize: jest.fn(() => (req, res, next) => next()),
  use: jest.fn()
}))

const prisma = require('../../src/utils/prisma')
const { getUserRepositories } = require('../../src/services/githubService')

const TEST_SECRET = 'test_secret_jest'

const fakeUser = {
  id: 1,
  username: 'NajoroRabiaza',
  avatarUrl: null,
  accessToken: 'ghs_fake_token'
}

const makeToken = (userId = fakeUser.id) =>
  jwt.sign({ userId }, TEST_SECRET)

const authHeader = (token) => ({ Authorization: `Bearer ${token}` })

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
  process.env.GITHUB_CLIENT_ID = 'fake'
  process.env.GITHUB_CLIENT_SECRET = 'fake'
  process.env.SESSION_SECRET = 'fake'
  jest.clearAllMocks()
  // par defaut, jwtAuth trouve l'utilisateur
  prisma.user.findUnique.mockResolvedValue(fakeUser)
})

// POST /repositories/sync

describe('POST /repositories/sync', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).post('/repositories/sync')
    expect(res.status).toBe(401)
  })

  test('synchronise les depots et renvoie 200', async () => {
    const app = require('../../src/app')
    const fakeRepos = [
      { githubId: 100, name: 'commitmind', fullName: 'NajoroRabiaza/commitmind', description: null, private: false },
      { githubId: 101, name: 'expense-tracker', fullName: 'NajoroRabiaza/expense-tracker', description: null, private: false }
    ]

    getUserRepositories.mockResolvedValue(fakeRepos)
    prisma.repository.upsert.mockImplementation(async ({ create }) => create)

    const res = await request(app)
      .post('/repositories/sync')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
    expect(res.body).toHaveProperty('repositories')
    expect(Array.isArray(res.body.repositories)).toBe(true)
  })

  test('renvoie le bon nombre de depots synchronises', async () => {
    const app = require('../../src/app')
    const fakeRepos = [
      { githubId: 1, name: 'repo1', fullName: 'user/repo1', description: null, private: false },
      { githubId: 2, name: 'repo2', fullName: 'user/repo2', description: null, private: true }
    ]

    getUserRepositories.mockResolvedValue(fakeRepos)
    prisma.repository.upsert.mockImplementation(async ({ create }) => create)

    const res = await request(app)
      .post('/repositories/sync')
      .set(authHeader(makeToken()))

    expect(res.body.repositories.length).toBe(2)
  })

  test('renvoie 500 si githubService lance une erreur', async () => {
    const app = require('../../src/app')
    getUserRepositories.mockRejectedValue(new Error('GitHub API error'))

    const res = await request(app)
      .post('/repositories/sync')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(500)
  })

})

// GET /repositories

describe('GET /repositories', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/repositories')
    expect(res.status).toBe(401)
  })

  test('renvoie 200 avec les depots pagines', async () => {
    const app = require('../../src/app')
    const fakeRepos = [
      { id: 1, name: 'commitmind', fullName: 'NajoroRabiaza/commitmind' }
    ]

    prisma.repository.count.mockResolvedValue(1)
    prisma.repository.findMany.mockResolvedValue(fakeRepos)

    const res = await request(app)
      .get('/repositories')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('pagination')
  })

  test('la reponse contient les metadonnees de pagination', async () => {
    const app = require('../../src/app')
    prisma.repository.count.mockResolvedValue(5)
    prisma.repository.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/repositories?page=1&limit=2')
      .set(authHeader(makeToken()))

    expect(res.body.pagination).toHaveProperty('total', 5)
    expect(res.body.pagination).toHaveProperty('page', 1)
    expect(res.body.pagination).toHaveProperty('limit', 2)
    expect(res.body.pagination).toHaveProperty('totalPages')
  })

  test('renvoie 200 avec un tableau vide si aucun depot', async () => {
    const app = require('../../src/app')
    prisma.repository.count.mockResolvedValue(0)
    prisma.repository.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/repositories')
      .set(authHeader(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })

})