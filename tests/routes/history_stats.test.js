// tests des routes /history et /stats
// ces deux routes sont des routes de lecture seule
// elles n'ont pas de body a valider mais elles
// supportent des query params optionnels
//
// GET /history?search=&month=&concept=
// GET /stats

const request = require('supertest')
const jwt = require('jsonwebtoken')

jest.mock('../../src/utils/prisma', () => ({
  user: { findUnique: jest.fn() },
  commit: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  repository: {
    count: jest.fn(),
    findMany: jest.fn()
  },
  concept: {
    count: jest.fn(),
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

// GET /history

describe('GET /history', () => {

  const historyCommits = [
    {
      id: 1,
      sha: 'abc',
      message: 'feat: add jwt auth',
      committedAt: new Date('2026-05-10T09:00:00Z'),
      repository: { name: 'commitmind' },
      concepts: [{ concept: { id: 2, name: 'JWT Authentication' } }],
      files: [{ id: 1 }, { id: 2 }]
    },
    {
      id: 2,
      sha: 'def',
      message: 'fix: correct pagination skip',
      committedAt: new Date('2026-05-12T14:00:00Z'),
      repository: { name: 'commitmind' },
      concepts: [],
      files: []
    }
  ]

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/history')
    expect(res.status).toBe(401)
  })

  test('renvoie 200 avec une timeline groupee par mois', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue(historyCommits)

    const res = await request(app)
      .get('/history')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('timeline')
    expect(Array.isArray(res.body.timeline)).toBe(true)
  })

  test('la reponse contient totalCommits et totalMonths', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue(historyCommits)

    const res = await request(app)
      .get('/history')
      .set(bearer())

    expect(res.body).toHaveProperty('totalCommits')
    expect(res.body).toHaveProperty('totalMonths')
  })

  test('la reponse contient les filtres appliques', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/history?search=jwt&month=2026-05')
      .set(bearer())

    expect(res.body).toHaveProperty('filters')
    expect(res.body.filters).toHaveProperty('search', 'jwt')
    expect(res.body.filters).toHaveProperty('month', '2026-05')
  })

  test('retourne une timeline vide si aucun commit', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/history')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body.timeline).toEqual([])
    expect(res.body.totalCommits).toBe(0)
  })

  test('chaque entree de la timeline a month, totalCommits et commits', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue(historyCommits)

    const res = await request(app)
      .get('/history')
      .set(bearer())

    if (res.body.timeline.length > 0) {
      const entry = res.body.timeline[0]
      expect(entry).toHaveProperty('month')
      expect(entry).toHaveProperty('totalCommits')
      expect(entry).toHaveProperty('commits')
      expect(Array.isArray(entry.commits)).toBe(true)
    }
  })

  test('fonctionne avec le query param ?concept=jwt', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockResolvedValue([])

    const res = await request(app)
      .get('/history?concept=jwt')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body.filters.concept).toBe('jwt')
  })

  test('renvoie 500 si prisma lance une erreur', async () => {
    const app = require('../../src/app')
    prisma.commit.findMany.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .get('/history')
      .set(bearer())

    expect(res.status).toBe(500)
  })

})

// GET /stats

describe('GET /stats', () => {

  const mockStatsSetup = () => {
    prisma.commit.count.mockResolvedValue(42)
    prisma.repository.count.mockResolvedValue(5)
    prisma.concept.count.mockResolvedValue(18)
    prisma.commit.findMany.mockResolvedValue([
      { committedAt: new Date('2026-03-10T10:00:00Z') },
      { committedAt: new Date('2026-03-15T14:00:00Z') },
      { committedAt: new Date('2026-04-02T09:00:00Z') }
    ])
    prisma.concept.findMany.mockResolvedValue([
      { id: 1, name: 'JWT Authentication', _count: { commits: 12 } },
      { id: 2, name: 'Prisma ORM', _count: { commits: 8 } }
    ])
    prisma.repository.findMany.mockResolvedValue([
      { id: 10, name: 'commitmind', _count: { commits: 30 } }
    ])
  }

  test('renvoie 401 sans token', async () => {
    const app = require('../../src/app')
    const res = await request(app).get('/stats')
    expect(res.status).toBe(401)
  })

  test('renvoie 200 avec l overview', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('overview')
  })

  test('l overview contient totalCommits, totalRepositories, totalConcepts', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    expect(res.body.overview).toHaveProperty('totalCommits', 42)
    expect(res.body.overview).toHaveProperty('totalRepositories', 5)
    expect(res.body.overview).toHaveProperty('totalConcepts', 18)
  })

  test('la reponse contient commitsByMonth, topConcepts, topRepositories', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    expect(res.body).toHaveProperty('commitsByMonth')
    expect(res.body).toHaveProperty('topConcepts')
    expect(res.body).toHaveProperty('topRepositories')
  })

  test('commitsByMonth est un tableau trie chronologiquement', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    const months = res.body.commitsByMonth
    expect(Array.isArray(months)).toBe(true)

    // verifier l'ordre chronologique
    for (let i = 1; i < months.length; i++) {
      expect(months[i].month >= months[i - 1].month).toBe(true)
    }
  })

  test('chaque entree de commitsByMonth a month et count', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    res.body.commitsByMonth.forEach(entry => {
      expect(entry).toHaveProperty('month')
      expect(entry).toHaveProperty('count')
      expect(typeof entry.month).toBe('string')
      expect(typeof entry.count).toBe('number')
    })
  })

  test('chaque concept dans topConcepts a id, name, totalCommits', async () => {
    const app = require('../../src/app')
    mockStatsSetup()

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    res.body.topConcepts.forEach(c => {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(c).toHaveProperty('totalCommits')
    })
  })

  test('renvoie 500 si prisma lance une erreur', async () => {
    const app = require('../../src/app')
    prisma.commit.count.mockRejectedValue(new Error('DB error'))

    const res = await request(app)
      .get('/stats')
      .set(bearer())

    expect(res.status).toBe(500)
  })

})