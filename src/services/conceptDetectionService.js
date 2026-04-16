// Dictionnaire de concepts techniques
// Chaque concept a une liste de mots-clés qui le déclenchent
const CONCEPT_RULES = [

  // ─── AUTHENTIFICATION & SÉCURITÉ ───────────────────────────────────────────

  {
    name: 'JWT Authentication',
    keywords: ['jwt', 'jsonwebtoken', 'token', 'bearer', 'auth token', 'access token', 'refresh token', 'jwt.sign', 'jwt.verify', 'jwt.decode']
  },
  {
    name: 'GitHub OAuth',
    keywords: ['oauth', 'passport', 'github auth', 'callback', 'github strategy', 'passport-github', 'oauth2', 'authorization code']
  },
  {
    name: 'Session Management',
    keywords: ['session', 'express-session', 'cookie', 'connect.sid', 'serialize', 'deserialize', 'req.session']
  },
  {
    name: 'Password Hashing',
    keywords: ['bcrypt', 'bcryptjs', 'hash', 'salt', 'argon2', 'pbkdf2', 'crypto', 'password hash']
  },
  {
    name: 'CORS',
    keywords: ['cors', 'cross-origin', 'access-control-allow-origin', 'preflight', 'origin']
  },
  {
    name: 'Rate Limiting',
    keywords: ['rate limit', 'rate-limit', 'express-rate-limit', 'throttle', 'too many requests', 'ratelimit']
  },
  {
    name: 'CSRF Protection',
    keywords: ['csrf', 'xsrf', 'csurf', 'cross-site request', 'csrf token']
  },
  {
    name: 'Helmet.js',
    keywords: ['helmet', 'xss', 'content security policy', 'csp', 'hsts', 'x-frame-options']
  },
  {
    name: 'API Key Authentication',
    keywords: ['api key', 'apikey', 'x-api-key', 'api_key', 'secret key']
  },
  {
    name: 'Two Factor Authentication',
    keywords: ['2fa', 'totp', 'otp', 'two factor', 'authenticator', 'speakeasy', 'qrcode']
  },

  // ─── BASES DE DONNÉES ──────────────────────────────────────────────────────

  {
    name: 'PostgreSQL',
    keywords: ['postgresql', 'psql', 'pg', 'neon', 'supabase', 'postgres', 'pgbouncer', 'pg_', 'serial primary key', 'foreign key']
  },
  {
    name: 'MySQL',
    keywords: ['mysql', 'mysql2', 'mariadb', 'innodb', 'mysqldump']
  },
  {
    name: 'MongoDB',
    keywords: ['mongodb', 'mongoose', 'mongo', 'objectid', 'bson', 'aggregation pipeline', 'find()', 'findone', 'collection', 'nosql']
  },
  {
    name: 'SQLite',
    keywords: ['sqlite', 'sqlite3', 'dev.db', '.db file', 'better-sqlite3']
  },
  {
    name: 'Redis',
    keywords: ['redis', 'cache', 'caching', 'in-memory', 'ioredis', 'redis client', 'setex', 'get key', 'pub/sub', 'redis.set', 'redis.get']
  },
  {
    name: 'Prisma ORM',
    keywords: ['prisma', 'schema.prisma', 'migration', 'prisma client', 'prisma.user', 'prisma.commit', 'findmany', 'findfirst', 'findunique', 'upsert', '@relation', '@id', '@default']
  },
  {
    name: 'Sequelize ORM',
    keywords: ['sequelize', 'sequelize.define', 'belongsto', 'hasmany', 'hasone', 'belongstomany', 'op.like']
  },
  {
    name: 'TypeORM',
    keywords: ['typeorm', '@entity', '@column', '@primarygeneratedcolumn', '@onetomany', '@manytoone', 'getrepository']
  },
  {
    name: 'Mongoose',
    keywords: ['mongoose.model', 'mongoose.schema', 'schema.methods', 'schema.statics', 'mongoose.connect']
  },
  {
    name: 'Database Transactions',
    keywords: ['transaction', 'prisma.$transaction', 'begin transaction', 'rollback', 'commit transaction', 'acid']
  },
  {
    name: 'Database Indexing',
    keywords: ['index', 'create index', '@@index', '@index', 'query optimization', 'explain analyze']
  },
  {
    name: 'Database Migration',
    keywords: ['migrate', 'migration', 'prisma migrate', 'knex migrate', 'up()', 'down()', 'alter table', 'add column', 'drop column']
  },

  // ─── FRAMEWORKS BACKEND ────────────────────────────────────────────────────

  {
    name: 'Express.js',
    keywords: ['express', 'app.use', 'app.get', 'app.post', 'app.put', 'app.delete', 'router.get', 'router.post', 'req.body', 'res.json', 'res.status', 'next()']
  },
  {
    name: 'NestJS',
    keywords: ['nestjs', '@controller', '@injectable', '@module', '@get', '@post', '@body', '@param', 'nestfactory', '@nestjs']
  },
  {
    name: 'Fastify',
    keywords: ['fastify', 'fastify.get', 'fastify.post', 'fastify.register', 'reply.send']
  },
  {
    name: 'Koa.js',
    keywords: ['koa', 'koa-router', 'ctx.body', 'ctx.status', 'koa-compose']
  },
  {
    name: 'Hapi.js',
    keywords: ['hapi', '@hapi/hapi', 'server.route', 'server.register', 'h.response']
  },
  {
    name: 'AdonisJS',
    keywords: ['adonisjs', 'adonis', 'lucid', 'adonis route', 'adonis controller']
  },
  {
    name: 'Django',
    keywords: ['django', 'views.py', 'models.py', 'urls.py', 'settings.py', 'wsgi', 'asgi', 'django rest framework', 'drf', 'serializer', 'queryset', 'admin.py']
  },
  {
    name: 'FastAPI',
    keywords: ['fastapi', '@app.get', '@app.post', '@router.get', 'pydantic', 'basemodel', 'uvicorn', 'depends()']
  },
  {
    name: 'Flask',
    keywords: ['flask', '@app.route', 'from flask import', 'flask_sqlalchemy', 'flask_migrate', 'blueprint']
  },
  {
    name: 'Laravel',
    keywords: ['laravel', 'artisan', 'eloquent', 'blade', 'php artisan', 'route::get', 'route::post', 'middleware::']
  },
  {
    name: 'Spring Boot',
    keywords: ['spring boot', '@restcontroller', '@requestmapping', '@getmapping', '@postmapping', '@service', '@repository', '@autowired', 'application.properties']
  },
  {
    name: 'Ruby on Rails',
    keywords: ['rails', 'activerecord', 'rake', 'gemfile', 'belongs_to', 'has_many', 'rails routes', 'erb']
  },

  // ─── FRAMEWORKS FRONTEND ───────────────────────────────────────────────────

  {
    name: 'React',
    keywords: ['react', 'usestate', 'useeffect', 'usecontext', 'usereducer', 'useref', 'jsx', 'tsx', 'react-dom', 'reactdom.render', 'createroot', 'react.fc', 'props', 'react-router']
  },
  {
    name: 'Next.js',
    keywords: ['next.js', 'nextjs', 'getserversideprops', 'getstaticprops', 'getstaticpaths', 'next/router', 'next/link', 'next/image', 'app router', 'pages router', 'use client', 'use server']
  },
  {
    name: 'Vue.js',
    keywords: ['vue', 'vuex', 'vue-router', 'v-bind', 'v-model', 'v-if', 'v-for', 'composition api', 'setup()', 'ref()', 'computed()', 'pinia', 'nuxt']
  },
  {
    name: 'Angular',
    keywords: ['angular', '@component', '@injectable', '@ngmodule', 'ngrouter', 'angular forms', 'rxjs', 'observable', 'httpclient', 'ngif', 'ngfor']
  },
  {
    name: 'Svelte',
    keywords: ['svelte', 'sveltekit', '$store', 'writable', 'readable', 'onmount', '.svelte']
  },
  {
    name: 'Tailwind CSS',
    keywords: ['tailwind', 'tailwindcss', 'classnames', 'tw-', 'bg-', 'text-', 'flex', 'grid-cols', 'rounded-', 'shadow-']
  },

  // ─── LANGAGES ──────────────────────────────────────────────────────────────

  {
    name: 'Node.js',
    keywords: ['node', 'npm', 'package.json', 'require(', 'module.exports', 'process.env', '__dirname', '__filename', 'node_modules', 'npm install']
  },
  {
    name: 'TypeScript',
    keywords: ['typescript', '.ts', 'interface ', 'type ', 'enum ', 'generics', 'tsconfig', 'as unknown', 'readonly ', ': string', ': number', ': boolean', 'ts-node']
  },
  {
    name: 'Python',
    keywords: ['python', '.py', 'def ', 'import ', 'pip install', 'requirements.txt', '__init__.py', 'virtualenv', 'venv', 'asyncio', 'decorator']
  },
  {
    name: 'Java',
    keywords: ['java', '.java', 'public class', 'private ', 'protected ', 'interface ', 'extends ', 'implements ', 'maven', 'gradle', 'pom.xml', 'spring']
  },
  {
    name: 'Go',
    keywords: ['golang', '.go', 'func ', 'package main', 'import (', 'go mod', 'goroutine', 'channel', 'defer ', 'fmt.println', 'gin.', 'fiber.']
  },
  {
    name: 'Rust',
    keywords: ['rust', '.rs', 'fn main', 'cargo', 'let mut', 'ownership', 'borrowing', 'lifetime', 'vec!', 'option<', 'result<', 'println!']
  },
  {
    name: 'PHP',
    keywords: ['php', '.php', 'echo ', '<?php', 'composer', 'namespace ', 'use ', 'public function', '$this->']
  },
  {
    name: 'C#',
    keywords: ['csharp', '.cs', 'using system', 'namespace ', 'public class', 'async task', 'linq', '.net', 'asp.net', 'nuget']
  },

  // ─── ARCHITECTURE & DESIGN PATTERNS ───────────────────────────────────────

  {
    name: 'REST API',
    keywords: ['route', 'router', 'endpoint', 'controller', 'rest api', 'http method', 'get request', 'post request', 'put request', 'delete request', 'patch request', 'status code', 'json response']
  },
  {
    name: 'GraphQL',
    keywords: ['graphql', 'apollo', 'query {', 'mutation {', 'subscription {', 'typedef', 'resolver', 'schema definition', 'graphql schema', 'gql`', 'usemutation', 'usequery']
  },
  {
    name: 'Microservices',
    keywords: ['microservice', 'service mesh', 'api gateway', 'service discovery', 'load balancer', 'circuit breaker', 'kubernetes', 'k8s']
  },
  {
    name: 'MVC Pattern',
    keywords: ['model', 'view', 'controller', 'mvc', 'model view controller']
  },
  {
    name: 'Repository Pattern',
    keywords: ['repository', 'repo pattern', 'data access layer', 'data layer']
  },
  {
    name: 'Middleware Pattern',
    keywords: ['middleware', 'pipeline', 'interceptor', 'before hook', 'after hook']
  },
  {
    name: 'Event Driven',
    keywords: ['event emitter', 'eventemitter', 'event listener', 'on(', 'emit(', 'pub/sub', 'publish', 'subscribe', 'message queue', 'rabbitmq', 'kafka']
  },
  {
    name: 'Dependency Injection',
    keywords: ['dependency injection', 'di container', 'inversion of control', 'ioc', 'inject', 'provider']
  },
  {
    name: 'Clean Architecture',
    keywords: ['clean architecture', 'use case', 'entity', 'repository interface', 'domain layer', 'application layer', 'infrastructure layer']
  },
  {
    name: 'SOLID Principles',
    keywords: ['solid', 'single responsibility', 'open closed', 'liskov', 'interface segregation', 'dependency inversion']
  },

  // ─── CLOUD & DEVOPS ────────────────────────────────────────────────────────

  {
    name: 'Docker',
    keywords: ['docker', 'dockerfile', 'container', 'docker-compose', 'docker image', 'docker run', 'docker build', '.dockerignore', 'docker hub', 'entrypoint']
  },
  {
    name: 'Kubernetes',
    keywords: ['kubernetes', 'k8s', 'kubectl', 'pod', 'deployment', 'service', 'ingress', 'namespace', 'helm', 'configmap', 'secret']
  },
  {
    name: 'CI/CD',
    keywords: ['github actions', 'ci/cd', 'pipeline', '.github/workflows', 'workflow', 'on: push', 'jobs:', 'steps:', 'gitlab ci', 'circleci', 'travis ci']
  },
  {
    name: 'AWS',
    keywords: ['aws', 'amazon', 's3', 'ec2', 'lambda', 'rds', 'cloudfront', 'iam', 'dynamodb', 'sqs', 'sns', 'elasticbeanstalk', 'route53']
  },
  {
    name: 'Vercel',
    keywords: ['vercel', 'vercel.json', 'vercel deploy', 'vercel env']
  },
  {
    name: 'Render',
    keywords: ['render.com', 'render deploy', 'render.yaml', 'web service render']
  },
  {
    name: 'Nginx',
    keywords: ['nginx', 'nginx.conf', 'proxy_pass', 'upstream', 'server_name', 'location /']
  },
  {
    name: 'Environment Variables',
    keywords: ['dotenv', '.env', 'process.env', 'environment variable', '.env.example', 'env(', 'config()']
  },

  // ─── OUTILS & UTILITAIRES ──────────────────────────────────────────────────

  {
    name: 'Git',
    keywords: ['commit', 'branch', 'merge', 'rebase', 'git push', 'git pull', 'git clone', 'gitignore', 'stash', 'cherry-pick', 'squash']
  },
  {
    name: 'GitHub API',
    keywords: ['github api', 'octokit', 'github.com/api', 'repos.listcommits', 'repos.getcommit', 'github rest', 'github graphql', 'github token']
  },
  {
    name: 'Cron Job',
    keywords: ['cron', 'schedule', 'node-cron', 'cron.schedule', 'cron expression', 'job scheduler', 'setinterval', 'recurring task']
  },
  {
    name: 'Testing',
    keywords: ['test', 'jest', 'spec', 'describe(', 'it(', 'expect(', 'mocha', 'chai', 'supertest', 'vitest', 'coverage', 'mock', 'spy', 'beforeeach', 'aftereach']
  },
  {
    name: 'Validation',
    keywords: ['validation', 'validate', 'zod', 'joi', 'yup', 'z.object', 'z.string', 'z.number', 'parse(', 'safeParse(', 'schema.parse']
  },
  {
    name: 'Pagination',
    keywords: ['pagination', 'paginate', 'page=', 'limit=', 'skip=', 'offset', 'take:', 'totalPages', 'hasNextPage', 'hasPreviousPage', 'cursor']
  },
  {
    name: 'File Upload',
    keywords: ['multer', 'file upload', 'multipart', 'form-data', 'req.file', 'req.files', 'storage', 'diskStorage', 'mimetype', 'originalname', 'cloudinary', 's3 upload']
  },
  {
    name: 'Email',
    keywords: ['nodemailer', 'sendgrid', 'mailgun', 'smtp', 'transporter', 'sendmail', 'email template', 'html email', 'text/plain email']
  },
  {
    name: 'WebSocket',
    keywords: ['socket', 'websocket', 'socket.io', 'realtime', 'emit(', 'on(', 'broadcast', 'room', 'ws://', 'wss://', 'socket.on', 'socket.emit']
  },
  {
    name: 'Logging',
    keywords: ['winston', 'morgan', 'pino', 'bunyan', 'log level', 'logger', 'console.log', 'error log', 'info log', 'debug log']
  },
  {
    name: 'Caching',
    keywords: ['cache', 'cacheable', 'cache-control', 'etag', 'max-age', 'no-cache', 'stale', 'invalidate cache', 'memoize']
  },
  {
    name: 'Search',
    keywords: ['search', 'elasticsearch', 'algolia', 'fulltext', 'full-text', 'contains:', 'search query', 'fuzzy search', 'indexing']
  },
  {
    name: 'PDF Generation',
    keywords: ['pdf', 'puppeteer', 'pdfkit', 'jspdf', 'html-pdf', 'pdf generation', 'chromium', 'headless browser']
  },
  {
    name: 'Data Visualization',
    keywords: ['chart', 'graph', 'chartjs', 'd3.js', 'recharts', 'plotly', 'canvas', 'svg', 'histogram', 'pie chart', 'bar chart']
  },

  // ─── CONCEPTS AVANCÉS ──────────────────────────────────────────────────────

  {
    name: 'Async/Await',
    keywords: ['async ', 'await ', 'promise', 'then(', 'catch(', 'finally(', 'promise.all', 'promise.race', 'async function']
  },
  {
    name: 'Error Handling',
    keywords: ['try catch', 'try {', 'catch (', 'throw new error', 'throw new', 'custom error', 'error handling', 'global error', 'error middleware']
  },
  {
    name: 'Data Modeling',
    keywords: ['schema', 'model', 'entity', 'relation', 'foreign key', 'one to many', 'many to many', 'one to one', 'normalization']
  },
  {
    name: 'API Documentation',
    keywords: ['swagger', 'openapi', 'apidoc', 'postman collection', 'readme', 'api docs', 'endpoint documentation']
  },
  {
    name: 'Encryption',
    keywords: ['encrypt', 'decrypt', 'aes', 'rsa', 'ssl', 'tls', 'https', 'certificate', 'private key', 'public key', 'crypto.']
  },
  {
    name: 'Queue System',
    keywords: ['queue', 'bull', 'bullmq', 'rabbitmq', 'kafka', 'worker', 'job queue', 'message broker', 'consumer', 'producer']
  },
  {
    name: 'Serverless',
    keywords: ['serverless', 'lambda', 'cloud function', 'edge function', 'function as a service', 'faas', 'vercel function', 'netlify function']
  },
  {
    name: 'Monorepo',
    keywords: ['monorepo', 'turborepo', 'nx', 'lerna', 'workspaces', 'pnpm workspace', 'yarn workspaces']
  },
  {
    name: 'Static Analysis',
    keywords: ['eslint', 'prettier', 'eslintrc', '.prettierrc', 'lint', 'husky', 'lint-staged', 'editorconfig', 'stylelint']
  }
]

