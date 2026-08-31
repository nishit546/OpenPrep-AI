import API from './api';

const burnoutApi = {
  /**
   * Submit a new burnout assessment.
   * POST /api/burnout/assess
   */
  submitAssessment: (data) => API.post('/burnout/assess', data),

  /**
   * Get the current burnout risk summary.
   * GET /api/burnout/summary
   */
  getRiskSummary: () => API.get('/burnout/summary'),

  /**
   * Get the full dashboard overview.
   * GET /api/burnout/dashboard
   */
  getDashboard: () => API.get('/burnout/dashboard'),

  /**
   * Get assessment history with pagination.
   * GET /api/burnout/history
   */
  getAssessmentHistory: (params = {}) =>
    API.get('/burnout/history', { params }),

  /**
   * Get personalised recommendations.
   * GET /api/burnout/recommendations
   */
  getRecommendations: () => API.get('/burnout/recommendations'),

  /**
   * Get risk trend data for charting.
   * GET /api/burnout/trend
   */
  getRiskTrend: (days = 30) => API.get('/burnout/trend', { params: { days } }),

  /**
   * Get the daily check-in prompt.
   * GET /api/burnout/daily-checkin
   */
  getDailyCheckin: () => API.get('/burnout/daily-checkin'),
};

export default burnoutApi;
