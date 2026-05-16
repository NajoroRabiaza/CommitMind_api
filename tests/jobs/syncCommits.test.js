// tests unitaires pour le job de synchronisation automatique
// src/jobs/syncCommits.js exporte deux fonctions :
//   syncAllUsersCommits : boucle sur tous les users/repos et synchronise
//   startSyncJob        : planifie la tache cron toutes les heures
//
// on ne teste pas startSyncJob (ca planifierait une vraie tache cron)
// on teste directement syncAllUsersCommits avec des donnees mockees

jest.mock('../../src/utils/prisma', () => ({
  user: { findMany: jest.fn() },
  repository: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  commit: {
    findUnique: jest.fn(),
    create: jest.fn()
  }
}))

jest.mock('../../src/services/githubService', () => ({
  getRepositoryCommits: jest.fn()
}))

const prisma = require('../../src/utils/prisma')
const { getRepositoryCommits } = require('../../src/services/githubService')
const { syncAllUsersCommits } = require('../../src/jobs/syncCommits')

const fakeUser1 = { id: 1, username: 'NajoroRabiaza', accessToken: 'ghs_token1' }
const fakeUser2 = { id: 2, username: 'alice', accessToken: 'ghs_token2' }

const fakeRepo = {
  id: 10,
  fullName: 'NajoroRabiaza/commitmind',
  lastSyncedAt: null
}

const fakeGithubCommit = {
  sha: 'sha_new_001',
  message: 'feat: add jwt middleware',
  authorName: 'Eddie',
  authorEmail: 'eddie@test.com',
  committedAt: new Date('2026-05-01T10:00:00Z').toISOString(),
  url: 'https://github.com/commit/sha_new_001'
}

beforeEach(() => {
  jest.clearAllMocks()
  // on redefinit les mocks par defaut avant chaque test
  prisma.repository.update.mockResolvedValue(fakeRepo)
})

// Comportement de base

describe('syncAllUsersCommits - comportement de base', () => {

  test('ne fait rien si aucun utilisateur n est trouve', async () => {
    prisma.user.findMany.mockResolvedValue([])

    await syncAllUsersCommits()

    // si aucun user, on ne cherche pas de depots
    expect(prisma.repository.findMany).not.toHaveBeenCalled()
    expect(getRepositoryCommits).not.toHaveBeenCalled()
  })

  test('ne fait rien si l utilisateur n a aucun depot', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(getRepositoryCommits).not.toHaveBeenCalled()
    expect(prisma.commit.create).not.toHaveBeenCalled()
  })

  test('appelle getRepositoryCommits avec le bon token et le bon repo', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser1.accessToken,
      'NajoroRabiaza',
      'commitmind',
      fakeRepo.lastSyncedAt
    )
  })

  test('decompose correctement fullName en owner et repo', async () => {
    const repoWithDash = { ...fakeRepo, fullName: 'NajoroRabiaza/expense-tracker-api' }
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([repoWithDash])
    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser1.accessToken,
      'NajoroRabiaza',
      'expense-tracker-api',
      repoWithDash.lastSyncedAt
    )
  })

})

// Sauvegarde des nouveaux commits

describe('syncAllUsersCommits - sauvegarde des commits', () => {

  test('cree un commit si il n existe pas en base', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    // findUnique retourne null = le commit n'existe pas encore
    prisma.commit.findUnique.mockResolvedValue(null)
    prisma.commit.create.mockResolvedValue({ id: 1, ...fakeGithubCommit })

    await syncAllUsersCommits()

    expect(prisma.commit.create).toHaveBeenCalledTimes(1)
    expect(prisma.commit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sha: fakeGithubCommit.sha,
          message: fakeGithubCommit.message,
          repositoryId: fakeRepo.id
        })
      })
    )
  })

  test('ne cree pas de commit si il existe deja en base (deduplication)', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    // findUnique retourne un commit = il existe deja, on ne recrée pas
    prisma.commit.findUnique.mockResolvedValue({ id: 99, sha: fakeGithubCommit.sha })

    await syncAllUsersCommits()

    expect(prisma.commit.create).not.toHaveBeenCalled()
  })

  test('met a jour lastSyncedAt apres chaque sync de depot', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(prisma.repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: fakeRepo.id },
        data: expect.objectContaining({
          lastSyncedAt: expect.any(Date)
        })
      })
    )
  })

  test('identifie les commits par sha (findUnique avec sha)', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    prisma.commit.findUnique.mockResolvedValue(null)
    prisma.commit.create.mockResolvedValue({})

    await syncAllUsersCommits()

    expect(prisma.commit.findUnique).toHaveBeenCalledWith({
      where: { sha: fakeGithubCommit.sha }
    })
  })

})

// Resilience aux erreurs

describe('syncAllUsersCommits - resilience aux erreurs', () => {

  test('continue avec les autres depots si un depot echoue', async () => {
    const fakeRepo2 = { id: 11, fullName: 'NajoroRabiaza/second-repo', lastSyncedAt: null }
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo, fakeRepo2])

    // premier depot echoue
    getRepositoryCommits
      .mockRejectedValueOnce(new Error('GitHub API rate limit'))
      // deuxieme depot reussit
      .mockResolvedValueOnce([])

    // le job ne doit pas planter meme si un depot echoue
    await expect(syncAllUsersCommits()).resolves.not.toThrow()

    // on verifie que le deuxieme appel a quand meme ete fait
    expect(getRepositoryCommits).toHaveBeenCalledTimes(2)
  })

  test('continue avec les autres utilisateurs si la requete de repos echoue', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1, fakeUser2])

    // on fait planter findMany uniquement pour le premier utilisateur
    prisma.repository.findMany
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()
  })

  test('ne plante pas si github renvoie un tableau vide', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()

    expect(prisma.commit.create).not.toHaveBeenCalled()
  })

  test('ne plante pas si la liste des utilisateurs est vide', async () => {
    prisma.user.findMany.mockResolvedValue([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()
  })

})

// Multi-utilisateurs

describe('syncAllUsersCommits - plusieurs utilisateurs', () => {

  test('boucle sur tous les utilisateurs et leurs depots', async () => {
    const repo2 = { id: 20, fullName: 'alice/portfolio', lastSyncedAt: null }

    prisma.user.findMany.mockResolvedValue([fakeUser1, fakeUser2])
    prisma.repository.findMany
      .mockResolvedValueOnce([fakeRepo])  // depots de user1
      .mockResolvedValueOnce([repo2])     // depots de user2

    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    // on verifie que github a ete appele pour chaque utilisateur/depot
    expect(getRepositoryCommits).toHaveBeenCalledTimes(2)
    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser1.accessToken, 'NajoroRabiaza', 'commitmind', null
    )
    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser2.accessToken, 'alice', 'portfolio', null
    )
  })

})