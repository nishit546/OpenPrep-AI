/**
 * @fileoverview Service for Bi-Directional AI Mind Map Visualizer & Dynamic Quiz Card Synthesis Engine
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const MindMap = require('../models/MindMap');

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

class BiDirectionalMindMapService {
  /**
   * Generate an interactive hierarchical Mind Map structure from input content
   * @param {Object} params
   * @param {string} params.userId
   * @param {string} params.content
   * @param {string} [params.title]
   * @param {string} [params.subjectId]
   * @param {string} [params.noteId]
   * @returns {Promise<Object>} Created/updated MindMap model instance
   */
  async generateBiDirectionalMindMap({ userId, content, title = 'Concept Mind Map', subjectId = null, noteId = null }) {
    if (!content || typeof content !== 'string' || content.trim().length < 10) {
      throw new Error('Content is required to generate a Mind Map.');
    }

    let graphData = {
      nodes: [],
      edges: [],
    };

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
You are an expert concept mapping AI. Analyze the following educational content and generate a bi-directional hierarchical Mind Map.

Content:
"${content.slice(0, 5000)}"

Return ONLY a valid JSON object matching this schema. Do not use markdown tags:
{
  "nodes": [
    {
      "id": "node-1",
      "label": "Short Concept Name",
      "description": "Clear 1-2 sentence core concept explanation",
      "category": "Core" | "Subtopic" | "Detail" | "Prerequisite",
      "masteryScore": 0,
      "status": "UNTESTED"
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "relationship": "leads to" | "depends on" | "contains" | "compares with"
    }
  ]
}
Ensure there are 6-12 well-connected nodes with meaningful educational relationships.
`;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response).text();
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        graphData = JSON.parse(cleanJson);
      } catch (err) {
        console.warn('BiDirectionalMindMap fallback triggered:', err.message);
        graphData = this.generateFallbackGraph(content);
      }
    } else {
      graphData = this.generateFallbackGraph(content);
    }

    // Default mastery scores and status for all nodes
    graphData.nodes = (graphData.nodes || []).map((node, idx) => ({
      id: node.id || `node-${idx + 1}`,
      label: node.label || `Concept ${idx + 1}`,
      description: node.description || 'Core concept node',
      category: node.category || 'Core',
      masteryScore: node.masteryScore ?? 0,
      status: node.status || 'UNTESTED',
    }));

    const mindMapRecord = await MindMap.create({
      user: userId,
      subject: subjectId,
      note: noteId,
      title: title || 'Bi-Directional Mind Map',
      nodesData: graphData,
    });

    return mindMapRecord;
  }

  /**
   * Synthesize dynamic active-recall quiz cards from selected Mind Map nodes
   * @param {Object} params
   * @param {string} params.mindMapId
   * @param {Array<string>} params.selectedNodeIds
   * @param {number} [params.numQuestions=4]
   * @returns {Promise<Array<Object>>} Synthesized Quiz Cards
   */
  async synthesizeQuizCardsFromNodes({ mindMapId, selectedNodeIds = [], numQuestions = 4 }) {
    let mindMapRecord = null;
    if (mindMapId) {
      mindMapRecord = await MindMap.findByPk(mindMapId);
    }

    const nodesData = mindMapRecord ? mindMapRecord.nodesData : { nodes: [], edges: [] };
    const allNodes = nodesData.nodes || [];
    const allEdges = nodesData.edges || [];

    const targetNodes = selectedNodeIds.length > 0
      ? allNodes.filter((n) => selectedNodeIds.includes(n.id))
      : allNodes;

    if (targetNodes.length === 0) {
      throw new Error('No target nodes selected for quiz card synthesis.');
    }

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `
You are an expert exam generator. Synthesize ${numQuestions} active-recall study quiz cards specifically based on these targeted Mind Map concept nodes and their connecting relationships.

Target Mind Map Nodes:
${JSON.stringify(targetNodes, null, 2)}

Connecting Edges/Relationships:
${JSON.stringify(allEdges, null, 2)}

Return ONLY a valid JSON array of quiz card objects without markdown codeblock formatting:
[
  {
    "id": "quiz-1",
    "targetNodeId": "matching node id from input",
    "nodeLabel": "Matching node label",
    "question": "Clear active-recall question testing this concept and its relationship?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact text of correct option",
    "explanation": "Detailed rationale connecting the concept nodes",
    "type": "multiple_choice"
  }
]
`;

        const result = await model.generateContent(prompt);
        const responseText = (await result.response).text();
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const cards = JSON.parse(cleanJson);
        if (Array.isArray(cards) && cards.length > 0) {
          return cards;
        }
      } catch (err) {
        console.warn('Quiz synthesis LLM fallback:', err.message);
      }
    }

    // Heuristic Fallback Synthesizer
    return targetNodes.slice(0, numQuestions).map((node, idx) => ({
      id: `quiz-card-${idx + 1}`,
      targetNodeId: node.id,
      nodeLabel: node.label,
      question: `What is the primary role or definition of "${node.label}"?`,
      options: [
        node.description,
        `An unrelated concept concept in ${node.category}`,
        `Secondary property of ${node.label}`,
        `Inverse relation of ${node.label}`,
      ],
      correctAnswer: node.description,
      explanation: `"${node.label}" is defined as: ${node.description}`,
      type: 'multiple_choice',
    }));
  }

  /**
   * Update node-level mastery score and visual heatmap status after a quiz response
   * @param {Object} params
   * @param {string} params.mindMapId
   * @param {string} params.nodeId
   * @param {boolean} params.isCorrect
   * @returns {Promise<Object>} Updated MindMap record and node status
   */
  async updateNodeMastery({ mindMapId, nodeId, isCorrect }) {
    const mindMapRecord = await MindMap.findByPk(mindMapId);
    if (!mindMapRecord) {
      throw new Error('Mind Map not found.');
    }

    const graphData = { ...mindMapRecord.nodesData };
    const nodes = graphData.nodes || [];
    const targetNode = nodes.find((n) => n.id === nodeId);

    if (!targetNode) {
      throw new Error(`Node ${nodeId} not found in Mind Map graph.`);
    }

    const currentScore = targetNode.masteryScore || 0;
    const newScore = isCorrect
      ? Math.min(100, currentScore + 25)
      : Math.max(0, currentScore - 20);

    targetNode.masteryScore = newScore;
    if (newScore >= 80) {
      targetNode.status = 'MASTERED';
    } else if (newScore >= 40) {
      targetNode.status = 'REVIEW_NEEDED';
    } else {
      targetNode.status = 'WEAK_CONCEPT';
    }

    mindMapRecord.nodesData = graphData;
    await mindMapRecord.save();

    return {
      mindMapId,
      nodeId,
      updatedNode: targetNode,
      graphData,
    };
  }

  /**
   * Update graph nodes and structural dependencies (node editing / additions)
   * @param {string} mindMapId 
   * @param {Object} updatedNodesData 
   * @returns {Promise<Object>}
   */
  async updateMindMapGraph(mindMapId, updatedNodesData) {
    const mindMapRecord = await MindMap.findByPk(mindMapId);
    if (!mindMapRecord) {
      throw new Error('Mind Map not found.');
    }

    mindMapRecord.nodesData = updatedNodesData;
    await mindMapRecord.save();
    return mindMapRecord;
  }

  /**
   * Fallback heuristic generator when LLM is unavailable
   */
  generateFallbackGraph(content) {
    const sentences = content.split(/(?<=[.?!])\s+/).filter((s) => s.length > 10);
    const nodes = sentences.slice(0, 6).map((sentence, idx) => ({
      id: `node-${idx + 1}`,
      label: sentence.slice(0, 25) + '...',
      description: sentence,
      category: idx === 0 ? 'Core' : 'Subtopic',
      masteryScore: 0,
      status: 'UNTESTED',
    }));

    const edges = [];
    for (let i = 1; i < nodes.length; i++) {
      edges.push({
        source: 'node-1',
        target: nodes[i].id,
        relationship: 'contains',
      });
    }

    return { nodes, edges };
  }
}

module.exports = new BiDirectionalMindMapService();