/**
 * Détecte les concepts dans un texte donné
 * Retourne la liste des noms de concepts détectés
 */
const detectConcepts = (text) => {
  if (!text) return []

  const lowerText = text.toLowerCase()
  const detected = []

  for (const rule of CONCEPT_RULES) {
    const matched = rule.keywords.some(keyword =>
      lowerText.includes(keyword.toLowerCase())
    )
    if (matched) {
      detected.push(rule.name)
    }
  }

  return detected
}

/**
 * Analyse un commit complet (message + fichiers)
 * et retourne tous les concepts détectés
 */
const detectConceptsFromCommit = (commitMessage, files = []) => {
  const detected = new Set()

  // Analyse du message du commit
  const fromMessage = detectConcepts(commitMessage)
  fromMessage.forEach(c => detected.add(c))

  // Analyse des noms de fichiers
  for (const file of files) {
    const fromFilename = detectConcepts(file.filename)
    fromFilename.forEach(c => detected.add(c))

    // Analyse du patch (code modifié)
    if (file.patch) {
      const fromPatch = detectConcepts(file.patch)
      fromPatch.forEach(c => detected.add(c))
    }
  }

  return Array.from(detected)
}

module.exports = { detectConcepts, detectConceptsFromCommit, CONCEPT_RULES }