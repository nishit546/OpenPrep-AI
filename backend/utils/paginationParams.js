/**
 * Extracts and sanitizes pagination parameters from a request query.
 * @param {Object} query - The request query object (req.query)
 * @param {number} defaultLimit - Default limit if none is provided (default: 20)
 * @param {number} maxLimit - Maximum allowed limit (default: 100)
 * @returns {Object} { page, limit, offset }
 */
const getPaginationParams = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Formats a paginated response.
 * @param {Array} data - The page of data
 * @param {number} total - Total number of records
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @returns {Object} Formatted response data
 */
const formatPaginatedResponse = (data, total, page, limit) => {
  return {
    success: true,
    count: data.length,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    data,
  };
};

module.exports = {
  getPaginationParams,
  formatPaginatedResponse
};
