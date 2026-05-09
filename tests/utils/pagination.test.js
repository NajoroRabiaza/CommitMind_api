// tests unitaires pour les utilitaires de pagination
// pagination.js exporte deux fonctions pures :
//   getPagination     : securise et calcule page, limit, skip
//   paginatedResponse : formate la reponse avec les metadonnees
//
// ces fonctions sont pures (pas d'effets de bord, pas de DB)
// donc les tests sont simples : on donne des entrees,
// on verifie les sorties

const { getPagination, paginatedResponse } = require('../../src/utils/pagination')

// Tests de getPagination

describe('getPagination', () => {

  // valeurs par defaut

  test('retourne page=1 et limit=20 par defaut si query est vide', () => {
    const result = getPagination({})
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
    expect(result.skip).toBe(0)
  })

  test('retourne page=1 et limit=20 si query.page et query.limit sont absents', () => {
    const result = getPagination({ search: 'fix' })
    expect(result.page).toBe(1)
    expect(result.limit).toBe(20)
  })

  test('retourne skip=0 pour la premiere page', () => {
    const result = getPagination({ page: '1', limit: '10' })
    expect(result.skip).toBe(0)
  })

  // lecture correcte des parametres

  test('convertit correctement page string en nombre entier', () => {
    const result = getPagination({ page: '3', limit: '10' })
    expect(result.page).toBe(3)
  })

  test('convertit correctement limit string en nombre entier', () => {
    const result = getPagination({ page: '1', limit: '15' })
    expect(result.limit).toBe(15)
  })

  test('calcule skip correctement pour page 2 avec limit 10', () => {
    const result = getPagination({ page: '2', limit: '10' })
    // (2-1) * 10 = 10
    expect(result.skip).toBe(10)
  })

  test('calcule skip correctement pour page 3 avec limit 20', () => {
    const result = getPagination({ page: '3', limit: '20' })
    // (3-1) * 20 = 40
    expect(result.skip).toBe(40)
  })

  test('calcule skip correctement pour page 5 avec limit 5', () => {
    const result = getPagination({ page: '5', limit: '5' })
    // (5-1) * 5 = 20
    expect(result.skip).toBe(20)
  })

  // protection contre les valeurs invalides

  test('remplace page=0 par page=1 (minimum absolu)', () => {
    const result = getPagination({ page: '0' })
    expect(result.page).toBe(1)
    expect(result.skip).toBe(0)
  })

  test('remplace page negative par page=1', () => {
    const result = getPagination({ page: '-5' })
    expect(result.page).toBe(1)
  })

  test('remplace page non numerique par page=1', () => {
    const result = getPagination({ page: 'abc' })
    expect(result.page).toBe(1)
  })

  test('remplace limit=0 par limit=1 (minimum absolu)', () => {
    const result = getPagination({ limit: '0' })
    expect(result.limit).toBe(1)
  })

  test('remplace limit negative par limit=1', () => {
    const result = getPagination({ limit: '-10' })
    expect(result.limit).toBe(1)
  })

  test('remplace limit non numerique par limit=20 (defaut)', () => {
    const result = getPagination({ limit: 'beaucoup' })
    expect(result.limit).toBe(20)
  })

  // plafond de securite

  test('plafonne limit a 100 meme si on demande plus', () => {
    const result = getPagination({ limit: '99999' })
    expect(result.limit).toBe(100)
  })

  test('plafonne limit a 100 si on demande exactement 101', () => {
    const result = getPagination({ limit: '101' })
    expect(result.limit).toBe(100)
  })

  test('accepte limit=100 qui est exactement la valeur maximale', () => {
    const result = getPagination({ limit: '100' })
    expect(result.limit).toBe(100)
  })

  test('accepte limit=1 qui est exactement la valeur minimale', () => {
    const result = getPagination({ limit: '1' })
    expect(result.limit).toBe(1)
  })

  // ─ structure de retour

  test('retourne un objet avec exactement les proprietes page, limit, skip', () => {
    const result = getPagination({ page: '2', limit: '10' })
    expect(result).toHaveProperty('page')
    expect(result).toHaveProperty('limit')
    expect(result).toHaveProperty('skip')
  })

  test('toutes les valeurs retournees sont des nombres', () => {
    const result = getPagination({ page: '2', limit: '10' })
    expect(typeof result.page).toBe('number')
    expect(typeof result.limit).toBe('number')
    expect(typeof result.skip).toBe('number')
  })

})

// Tests de paginatedResponse

