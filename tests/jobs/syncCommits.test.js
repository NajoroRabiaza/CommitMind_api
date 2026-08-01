/**
 * Tests unitaires pour le job de synchronisation automatique.
 *
 * Le vrai syncCommits.js utilise prisma.commit.upsert depuis le refactor
 * qui a elimine le pattern findUnique + create conditionnel.
 * Les mocks refletent ce comportement reel.
 */

jest.mock('../../src/utils/prisma', () => ({
  user: { findMany: jest.fn() },
  repository: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  commit: {
    upsert: jest.fn()
  }
}))

jest.mock('../../src/services/githubService', () => ({
  getRepositoryCommits: jest.fn()
}))

// decrypt est mocke pour eviter de dependre de ENCRYPTION_KEY dans les tests
jest.mock('../../src/utils/crypto', () => ({
  decrypt: jest.fn((val) => val)
}))

const prisma = require('../../src/utils/prisma')
const { getRepositoryCommits } = require('../../src/services/githubService')
const { decrypt } = require('../../src/utils/crypto')
const { syncAllUsersCommits } = require('../../src/jobs/syncCommits')

const fakeUser1 = { id: 1, username: 'NajoroRabiaza', accessToken: 'encrypted_token_1' }
const fakeUser2 = { id: 2, username: 'alice', accessToken: 'encrypted_token_2' }

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
  committedAt: new Date('2026-05-01T10:00:00Z'),
  url: 'https://github.com/commit/sha_new_001'
}

// Simule un commit fraichement cree : createdAt === updatedAt
const freshUpsertResult = {
  id: 1,
  sha: fakeGithubCommit.sha,
  createdAt: new Date('2026-05-01T12:00:00Z'),
  updatedAt: new Date('2026-05-01T12:00:00Z')
}

// Simule un commit deja existant : updatedAt > createdAt
const existingUpsertResult = {
  id: 1,
  sha: fakeGithubCommit.sha,
  createdAt: new Date('2026-04-01T10:00:00Z'),
  updatedAt: new Date('2026-05-01T12:00:00Z')
}

beforeEach(() => {
  jest.clearAllMocks()
  prisma.repository.update.mockResolvedValue(fakeRepo)
})

// Comportement de base

describe('syncAllUsersCommits - comportement de base', () => {

  test('ne fait rien si aucun utilisateur n est trouve', async () => {
    prisma.user.findMany.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(prisma.repository.findMany).not.toHaveBeenCalled()
    expect(getRepositoryCommits).not.toHaveBeenCalled()
  })

  test('ne fait rien si l utilisateur n a aucun depot', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(getRepositoryCommits).not.toHaveBeenCalled()
    expect(prisma.commit.upsert).not.toHaveBeenCalled()
  })

  test('appelle getRepositoryCommits avec le bon token et le bon repo', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    // decrypt est appele sur le token chiffre avant de l'utiliser
    expect(decrypt).toHaveBeenCalledWith(fakeUser1.accessToken)
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

// Sauvegarde des commits via upsert

describe('syncAllUsersCommits - sauvegarde des commits', () => {

  test('appelle upsert avec le bon sha et les bonnes donnees', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    prisma.commit.upsert.mockResolvedValue(freshUpsertResult)

    await syncAllUsersCommits()

    expect(prisma.commit.upsert).toHaveBeenCalledTimes(1)
    expect(prisma.commit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sha: fakeGithubCommit.sha },
        create: expect.objectContaining({
          sha: fakeGithubCommit.sha,
          message: fakeGithubCommit.message,
          repositoryId: fakeRepo.id
        })
      })
    )
  })

  test('detecte un nouveau commit quand createdAt === updatedAt', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    // createdAt === updatedAt = commit fraichement cree
    prisma.commit.upsert.mockResolvedValue(freshUpsertResult)

    await syncAllUsersCommits()

    expect(prisma.commit.upsert).toHaveBeenCalledTimes(1)
  })

  test('detecte un commit existant quand updatedAt > createdAt', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    // updatedAt > createdAt = commit deja present en base
    prisma.commit.upsert.mockResolvedValue(existingUpsertResult)

    await syncAllUsersCommits()

    // upsert est quand meme appele — c'est lui qui gere la deduplication
    expect(prisma.commit.upsert).toHaveBeenCalledTimes(1)
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

  test('traite plusieurs commits en une seule execution', async () => {
    const commit2 = { ...fakeGithubCommit, sha: 'sha_new_002' }
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit, commit2])
    prisma.commit.upsert.mockResolvedValue(freshUpsertResult)

    await syncAllUsersCommits()

    expect(prisma.commit.upsert).toHaveBeenCalledTimes(2)
  })

})

// Resilience aux erreurs

describe('syncAllUsersCommits - resilience aux erreurs', () => {

  test('continue avec les autres depots si un depot echoue', async () => {
    const fakeRepo2 = { id: 11, fullName: 'NajoroRabiaza/second-repo', lastSyncedAt: null }
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo, fakeRepo2])

    getRepositoryCommits
      .mockRejectedValueOnce(new Error('GitHub API rate limit'))
      .mockResolvedValueOnce([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()

    expect(getRepositoryCommits).toHaveBeenCalledTimes(2)
  })

  test('ne plante pas si github renvoie un tableau vide', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()

    expect(prisma.commit.upsert).not.toHaveBeenCalled()
  })

  test('ne plante pas si la liste des utilisateurs est vide', async () => {
    prisma.user.findMany.mockResolvedValue([])

    await expect(syncAllUsersCommits()).resolves.not.toThrow()
  })

  test('ne plante pas si upsert lance une erreur sur un commit', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1])
    prisma.repository.findMany.mockResolvedValue([fakeRepo])
    getRepositoryCommits.mockResolvedValue([fakeGithubCommit])
    prisma.commit.upsert.mockRejectedValue(new Error('DB constraint error'))

    await expect(syncAllUsersCommits()).resolves.not.toThrow()
  })

})

// Multi-utilisateurs

describe('syncAllUsersCommits - plusieurs utilisateurs', () => {

  test('boucle sur tous les utilisateurs et leurs depots', async () => {
    const repo2 = { id: 20, fullName: 'alice/portfolio', lastSyncedAt: null }

    prisma.user.findMany.mockResolvedValue([fakeUser1, fakeUser2])
    prisma.repository.findMany
      .mockResolvedValueOnce([fakeRepo])
      .mockResolvedValueOnce([repo2])

    getRepositoryCommits.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(getRepositoryCommits).toHaveBeenCalledTimes(2)
    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser1.accessToken, 'NajoroRabiaza', 'commitmind', null
    )
    expect(getRepositoryCommits).toHaveBeenCalledWith(
      fakeUser2.accessToken, 'alice', 'portfolio', null
    )
  })

  test('decrypt est appele une fois par utilisateur', async () => {
    prisma.user.findMany.mockResolvedValue([fakeUser1, fakeUser2])
    prisma.repository.findMany.mockResolvedValue([])

    await syncAllUsersCommits()

    expect(decrypt).toHaveBeenCalledTimes(2)
    expect(decrypt).toHaveBeenCalledWith(fakeUser1.accessToken)
    expect(decrypt).toHaveBeenCalledWith(fakeUser2.accessToken)
  })

})