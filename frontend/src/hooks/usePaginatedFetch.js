import { useState, useEffect, useCallback } from 'react';

/**
 * A custom hook for fetching paginated data.
 * @param {Function} fetchFunction - The API service function to call (must return { data, totalPages, ... })
 * @param {Object} initialParams - Initial query parameters (e.g., { subjectId: '123' })
 * @param {number} initialLimit - The number of items to fetch per page
 */
export const usePaginatedFetch = (fetchFunction, initialParams = {}, initialLimit = 20) => {
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [params, setParams] = useState(initialParams);

  const loadData = useCallback(async (currentPage, currentParams, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchFunction({ ...currentParams, page: currentPage, limit: initialLimit });
      const responseData = response.data?.data || response.data || [];
      const total = response.data?.totalPages || 1;
      
      setData((prevData) => (append ? [...prevData, ...responseData] : responseData));
      setTotalPages(total);
      setHasMore(currentPage < total);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [fetchFunction, initialLimit]);

  // Initial load or parameter change (resets to page 1)
  useEffect(() => {
    setPage(1);
    loadData(1, params, false);
  }, [params, loadData]);

  // Load next page (infinite scroll append)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, params, true);
    }
  }, [loading, hasMore, page, params, loadData]);

  // Change specific parameters and refresh
  const updateParams = useCallback((newParams) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  return {
    data,
    loading,
    error,
    hasMore,
    page,
    totalPages,
    loadMore,
    updateParams,
    refresh: () => loadData(1, params, false)
  };
};

export default usePaginatedFetch;
