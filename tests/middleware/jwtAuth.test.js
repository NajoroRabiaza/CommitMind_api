// tests unitaires pour le middleware jwtAuth
// ce middleware protege les routes en verifiant
// la presence et la validite d'un token jwt
// dans le header Authorization de chaque requete
//
// strategie de test :
// on ne peut pas appeler l'api github ou la base de donnees dans ces tests
// on utilise donc jest.mock() pour remplacer les dependances reelles
// par des doubles de test (mocks) qu'on controle entierement
// ca permet de tester la logique du middleware en isolation

const jwt = require('jsonwebtoken')

// on mocke prisma avant meme d'importer le middleware
// car Node.js evalue les requires au moment du chargement
// si on ne mocke pas avant, le vrai client prisma s'initialiserait
jest.mock('../../src/utils/prisma', () => ({
  user: {
    findUnique: jest.fn()
  }
}))

const prisma = require('../../src/utils/prisma')
const jwtAuth = require('../../src/middleware/jwtAuth')

// helper : construire un objet req minimal pour simuler une requete express
// on n'a besoin que du header authorization dans ces tests
const buildReq = (authHeader) => ({
  headers: {
    authorization: authHeader
  }
})

// helper : construire un objet res minimal avec les methodes chainables
// express utilise res.status(401).json({...}) avec du chaining
// on doit donc simuler ce comportement
const buildRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

// on definit une cle secrete fixe pour les tests
// en production cette valeur vient de process.env.JWT_SECRET
const TEST_SECRET = 'test_secret_for_jest'

beforeEach(() => {
  // on redefini la variable d'environnement avant chaque test
  // pour garantir que tous les tests utilisent la meme cle
  process.env.JWT_SECRET = TEST_SECRET

  // on remet tous les mocks a zero avant chaque test
  // pour eviter que les appels d'un test precedent
  // influencent le test suivant
  jest.clearAllMocks()
})

//  Cas : header Authorization absent ou mal forme

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
    // next ne doit pas etre appele si l'auth echoue
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

    // le token extrait sera undefined ou une chaine vide
    // jwt.verify lancera une erreur, le catch renverra 401
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

})

// Cas : token invalide ou expire

describe('jwtAuth - token invalide ou expire', () => {

  test('renvoie 401 si le token est signe avec une mauvaise cle', async () => {
    // on signe avec une cle differente de celle du middleware
    const badToken = jwt.sign({ userId: 1 }, 'mauvaise_cle_secrete')
    const req = buildReq(`Bearer ${badToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  test('renvoie 401 si le token est expire', async () => {
    // expiresIn: '0s' cree un token qui expire immediatement
    const expiredToken = jwt.sign(
      { userId: 1 },
      TEST_SECRET,
      { expiresIn: '0s' }
    )
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

// Cas : token valide mais utilisateur introuvable en base

describe('jwtAuth - token valide mais utilisateur absent de la base', () => {

  test('renvoie 401 si prisma ne trouve pas l utilisateur', async () => {
    const validToken = jwt.sign({ userId: 999 }, TEST_SECRET)
    // on simule le cas ou l'utilisateur a ete supprime apres connexion
    prisma.user.findUnique.mockResolvedValue(null)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    )
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

// Cas : token valide et utilisateur trouve

describe('jwtAuth - authentification reussie', () => {

  test('appelle next() si le token est valide et l utilisateur existe', async () => {
    const fakeUser = { id: 1, username: 'NajoroRabiaza', avatarUrl: 'https://...' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    // next doit etre appele sans argument
    expect(next).toHaveBeenCalledWith()
  })

  test('attache l utilisateur a req.user apres validation reussie', async () => {
    const fakeUser = { id: 7, username: 'testuser', avatarUrl: null }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    // apres le middleware, req.user doit etre l'utilisateur complet
    // les controllers qui suivent pourront faire req.user.id sans probleme
    expect(req.user).toEqual(fakeUser)
  })

  test('ne modifie pas res si le token est valide', async () => {
    const fakeUser = { id: 3, username: 'alice' }
    const validToken = jwt.sign({ userId: fakeUser.id }, TEST_SECRET)
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    // res.status et res.json ne doivent pas avoir ete appeles
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).not.toHaveBeenCalled()
  })

  test('fonctionne avec un token contenant un userId numerique', async () => {
    const fakeUser = { id: 100, username: 'bob' }
    const validToken = jwt.sign({ userId: 100 }, TEST_SECRET, { expiresIn: '7d' })
    prisma.user.findUnique.mockResolvedValue(fakeUser)

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(req.user.id).toBe(100)
  })

})

// Cas : erreur inattendue de prisma

describe('jwtAuth - erreurs systeme', () => {

  test('renvoie 401 si prisma lance une erreur inattendue', async () => {
    const validToken = jwt.sign({ userId: 1 }, TEST_SECRET)
    // on simule une erreur de connexion a la base de donnees
    prisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'))

    const req = buildReq(`Bearer ${validToken}`)
    const res = buildRes()
    const next = jest.fn()

    await jwtAuth(req, res, next)

    // le catch du middleware doit attraper cette erreur
    // et renvoyer 401 sans planter le serveur
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

})