import apiClient from './apiClient';

const BASE_URL = '/explain-back';

/**
 * Create a new explain-back attempt
 */
export const createAttempt = async (data) => {
  const response = await apiClient.post(`${BASE_URL}/attempt`, data);
  return response.data;
};

/**
 * Analyze explanation without saving
 */
export const analyzeExplanation = async (data) => {
  const response = await apiClient.post(`${BASE_URL}/analyze`, data);
  return response.data;
};

/**
 * Get all attempts for a concept
 */
export const getConceptAttempts = async (conceptId) => {
  const response = await apiClient.get(`${BASE_URL}/concept/${conceptId}`);
  return response.data;
};

/**
 * Get best attempt for a concept
 */
export const getBestAttempt = async (conceptId) => {
  const response = await apiClient.get(`${BASE_URL}/concept/${conceptId}/best`);
  return response.data;
};

/**
 * Get coverage progress for a concept
 */
export const getProgress = async (conceptId) => {
  const response = await apiClient.get(`${BASE_URL}/concept/${conceptId}/progress`);
  return response.data;
};

/**
 * Get all concepts with attempts
 */
export const getUserConcepts = async () => {
  const response = await apiClient.get(`${BASE_URL}/concepts`);
  return response.data;
};

/**
 * Get user stats
 */
export const getUserStats = async () => {
  const response = await apiClient.get(`${BASE_URL}/stats`);
  return response.data;
};

/**
 * Add AI enrichment to an attempt
 */
export const addAIEnrichment = async (attemptId, aiFeedback) => {
  const response = await apiClient.post(`${BASE_URL}/${attemptId}/enrich`, { aiFeedback });
  return response.data;
};

/**
 * Delete an attempt
 */
export const deleteAttempt = async (attemptId) => {
  const response = await apiClient.delete(`${BASE_URL}/${attemptId}`);
  return response.data;
};

/**
 * Extract key points from text
 */
export const extractKeyPoints = async (text) => {
  const response = await apiClient.post(`${BASE_URL}/extract-points`, { text });
  return response.data;
};