describe('paginatedResponse', () => {

  const fakeData = [{ id: 1 }, { id: 2 }, { id: 3 }]

  // structure generale de la reponse

  test('retourne un objet avec une propriete data et une propriete pagination', () => {
    const result = paginatedResponse(fakeData, 30, 1, 10)
    expect(result).toHaveProperty('data')
    expect(result).toHaveProperty('pagination')
  })

  test('la propriete data contient les donnees passees en argument', () => {
    const result = paginatedResponse(fakeData, 30, 1, 10)
    expect(result.data).toEqual(fakeData)
  })

  // metadonnees de pagination

  test('pagination contient total, page, limit, totalPages, hasNextPage, hasPreviousPage', () => {
    const result = paginatedResponse(fakeData, 30, 1, 10)
    const keys = Object.keys(result.pagination)
    expect(keys).toContain('total')
    expect(keys).toContain('page')
    expect(keys).toContain('limit')
    expect(keys).toContain('totalPages')
    expect(keys).toContain('hasNextPage')
    expect(keys).toContain('hasPreviousPage')
  })

  test('total correspond au total passe en argument', () => {
    const result = paginatedResponse(fakeData, 57, 1, 10)
    expect(result.pagination.total).toBe(57)
  })

  test('page correspond a la page passee en argument', () => {
    const result = paginatedResponse(fakeData, 57, 3, 10)
    expect(result.pagination.page).toBe(3)
  })

  test('limit correspond a la limite passee en argument', () => {
    const result = paginatedResponse(fakeData, 57, 1, 15)
    expect(result.pagination.limit).toBe(15)
  })

  // calcul de totalPages

  test('calcule totalPages correctement avec un total divisible par limit', () => {
    // 30 / 10 = 3 pages exactes
    const result = paginatedResponse(fakeData, 30, 1, 10)
    expect(result.pagination.totalPages).toBe(3)
  })

  test('arrondit totalPages au superieur si le total n est pas divisible', () => {
    // 31 / 10 = 3.1 = 4 pages (la derniere incomplete)
    const result = paginatedResponse(fakeData, 31, 1, 10)
    expect(result.pagination.totalPages).toBe(4)
  })

  test('retourne totalPages=1 si total est inferieur a limit', () => {
    // 5 resultats avec limit=20 = 1 seule page
    const result = paginatedResponse(fakeData, 5, 1, 20)
    expect(result.pagination.totalPages).toBe(1)
  })

  test('retourne totalPages=0 si total est 0', () => {
    const result = paginatedResponse([], 0, 1, 20)
    expect(result.pagination.totalPages).toBe(0)
  })

  // hasNextPag

  test('hasNextPage est true si on n est pas a la derniere page', () => {
    // 3 pages au total, on est sur la page 1
    const result = paginatedResponse(fakeData, 30, 1, 10)
    expect(result.pagination.hasNextPage).toBe(true)
  })

  test('hasNextPage est false si on est sur la derniere page', () => {
    // 3 pages au total, on est sur la page 3
    const result = paginatedResponse(fakeData, 30, 3, 10)
    expect(result.pagination.hasNextPage).toBe(false)
  })

  test('hasNextPage est false si on depasse le nombre de pages', () => {
    const result = paginatedResponse([], 10, 5, 10)
    expect(result.pagination.hasNextPage).toBe(false)
  })

  // hasPreviousPag

  test('hasPreviousPage est false sur la premiere page', () => {
    const result = paginatedResponse(fakeData, 30, 1, 10)
    expect(result.pagination.hasPreviousPage).toBe(false)
  })

  test('hasPreviousPage est true sur toutes les pages apres la premiere', () => {
    const result = paginatedResponse(fakeData, 30, 2, 10)
    expect(result.pagination.hasPreviousPage).toBe(true)
  })

  test('hasPreviousPage est true sur la derniere page', () => {
    const result = paginatedResponse(fakeData, 30, 3, 10)
    expect(result.pagination.hasPreviousPage).toBe(true)
  })

  // cas limite

  test('fonctionne avec un tableau de donnees vide', () => {
    const result = paginatedResponse([], 0, 1, 20)
    expect(result.data).toEqual([])
    expect(result.pagination.total).toBe(0)
  })

  test('fonctionne avec une seule page de resultats', () => {
    const result = paginatedResponse([{ id: 1 }], 1, 1, 20)
    expect(result.pagination.totalPages).toBe(1)
    expect(result.pagination.hasNextPage).toBe(false)
    expect(result.pagination.hasPreviousPage).toBe(false)
  })

})