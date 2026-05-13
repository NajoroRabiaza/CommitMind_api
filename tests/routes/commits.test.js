// tests des routes liees aux commits
// routes couvertes :
//   POST /repositories/:repoId/commits/sync
//   GET  /repositories/:repoId/commits
//   POST /repositories/:repoId/commits/:commitId/files/sync
//   GET  /repositories/:repoId/commits/:commitId/files
//   POST /repositories/:repoId/commits/:commitId/concepts     (liaison manuelle)
//   POST /repositories/:repoId/commits/:commitId/concepts/auto

const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../src/utils/prisma', () => ({
  user: { findUnique: jest.fn() },
  repository: { findFirst: jest.fn() },
  commit: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn()
  },
  commitFile: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  concept: { upsert: jest.fn(), findFirst: jest.fn() },
  commitConcept: { upsert: jest.fn() }
}))

jest.mock('../../src/services/githubService', () => ({
  getRepositoryCommits: jest.fn(),
  getCommitDetail: jest.fn()
}))

jest.mock('../../src/services/conceptDetectionService', () => ({
  detectConceptsFromCommit: jest.fn().mockReturnValue([])
}))

jest.mock('passport', () => ({
  authenticate: jest.fn(() => (req, res, next) => next()),
  initialize: jest.fn(() => (req, res, next) => next()),
  use: jest.fn()
}))

const prisma = require('../../src/utils/prisma')
const { getRepositoryCommits, getCommitDetail } = require('../../src/services/githubService')

const TEST_SECRET = 'test_secret_jest'
const fakeUser = { id: 1, username: 'NajoroRabiaza', accessToken: 'ghs_token' }
const fakeRepo = { id: 10, name: 'commitmind', fullName: 'NajoroRabiaza/commitmind', userId: 1 }
const fakeCommit = { id: 5, sha: 'abc123', message: 'feat: add jwt auth', repositoryId: 10 }

const makeToken = () => jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
const bearer = (token) => ({ Authorization: `Bearer ${token}` })

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
  process.env.GITHUB_CLIENT_ID = 'fake'
  process.env.GITHUB_CLIENT_SECRET = 'fake'
  process.env.SESSION_SECRET = 'fake'
  jest.clearAllMocks()
  prisma.user.findUnique.mockResolvedValue(fakeUser)
})

// POST /repositories/:repoId/commits/sync

describe('POST /repositories/:repoId/commits/sync', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).post('/repositories/10/commits/sync')
    expect(res.status).toBe(401)
  })

  test('renvoie 404 si le depot n appartient pas a l utilisateur', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/repositories/99/commits/sync')
      .set(bearer(makeToken()))

    expect(res.status).toBe(404)
  })

  test('synchronise les commits et renvoie 200', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)

    const githubCommits = [
      {
        sha: 'sha1',
        message: 'feat: first commit',
        authorName: 'Eddie',
        authorEmail: 'eddie@test.com',
        committedAt: new Date().toISOString(),
        url: 'https://github.com/...'
      }
    ]
    getRepositoryCommits.mockResolvedValue(githubCommits)
    prisma.commit.upsert.mockImplementation(async ({ create }) => create)
    prisma.repository.update = jest.fn().mockResolvedValue(fakeRepo)

    const res = await request(app)
      .post('/repositories/10/commits/sync')
      .set(bearer(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('commits')
  })

})

// GET /repositories/:repoId/commits

describe('GET /repositories/:repoId/commits', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/repositories/10/commits')
    expect(res.status).toBe(401)
  })

  test('renvoie 404 si le depot est introuvable', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/repositories/99/commits')
      .set(bearer(makeToken()))

    expect(res.status).toBe(404)
  })

  test('renvoie 200 avec les commits pagines', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.count.mockResolvedValue(3)
    prisma.commit.findMany.mockResolvedValue([fakeCommit])

    const res = await request(app)
      .get('/repositories/10/commits')
      .set(bearer(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body).toHaveProperty('pagination')
  })

  test('renvoie 200 avec pagination correcte', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.count.mockResolvedValue(25)
    prisma.commit.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/repositories/10/commits?page=2&limit=10')
      .set(bearer(makeToken()))

    expect(res.body.pagination.page).toBe(2)
    expect(res.body.pagination.total).toBe(25)
  })

})

// GET /repositories/:repoId/commits/:commitId/files

describe('GET /repositories/:repoId/commits/:commitId/files', () => {

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/repositories/10/commits/5/files')
    expect(res.status).toBe(401)
  })

  test('renvoie 404 si le commit est introuvable', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .get('/repositories/10/commits/99/files')
      .set(bearer(makeToken()))

    expect(res.status).toBe(404)
  })

  test('renvoie 200 avec la liste des fichiers', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.findFirst.mockResolvedValue(fakeCommit)
    prisma.commitFile.findMany.mockResolvedValue([
      { id: 1, filename: 'src/app.js', status: 'modified', additions: 5, deletions: 2 }
    ])

    const res = await request(app)
      .get('/repositories/10/commits/5/files')
      .set(bearer(makeToken()))

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('files')
    expect(Array.isArray(res.body.files)).toBe(true)
  })

})

// POST /repositories/:repoId/commits/:commitId/concepts

describe('POST /repositories/:repoId/commits/:commitId/concepts (liaison manuelle)', () => {

  test('renvoie 400 si conceptId est absent du body', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.findFirst.mockResolvedValue(fakeCommit)

    const res = await request(app)
      .post('/repositories/10/commits/5/concepts')
      .set(bearer(makeToken()))
      .send({})

    expect(res.status).toBe(400)
  })

  test('renvoie 404 si le concept n appartient pas a l utilisateur', async () => {
    const app = require('../../src/app')
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.findFirst.mockResolvedValue(fakeCommit)
    prisma.concept.findFirst.mockResolvedValue(null)

    const res = await request(app)
      .post('/repositories/10/commits/5/concepts')
      .set(bearer(makeToken()))
      .send({ conceptId: 999 })

    expect(res.status).toBe(404)
  })

  test('renvoie 201 si le lien est cree avec succes', async () => {
    const app = require('../../src/app')
    const fakeConcept = { id: 3, name: 'JWT Authentication', userId: 1 }
    prisma.repository.findFirst.mockResolvedValue(fakeRepo)
    prisma.commit.findFirst.mockResolvedValue(fakeCommit)
    prisma.concept.findFirst.mockResolvedValue(fakeConcept)
    prisma.commitConcept.upsert.mockResolvedValue({ commitId: 5, conceptId: 3 })

    const res = await request(app)
      .post('/repositories/10/commits/5/concepts')
      .set(bearer(makeToken()))
      .send({ conceptId: 3 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('message')
  })

})