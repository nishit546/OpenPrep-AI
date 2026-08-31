import API from './api';

/**
 * Frontend API client for AI Subjective Answer Grader Engine
 */
export const subjectiveGraderService = {
  /**
   * Evaluate a student's subjective text answer against a rubric and model answer
   */
  async evaluateAnswer(payload) {
    const response = await API.post('/subjective-grader/evaluate', payload);
    return response.data;
  },

  /**
   * Generate AI rubric template for a question & model answer
   */
  async generateRubric(payload) {
    const response = await API.post('/subjective-grader/generate-rubric', payload);
    return response.data;
  },
};

export default subjectiveGraderService;
