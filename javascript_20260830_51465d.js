import apiClient from './apiClient';

const BASE_URL = '/interleaved-practice';

/**
 * Generate a new interleaved practice set
 */
export const generateSet = async (data) => {
  const response = await apiClient.post(`${BASE_URL}/generate`, data);
  return response.data;
};

/**
 * Get a practice set by ID
 */
export const getSet = async (setId) => {
  const response = await apiClient.get(`${BASE_URL}/${setId}`);
  return response.data;
};

/**
 * Get all practice sets for user
 */
export const getUserSets = async (params = {}) => {
  const response = await apiClient.get(`${BASE_URL}/sets`, { params });
  return response.data;
};

/**
 * Update results for a practice set
 */
export const updateResults = async (setId, results) => {
  const response = await apiClient.post(`${BASE_URL}/${setId}/results`, { results });
  return response.data;
};

/**
 * Complete a practice set
 */
export const completeSet = async (setId, timeSpent = null) => {
  const response = await apiClient.post(`${BASE_URL}/${setId}/complete`, { timeSpent });
  return response.data;
};

/**
 * Get interleaving benefit
 */
export const getBenefit = async () => {
  const response = await apiClient.get(`${BASE_URL}/benefit`);
  return response.data;
};

/**
 * Get user stats
 */
export const getStats = async () => {
  const response = await apiClient.get(`${BASE_URL}/stats`);
  return response.data;
};

/**
 * Delete a practice set
 */
export const deleteSet = async (setId) => {
  const response = await apiClient.delete(`${BASE_URL}/${setId}`);
  return response.data;
};

/**
 * Get confusable pairs for topics
 */
export const getConfusablePairs = async (topicIds) => {
  const response = await apiClient.get(`${BASE_URL}/confusable-pairs`, {
    params: { topicIds: topicIds.join(',') },
  });
  return response.data;
};