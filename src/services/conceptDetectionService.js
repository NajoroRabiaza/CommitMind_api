// Dictionnaire de concepts techniques
// Chaque concept a une liste de mots-clés qui le déclenchent
const CONCEPT_RULES = [
    {
      name: 'JWT Authentication',
      keywords: ['jwt', 'jsonwebtoken', 'token', 'bearer', 'auth token']
    },
    {
      name: 'GitHub OAuth',
      keywords: ['oauth', 'passport', 'github auth', 'callback', 'github strategy']
    },
    {
      name: 'REST API',
      keywords: ['route', 'router', 'endpoint', 'controller', 'api', 'rest']
    },
    {
      name: 'PostgreSQL',
      keywords: ['postgresql', 'psql', 'pg', 'database', 'neon']
    },
    {
      name: 'Prisma ORM',
      keywords: ['prisma', 'schema', 'migration', 'orm', 'prisma client']
    },
    {
      name: 'Express.js',
      keywords: ['express', 'middleware', 'app.use', 'req', 'res']
    },
    {
      name: 'Node.js',
      keywords: ['node', 'npm', 'package.json', 'require', 'module.exports']
    },
    {
      name: 'Redis',
      keywords: ['redis', 'cache', 'caching', 'in-memory']
    },
    {
      name: 'Docker',
      keywords: ['docker', 'dockerfile', 'container', 'image', 'compose']
    },
    {
      name: 'Git',
      keywords: ['commit', 'branch', 'merge', 'rebase', 'git']
    },
    {
      name: 'Testing',
      keywords: ['test', 'jest', 'spec', 'describe', 'expect', 'mocha']
    },
    {
      name: 'Environment Variables',
      keywords: ['dotenv', '.env', 'process.env', 'environment', 'config']
    },
    {
      name: 'Cron Job',
      keywords: ['cron', 'schedule', 'job', 'interval', 'node-cron']
    },
    {
      name: 'Validation',
      keywords: ['validation', 'validate', 'zod', 'joi', 'schema']
    },
    {
      name: 'Pagination',
      keywords: ['pagination', 'page', 'limit', 'skip', 'offset']
    },
    {
      name: 'React',
      keywords: ['react', 'component', 'jsx', 'useState', 'useEffect']
    },
    {
      name: 'Django',
      keywords: ['django', 'python', 'views.py', 'models.py', 'urls.py']
    },
    {
      name: 'WebSocket',
      keywords: ['socket', 'websocket', 'socket.io', 'realtime', 'emit']
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
  
  module.exports = { detectConcepts, detectConceptsFromCommit }