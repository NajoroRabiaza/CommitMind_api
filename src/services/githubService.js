/**
 * Service de communication avec l'API GitHub via Octokit.
 *
 * Centralise tous les appels reseau vers GitHub. Les controllers
 * n'appellent jamais l'API GitHub directement, ils passent toujours
 * par ce fichier. Cela facilite les tests (on mocke ce service)
 * et isole les details d'implementation d'Octokit du reste du code.
 */

const { Octokit } = require('@octokit/rest')

const createGithubClient = (accessToken) => {
  return new Octokit({ auth: accessToken })
}

const getUserRepositories = async (accessToken) => {
  const octokit = createGithubClient(accessToken)

  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  })

  return data.map((repo) => ({
    githubId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private
  }))
}

/**
 * Recupere les commits d'un depot depuis GitHub.
 *
 * Le parametre "since" permet de ne recuperer que les commits
 * posterieurs a la derniere synchronisation, evitant ainsi de
 * retraiter des commits deja connus en base.
 */
const getRepositoryCommits = async (accessToken, owner, repo, since = null) => {
  const octokit = createGithubClient(accessToken)

  const params = { owner, repo, per_page: 100 }

  if (since) {
    params.since = since.toISOString()
  }

  const { data } = await octokit.repos.listCommits(params)

  return data.map((commit) => ({
    sha: commit.sha,
    message: commit.commit.message,
    authorName: commit.commit.author.name,
    authorEmail: commit.commit.author.email,
    committedAt: new Date(commit.commit.author.date),
    url: commit.html_url
  }))
}

const getCommitDetail = async (accessToken, owner, repo, sha) => {
  const octokit = createGithubClient(accessToken)

  const { data } = await octokit.repos.getCommit({ owner, repo, ref: sha })

  return data.files.map((file) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch || null
  }))
}

module.exports = {
  createGithubClient,
  getUserRepositories,
  getRepositoryCommits,
  getCommitDetail
}