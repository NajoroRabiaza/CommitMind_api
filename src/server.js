require('dotenv').config();
const app = require('./app');
const { startSyncJob } = require('./jobs/syncCommits')
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
    startSyncJob()
  })