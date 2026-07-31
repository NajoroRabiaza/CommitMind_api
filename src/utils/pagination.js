/**
 * Utilitaires de pagination pour les réponses API.
 *
 * getPagination : extrait et securise les parametres page et limit
 * depuis les query params, et calcule le skip Prisma.
 * paginatedResponse : formate la reponse avec les donnees et les
 * metadonnees de pagination (totalPages, hasNextPage…).
 */

const getPagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1)
  // Borne superieure à 100 pour eviter qu'un client charge toute la base
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20))
  const skip = (page - 1) * limit

  return { page, limit, skip }
}

const paginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  }
}

module.exports = { getPagination, paginatedResponse }