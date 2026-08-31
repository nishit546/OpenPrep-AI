import api from './api';

export const mistakeNotebookApi = {
  // Get paginated mistake log entries with optional filters
  getMistakeEntries: async (params = {}) => {
    const response = await api.get('/mistake-notebook/entries', { params });
    return response.data;
  },

  // Get aggregated error taxonomy analytics, cost analysis, and recurrence warnings
  getMistakeAnalytics: async () => {
    const response = await api.get('/mistake-notebook/analytics');
    return response.data;
  },

  // Update root cause taxonomy or notes for a mistake entry
  classifyMistake: async (id, payload) => {
    const response = await api.patch(`/mistake-notebook/entries/${id}/classify`, payload);
    return response.data;
  },

  // Generate spaced redo drill
  generateRedoDrill: async (payload = {}) => {
    const response = await api.post('/mistake-notebook/redo-drill/generate', payload);
    return response.data;
  },

  // Submit answer for a redo drill question
  submitRedoAttempt: async (id, payload) => {
    const response = await api.post(`/mistake-notebook/entries/${id}/redo`, payload);
    return response.data;
  },
};

export default mistakeNotebookApi;
