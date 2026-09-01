# CommitMind API

A backend REST API that transforms your GitHub commits into a personal learning history. Every commit you make becomes a trace of what you learned — automatically tagged with the technical concepts it involves.

**Live API** : https://commitmind.onrender.com

---

## Stack

- Node.js / Express 5
- PostgreSQL (Neon) / Prisma ORM
- GitHub OAuth 2.0 + JWT
- node-cron
- Zod (validation)

---

## Features

- GitHub OAuth authentication with JWT tokens
- Sync repositories and commits from GitHub
- Attach concepts to commits manually or via auto-detection
- Auto-detection of 80+ technical concepts from commit messages, filenames and diffs
- Learning history timeline with filters (search, month, concept)
- Progression statistics (top concepts, top repositories, commits by month)
- Automatic commit sync every hour via cron job

---

## How to test the live API

The API is live at `https://commitmind.onrender.com`. Follow these steps in order.

### Step 1 — Authenticate with GitHub

Open this URL in your browser :

https://commitmind.onrender.com/auth/github


GitHub will ask you to authorize the app. After approval, you will receive a JSON response containing your JWT token :

```json
{
  "message": "login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "your-github-username",
    "avatarUrl": "https://avatars.githubusercontent.com/..."
  }
}
```

Copy the `token` value. You will use it in every subsequent request.

### Step 2 — Add the token to your requests

All protected routes require this header :

Authorization: Bearer <your_token_here>


### Step 3 — Sync your repositories

POST https://commitmind.onrender.com/repositories/sync
Authorization: Bearer <token>


### Step 4 — Sync commits for a repository

POST https://commitmind.onrender.com/repositories/:repoId/commits/sync
Authorization: Bearer <token>


Replace `:repoId` with the `id` returned in the previous response.

### Step 5 — Sync commit files and auto-detect concepts

POST https://commitmind.onrender.com/repositories/:repoId/commits/:commitId/files/sync
Authorization: Bearer <token>


### Step 6 — Explore your learning history

GET https://commitmind.onrender.com/history
Authorization: Bearer <token>


---

## Full API Reference

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/auth/github` | No | Start GitHub OAuth login |
| GET | `/auth/me` | Yes | Get current user profile |
| GET | `/auth/logout` | Yes | Logout (delete your token client-side) |

### Repositories

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/repositories/sync` | Yes | Sync repositories from GitHub |
| GET | `/repositories` | Yes | List repositories (paginated) |

Query params for GET : `?page=1&limit=20`

### Commits

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/repositories/:repoId/commits/sync` | Yes | Sync commits from GitHub |
| GET | `/repositories/:repoId/commits` | Yes | List commits (paginated, searchable) |
| POST | `/repositories/:repoId/commits/:commitId/files/sync` | Yes | Sync commit files |
| GET | `/repositories/:repoId/commits/:commitId/files` | Yes | List files of a commit |

Query params for GET commits : `?page=1&limit=20&search=fix`

### Concepts

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/concepts` | Yes | `{ "name": "JWT", "description": "..." }` | Create a concept |
| GET | `/concepts` | Yes | — | List concepts (paginated) |
| GET | `/concepts/:id` | Yes | — | Get a concept |
| PUT | `/concepts/:id` | Yes | `{ "name": "JWT", "description": "..." }` | Update a concept |
| DELETE | `/concepts/:id` | Yes | — | Delete a concept |
| GET | `/concepts/:conceptId/commits` | Yes | — | Commits linked to a concept |

### Linking Concepts to Commits

| Method | Endpoint | Auth | Body | Description |
|--------|----------|------|------|-------------|
| POST | `/repositories/:repoId/commits/:commitId/concepts` | Yes | `{ "conceptId": 1 }` | Link a concept manually |
| POST | `/repositories/:repoId/commits/:commitId/concepts/auto` | Yes | — | Auto-detect and link concepts |
| DELETE | `/repositories/:repoId/commits/:commitId/concepts/:conceptId` | Yes | — | Unlink a concept |

### History & Stats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/history` | Yes | Learning timeline grouped by month |
| GET | `/stats` | Yes | Global progression statistics |

Query params for GET history : `?page=1&limit=20&search=fix&month=2026-03&concept=JWT`

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Check API status |

---

## Pagination

All list endpoints return a paginated response in this format :

```json
{
  "data": [...],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Run locally

```bash
git clone https://github.com/NajoroRabiaza/CommitMind_api
cd CommitMind_api
npm install
```

Create a `.env` file based on `.env.example` :

```bash
cp .env.example .env
```

Fill in your credentials, then :

```bash
npx prisma generate
npx prisma migrate dev
npm run dev
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `GITHUB_CLIENT_ID` | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth app client secret |
| `CALLBACK_URL` | OAuth callback URL |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `ENCRYPTION_KEY` | 64-char hex key for AES-256-GCM (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

---

## Deployment

- Backend : Render
- Database : Neon PostgreSQL