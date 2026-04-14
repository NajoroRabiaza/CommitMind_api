# CommitMind

A backend REST API that transforms your GitHub commits into a personal learning history. Every commit you make becomes a trace of what you learned.

## Stack

- Node.js / Express 5
- PostgreSQL (Neon) / Prisma ORM
- GitHub OAuth + JWT
- node-cron

## Features

- GitHub OAuth authentication with JWT tokens
- Sync repositories and commits from GitHub
- Attach concepts to commits manually or automatically
- Auto-detection of technical concepts from commit messages and code diffs
- Learning history timeline with filters (search, month, concept)
- Progression statistics
- Automatic commit sync every hour via cron job

## API Endpoints

### Auth
- `GET /auth/github` — Login with GitHub
- `GET /auth/me` — Get current user
- `GET /auth/logout` — Logout

### Repositories
- `POST /repositories/sync` — Sync repositories from GitHub
- `GET /repositories` — List repositories

### Commits
- `POST /repositories/:repoId/commits/sync` — Sync commits
- `GET /repositories/:repoId/commits` — List commits
- `POST /repositories/:repoId/commits/:commitId/files/sync` — Sync commit files
- `GET /repositories/:repoId/commits/:commitId/files` — List commit files

### Concepts
- `POST /concepts` — Create a concept
- `GET /concepts` — List concepts
- `GET /concepts/:id` — Get a concept
- `PUT /concepts/:id` — Update a concept
- `DELETE /concepts/:id` — Delete a concept
- `GET /concepts/:conceptId/commits` — Get commits linked to a concept

### Linking
- `POST /repositories/:repoId/commits/:commitId/concepts` — Link a concept to a commit manually
- `POST /repositories/:repoId/commits/:commitId/concepts/auto` — Auto-detect and link concepts

### History & Stats
- `GET /history` — Learning timeline (filters: search, month, concept, page, limit)
- `GET /stats` — Progression statistics

## Getting Started

```bash
git clone https://github.com/NajoroRabiaza/CommitMind
cd CommitMind
npm install
```

Create a `.env` file based on `.env.example` and fill in your credentials.

```bash
npx prisma generate
npm run dev
```

## Environment Variables

```
PORT=3000
DATABASE_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
CALLBACK_URL=http://localhost:3000/auth/github/callback
JWT_SECRET=
```

## Deployment

- Backend: Render
- Database: Neon PostgreSQL
- Live: https://commitmind.onrender.com
```