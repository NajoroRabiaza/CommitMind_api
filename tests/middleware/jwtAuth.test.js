/**
 * Tests unitaires pour le middleware jwtAuth.
 *
 * Strategie : toutes les dependances externes (prisma, crypto) sont mockees
 * pour tester la logique du middleware en isolation totale.
 */

const jwt = require('jsonwebtoken')

jest.mock('../../src/utils/prisma', () => ({
  user: {
    findUnique: jest.fn()
  }
}))
 
// crypto.js est mocke car jwtAuth appelle decrypt(user.accessToken).
// Sans ce mock, decrypt() tenterait de dechiffrer un token en clair
// et leverait une erreur de format, faisant echouer tous les tests.
jest.mock('../../src/utils/crypto', () => ({
  decrypt: jest.fn((val) => val)
}))

const prisma = require('../../src/utils/prisma')
const jwtAuth = require('../../src/middleware/jwtAuth')

const buildReq = (authHeader) => ({
  headers: { authorization: authHeader }
})

const buildRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const TEST_SECRET = 'test_secret_for_jest'

beforeEach(() => {
  process.env.JWT_SECRET = TEST_SECRET
  jest.clearAllMocks()
})

// Header Authorization absent ou mal forme

describe('jwtAuth - header manquant ou invalide', () => {

  test('renvoie 401 si le header Authorization est absent', async () => {
    const req = buildReq(undefined)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    )
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le header ne commence pas par "Bearer "', async () => {
    const req = buildReq('Token mon_token_ici')
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le header est une chaine vide', async () => {
    const req = buildReq('')
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le header est "Bearer" sans espace ni token', async () => {
    const req = buildReq('Bearer')
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

})

// Token invalide ou expire

describe('jwtAuth - token invalide ou expire', () => {

  test('renvoie 401 si le token est signe avec une mauvaise cle', async () => {
    const badToken = jwt.sign({ userId: 1 }, 'mauvaise_cle_secrete')
    const req = buildReq(`Bearer ${badToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le token est expire', async () => {
    const expiredToken = jwt.sign({ userId: 1 }, TEST_SECRET, { expiresIn: '0s' })
    const req = buildReq(`Bearer ${expiredToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le token est une chaine aleatoire invalide', async () => {
    const req = buildReq('Bearer ceciNestPasUnTokenJwt')
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

})

// Token valide mais utilisateur introuvable

describe('jwtAuth - token valide mais utilisateur absent de la base', () => {

  test('renvoie 401 si prisma ne trouve pas l utilisateur', async () => {
    const validToken = jwt.sign({ userId: 999 }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(null)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('prisma.user.findUnique est appele avec le bon userId', async () => {
    const userId = 42
    const validToken = jwt.sign({ userId }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(null)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId }
    })
  })

})

// Authentification reussie

describe('jwtAuth - authentification reussie', () => {

  test('appelle next() si le token est valide et l utilisateur existe', async () => {
    const fakeUser = { id: 1, username: 'NajoroRabiaza', accessToken: 'encrypted_token' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })

  test('attache l utilisateur a req.user apres validation reussie', async () => {
    const fakeUser = { id: 7, username: 'testuser', accessToken: 'encrypted_token' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(req.user).toBeDefined()
    expect(req.user.id).toBe(fakeUser.id)
    expect(req.user.username).toBe(fakeUser.username)
  })

  test('decrypt est appele sur l accessToken de l utilisateur', async () => {
    const { decrypt } = require('../../src/utils/crypto')
    const fakeUser = { id: 3, username: 'alice', accessToken: 'encrypted_token' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(decrypt).toHaveBeenCalledWith(fakeUser.accessToken)
  })

  test('ne modifie pas res si le token est valide', async () => {
    const fakeUser = { id: 3, username: 'alice', accessToken: 'encrypted_token' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

})

// Erreurs systeme

describe('jwtAuth - erreurs systeme', () => {

  test('renvoie 401 si prisma lance une erreur inattendue', async () => {
    const validToken = jwt.sign({ userId: 1 }, TEST_SECRET)
    prisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'))

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

})