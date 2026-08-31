import API from './api';

/**
 * Frontend API client for Bi-Directional AI Mind Map Visualizer & Dynamic Quiz Card Synthesis Engine
 */
export const biDirectionalMindMapService = {
  /**
   * Generate bi-directional mind map from study text or notes
   */
  async generateMindMap(payload) {
    const response = await API.post('/mindmap/generate-bidirectional', payload);
    return response.data;
  },

  /**
   * Synthesize active-recall quiz cards from selected Mind Map nodes
   */
  async synthesizeQuizCards(payload) {
    const response = await API.post('/mindmap/synthesize-quiz-cards', payload);
    return response.data;
  },

  /**
   * Record user response to a quiz card and update Mind Map node mastery heatmap
   */
  async recordNodeMastery(mindMapId, payload) {
    const response = await API.post(`/mindmap/${mindMapId}/record-node-mastery`, payload);
    return response.data;
  },

  /**
   * Update structural graph nodes or layout
   */
  async updateGraph(mindMapId, payload) {
    const response = await API.put(`/mindmap/${mindMapId}/update-graph`, payload);
    return response.data;
  },

  /**
   * Fetch Mind Map by ID
   */
  async getMindMap(mindMapId) {
    const response = await API.get(`/mindmap/${mindMapId}`);
    return response.data;
  },
};

export default biDirectionalMindMapService;
