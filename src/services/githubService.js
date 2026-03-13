const { Octokit } = require('@octokit/rest');
const createGithubClient = (accessToken) => {
	return new Octokit({
		auth: accessToken
	})
}
module.exports= {createGithubClient};