const { Octokit } = require('@octokit/rest')

const createGithubClient = (accessToken) => {
  return new Octokit({
    auth: accessToken
  })
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

const getRepositoryCommits = async (accessToken, owner, repo) => {
  const octokit = createGithubClient(accessToken)

  const { data } = await octokit.repos.listCommits({
    owner: owner,
    repo: repo,
    per_page: 100
  })

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
  
	const { data } = await octokit.repos.getCommit({
	  owner: owner,
	  repo: repo,
	  ref: sha
	})
  
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