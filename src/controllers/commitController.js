const prisma = require('../utils/prisma')
const { getRepositoryCommits, getCommitDetail } = require('../services/githubService')
const { getPagination, paginatedResponse } = require('../utils/pagination')

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
      return res.status(404).json({ message: 'Repository not found' })
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
    res.status(500).json({ message: error.message })
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
      return res.status(404).json({ message: 'Repository not found' })
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
    res.status(500).json({ message: error.message })
  }
}

const syncCommitFiles = async (req, res) => {
  try {
    const { repoId, commitId } = req.params
    const { detectConceptsFromCommit } = require('../services/conceptDetectionService')

    const repository = await prisma.repository.findFirst({
      where: {
        id: parseInt(repoId),
        userId: req.user.id
      }
    })

    if (!repository) {
      return res.status(404).json({ message: 'Repository not found' })
    }

    const commit = await prisma.commit.findFirst({
      where: {
        id: parseInt(commitId),
        repositoryId: repository.id
      }
    })

    if (!commit) {
      return res.status(404).json({ message: 'Commit not found' })
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
      const saved = await prisma.commitFile.create({
        data: {
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
          commitId: commit.id
        }
      })
      savedFiles.push(saved)
    }

    // Détection automatique des concepts
    const detectedConceptNames = detectConceptsFromCommit(commit.message, files)
    const linkedConcepts = []

    for (const conceptName of detectedConceptNames) {
      // Créer le concept s'il n'existe pas encore
      const concept = await prisma.concept.upsert({
        where: {
          // On utilise name + userId comme identifiant unique
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

      // Lier le concept au commit
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
    res.status(500).json({ message: error.message })
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
        return res.status(404).json({ message: 'Repository not found' })
      }
  
      const commit = await prisma.commit.findFirst({
        where: {
          id: parseInt(commitId),
          repositoryId: repository.id
        }
      })
  
      if (!commit) {
        return res.status(404).json({ message: 'Commit not found' })
      }
  
      const files = await prisma.commitFile.findMany({
        where: { commitId: commit.id }
      })
  
      res.json({ files })
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }

  module.exports = { syncCommits, getCommits, syncCommitFiles, getCommitFiles }