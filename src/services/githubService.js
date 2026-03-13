const { Octokit } = require('@octokit/rest');
const createGithubClient = (accessToken) => {
	return new Octokit({
		auth: accessToken
	})
}

const getUserRepositories = async (accessToken) => {
	const octokit = createGithubClient(accessToken);
	const {data} = await octokit.repos.listForAuthenticatedUser({
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
module.exports= {createGithubClient, getUserRepositories};