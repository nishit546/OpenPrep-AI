import API from './api';

/**
 * Service client for Factuality & Citation Verification Engine
 */
export const factualityService = {
  /**
   * Verify factuality and citations for a flashcard
   */
  async verifyFlashcard(payload) {
    const response = await API.post('/factuality/verify-flashcard', payload);
    return response.data;
  },

  /**
   * Verify factuality and citations for an explanation/hint
   */
  async verifyExplanation(payload) {
    const response = await API.post('/factuality/verify-explanation', payload);
    return response.data;
  },

  /**
   * Verify batch flashcards
   */
  async verifyBatch(payload) {
    const response = await API.post('/factuality/verify-batch', payload);
    return response.data;
  },

  /**
   * Get verification report details by log ID
   */
  async getReport(id) {
    const response = await API.get(`/factuality/report/${id}`);
    return response.data;
  },

  /**
   * Apply suggested factual correction to flashcard or explanation
   */
  async applyCorrection(payload) {
    const response = await API.post('/factuality/apply-correction', payload);
    return response.data;
  },
};

export default factualityService;
