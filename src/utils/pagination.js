const getPagination = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1)
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