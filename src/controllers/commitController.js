/**
 * Controller des commits et des fichiers modifiés.
 *
 * Gère la synchronisation des commits depuis GitHub, leur lecture paginée,
 * la synchronisation des fichiers d'un commit et la détection automatique
 * des concepts associés.
 *
 * Toutes les opérations vérifient que le dépôt et le commit appartiennent
 * bien à l'utilisateur connecté avant d'agir.
 */

const prisma = require('../utils/prisma')
const { getRepositoryCommits, getCommitDetail } = require('../services/githubService')
const { getPagination, paginatedResponse } = require('../utils/pagination')
const { detectConceptsFromCommit } = require('../services/conceptDetectionService')

const syncCommits = async (req, res) => {
  try {
    const { repoId } = req.params

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const [owner, repo] = repository.fullName.split('/')

    const commits = await getRepositoryCommits(
      req.user.accessToken,
      owner,
      repo
    )

    const savedCommits = []

    for (const commit of commits) {
      const saved = await prisma.commit.upsert({
        where: { sha: commit.sha },
        update: {
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          url: commit.url
        },
        create: {
          sha: commit.sha,
          message: commit.message,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          url: commit.url,
          repositoryId: repository.id
        }
      })
      savedCommits.push(saved)
    }

    await prisma.repository.update({
      where: { id: repository.id },
      data: { lastSyncedAt: new Date() }
    })

    res.json({
      message: `${savedCommits.length} commits synced`,
      commits: savedCommits
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const getCommits = async (req, res) => {
  try {
    const { repoId } = req.params
    const { page, limit, skip } = getPagination(req.query)
    const search = req.query.search || ''

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const where = {
      repositoryId: repository.id,
      ...(search && {
        message: {
          contains: search
        }
      })
    }

    const total = await prisma.commit.count({ where })

    const commits = await prisma.commit.findMany({
      where,
      orderBy: { committedAt: 'desc' },
      skip,
      take: limit
    })

    res.json(paginatedResponse(commits, total, page, limit))
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const syncCommitFiles = async (req, res) => {
  try {
    const { repoId, commitId } = req.params

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    const [owner, repo] = repository.fullName.split('/')

    const files = await getCommitDetail(
      req.user.accessToken,
      owner,
      repo,
      commit.sha
    )

    const savedFiles = []

    for (const file of files) {
      // upsert sur (commitId, filename) pour éviter les doublons
      // si cet endpoint est appelé plusieurs fois sur le même commit
      const saved = await prisma.commitFile.upsert({
        where: {
          commitId_filename: {
            commitId: commit.id,
            filename: file.filename
          }
        },
        update: {
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          // Le patch peut être très volumineux pour les gros fichiers.
          // On le tronque à 10 000 caractères pour éviter de saturer
          // la bdd et alourdir les réponses API.
          patch: file.patch ? file.patch.substring(0, 10000) : null
        },
        create: {
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch ? file.patch.substring(0, 10000) : null,
          commitId: commit.id
        }
      })
      savedFiles.push(saved)
    }

    const detectedConceptNames = detectConceptsFromCommit(commit.message, files)
    const linkedConcepts = []

    for (const conceptName of detectedConceptNames) {
      const concept = await prisma.concept.upsert({
        where: {
          name_userId: {
            name: conceptName,
            userId: req.user.id
          }
        },
        update: {},
        create: {
          name: conceptName,
          userId: req.user.id
        }
      })

      await prisma.commitConcept.upsert({
        where: {
          commitId_conceptId: {
            commitId: commit.id,
            conceptId: concept.id
          }
        },
        update: {},
        create: {
          commitId: commit.id,
          conceptId: concept.id
        }
      })

      linkedConcepts.push(conceptName)
    }

    res.json({
      message: `${savedFiles.length} files synced`,
      files: savedFiles,
      detectedConcepts: linkedConcepts
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

const getCommitFiles = async (req, res) => {
  try {
    const { repoId, commitId } = req.params

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'commit not found' })
    }

    const files = await prisma.commitFile.findMany({
      where: { commitId: commit.id }
    })

    res.json({ files })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: 'internal server error' })
  }
}

module.exports = { syncCommits, getCommits, syncCommitFiles, getCommitFiles }