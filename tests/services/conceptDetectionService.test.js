// Tests unitaires pour le service de détection automatique de concepts
// Ces tests vérifient que le dictionnaire de règles fonctionne correctement
// sans dépendance externe (pas de DB, pas d'API)

const {
  detectConcepts,
  detectConceptsFromCommit,
  CONCEPT_RULES
} = require('../../src/services/conceptDetectionService')

// Tests de la fonction detectConcepts

describe('detectConcepts', () => {

  test('retourne un tableau vide si le texte est vide', () => {
    expect(detectConcepts('')).toEqual([])
  })

  test('retourne un tableau vide si le texte est null', () => {
    expect(detectConcepts(null)).toEqual([])
  })

  test('retourne un tableau vide si aucun concept ne correspond', () => {
    const result = detectConcepts('lorem ipsum dolor sit amet')
    expect(result).toEqual([])
  })

  test('détecte JWT depuis le message de commit', () => {
    const result = detectConcepts('feat: add jwt authentication middleware')
    expect(result).toContain('JWT Authentication')
  })

  test('détecte Express depuis le code', () => {
    const result = detectConcepts('const app = express()\napp.use(express.json())')
    expect(result).toContain('Express.js')
  })

  test('détecte Prisma depuis le code', () => {
    const result = detectConcepts('const user = await prisma.user.findUnique()')
    expect(result).toContain('Prisma ORM')
  })

  test('détecte PostgreSQL depuis le code', () => {
    const result = detectConcepts('DATABASE_URL=postgresql://user:pass@host/db')
    expect(result).toContain('PostgreSQL')
  })

  test('détecte Redis depuis le code', () => {
    const result = detectConcepts('const redis = require("ioredis")\nredis.set("key", value)')
    expect(result).toContain('Redis')
  })

  test('détecte Docker depuis le nom de fichier', () => {
    const result = detectConcepts('Dockerfile')
    expect(result).toContain('Docker')
  })

  test('détecte plusieurs concepts dans un même texte', () => {
    const result = detectConcepts('feat: add jwt auth with prisma and postgresql')
    expect(result).toContain('JWT Authentication')
    expect(result).toContain('Prisma ORM')
    expect(result).toContain('PostgreSQL')
  })

  test('la détection est insensible à la casse', () => {
    expect(detectConcepts('JWT Authentication')).toContain('JWT Authentication')
    expect(detectConcepts('jwt authentication')).toContain('JWT Authentication')
    expect(detectConcepts('JWT')).toContain('JWT Authentication')
  })

  test('détecte GitHub OAuth', () => {
    const result = detectConcepts('chore: install passport and passport-github2')
    expect(result).toContain('GitHub OAuth')
  })

  test('détecte les tests Jest', () => {
    const result = detectConcepts('test: add jest unit tests with describe and expect')
    expect(result).toContain('Testing')
  })

  test('détecte Zod validation', () => {
    const result = detectConcepts('feat: add zod schema validation middleware')
    expect(result).toContain('Validation')
  })

  test('détecte CORS', () => {
    const result = detectConcepts('chore: add cors middleware for cross-origin requests')
    expect(result).toContain('CORS')
  })

  test('détecte les Cron jobs', () => {
    const result = detectConcepts('feat: add node-cron job to sync commits every hour')
    expect(result).toContain('Cron Job')
  })

  test('détecte Async/Await', () => {
    const result = detectConcepts('const data = await prisma.user.findMany()')
    expect(result).toContain('Async/Await')
  })

  test('détecte la pagination', () => {
    const result = detectConcepts('feat: add pagination with skip and take parameters')
    expect(result).toContain('Pagination')
  })

})

// Tests de la fonction detectConceptsFromCommit

describe('detectConceptsFromCommit', () => {

  test('retourne un tableau vide si message vide et pas de fichiers', () => {
    const result = detectConceptsFromCommit('', [])
    expect(result).toEqual([])
  })

  test('détecte les concepts depuis le message seul', () => {
    const result = detectConceptsFromCommit('feat: add jwt authentication', [])
    expect(result).toContain('JWT Authentication')
  })

  test('détecte les concepts depuis les noms de fichiers', () => {
    const files = [
      { filename: 'Dockerfile', patch: null },
      { filename: 'docker-compose.yml', patch: null }
    ]
    const result = detectConceptsFromCommit('chore: add docker setup', files)
    expect(result).toContain('Docker')
  })

  test('détecte les concepts depuis le patch (code modifié)', () => {
    const files = [
      {
        filename: 'src/middleware/auth.js',
        patch: '+const jwt = require("jsonwebtoken")\n+const token = jwt.sign({ userId }, secret)'
      }
    ]
    const result = detectConceptsFromCommit('feat: add auth middleware', files)
    expect(result).toContain('JWT Authentication')
  })

  test('combine les concepts du message ET des fichiers sans doublons', () => {
    const files = [
      {
        filename: 'src/utils/prisma.js',
        patch: '+const { PrismaClient } = require("@prisma/client")'
      }
    ]
    const result = detectConceptsFromCommit(
      'chore: setup prisma client with postgresql',
      files
    )
    expect(result).toContain('Prisma ORM')
    expect(result).toContain('PostgreSQL')

    // Vérifie qu'il n'y a pas de doublons
    const prismaCount = result.filter(c => c === 'Prisma ORM').length
    expect(prismaCount).toBe(1)
  })

  test('gère les fichiers sans patch (null)', () => {
    const files = [
      { filename: 'README.md', patch: null }
    ]
    expect(() => {
      detectConceptsFromCommit('docs: update readme', files)
    }).not.toThrow()
  })

  test('retourne un tableau (pas un Set)', () => {
    const result = detectConceptsFromCommit('feat: add express router', [])
    expect(Array.isArray(result)).toBe(true)
  })

})

// Tests du dictionnaire CONCEPT_RULES

describe('CONCEPT_RULES', () => {

  test('est un tableau non vide', () => {
    expect(Array.isArray(CONCEPT_RULES)).toBe(true)
    expect(CONCEPT_RULES.length).toBeGreaterThan(0)
  })

  test('contient au moins 60 règles', () => {
    expect(CONCEPT_RULES.length).toBeGreaterThanOrEqual(60)
  })

  test('chaque règle a un nom et des keywords', () => {
    CONCEPT_RULES.forEach(rule => {
      expect(rule).toHaveProperty('name')
      expect(rule).toHaveProperty('keywords')
      expect(typeof rule.name).toBe('string')
      expect(Array.isArray(rule.keywords)).toBe(true)
      expect(rule.keywords.length).toBeGreaterThan(0)
    })
  })

  test('les noms de règles sont uniques', () => {
    const names = CONCEPT_RULES.map(r => r.name)
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(names.length)
  })

  test('contient les concepts essentiels de CommitMind', () => {
    const names = CONCEPT_RULES.map(r => r.name)
    expect(names).toContain('JWT Authentication')
    expect(names).toContain('GitHub OAuth')
    expect(names).toContain('Prisma ORM')
    expect(names).toContain('PostgreSQL')
    expect(names).toContain('Express.js')
    expect(names).toContain('REST API')
    expect(names).toContain('Cron Job')
    expect(names).toContain('Validation')
    expect(names).toContain('Pagination')
  })

})