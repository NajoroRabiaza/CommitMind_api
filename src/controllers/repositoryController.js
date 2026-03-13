const prisma = require('../utils/prisma');
const {getUserRepositories} = require('../services/githubService');

const syncRepositories = async (req, res) => {
    try{
        const repos = await getUserRepositories(req.user.accessToken)
        const savedRepos = [];

        for (const repo of repos) {
            const saved = await prisma.repository.upsert({
                where: {githubId: repo.githubId},
                update: {
                    name: repo.name,
                    fullName: repo.fullName,
                    description: repo.description,
                    private: repo.private
                },
                create: {
                    githubId: repo.githubId,
                    name: repo.name,
                    fullName: repo.fullName,
                    description: repo.description,
                    private: repo.private,
                    userId: req.user.id
                }
            })
            savedRepos.push(saved)
        }

        res.json({
            message: `${savedRepos.length} repositories synced`,
            repositories: savedRepos
        })
    } catch(error) {
        res.status(500).json({message: error.message})
    }
}

const getRepositories = async (req, res) => {
    try {
        const repos = await prisma.repository.findMany({
            where: {userId: req.user.id},
            orderBy: {updatedAt: 'desc'}
        })

        res.json({repositories: repos})
    }catch(error) {
        res.status(500).json({message: error.message})
    }
}

module.exports = { syncRepositories, getRepositories }