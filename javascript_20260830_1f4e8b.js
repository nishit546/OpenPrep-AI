import apiClient from './apiClient';

const BASE_URL = '/habits';

/**
 * Create a new habit
 */
export const createHabit = async (data) => {
  const response = await apiClient.post(BASE_URL, data);
  return response.data;
};

/**
 * Get all habits
 */
export const getHabits = async (params = {}) => {
  const response = await apiClient.get(BASE_URL, { params });
  return response.data;
};

/**
 * Get a single habit
 */
export const getHabit = async (habitId) => {
  const response = await apiClient.get(`${BASE_URL}/${habitId}`);
  return response.data;
};

/**
 * Update a habit
 */
export const updateHabit = async (habitId, data) => {
  const response = await apiClient.put(`${BASE_URL}/${habitId}`, data);
  return response.data;
};

/**
 * Delete a habit
 */
export const deleteHabit = async (habitId) => {
  const response = await apiClient.delete(`${BASE_URL}/${habitId}`);
  return response.data;
};

/**
 * Archive a habit
 */
export const archiveHabit = async (habitId) => {
  const response = await apiClient.post(`${BASE_URL}/${habitId}/archive`);
  return response.data;
};

/**
 * Log habit completion
 */
export const logHabit = async (habitId, data) => {
  const response = await apiClient.post(`${BASE_URL}/${habitId}/log`, data);
  return response.data;
};

/**
 * Use streak freeze
 */
export const useStreakFreeze = async (habitId) => {
  const response = await apiClient.post(`${BASE_URL}/${habitId}/freeze`);
  return response.data;
};

/**
 * Get streak status
 */
export const getStreakStatus = async (habitId) => {
  const response = await apiClient.get(`${BASE_URL}/${habitId}/streak`);
  return response.data;
};

/**
 * Get habit analytics
 */
export const getAnalytics = async (params = {}) => {
  const response = await apiClient.get(`${BASE_URL}/analytics`, { params });
  return response.data;
};

/**
 * Get weekly summary
 */
export const getWeeklySummary = async () => {
  const response = await apiClient.get(`${BASE_URL}/weekly-summary`);
  return response.data;
};

/**
 * Get recommendations
 */
export const getRecommendations = async () => {
  const response = await apiClient.get(`${BASE_URL}/recommendations`);
  return response.data;
};

/**
 * Get today's status
 */
export const getTodayStatus = async () => {
  const response = await apiClient.get(`${BASE_URL}/today`);
  return response.data;
};