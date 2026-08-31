/**
 * @fileoverview Controller for Bi-Directional Mind Map & Dynamic Quiz Card Synthesis Engine
 */
const biDirectionalMindMapService = require('../services/biDirectionalMindMapService');
const MindMap = require('../models/MindMap');

/**
 * Generate bi-directional mind map from study text or notes
 * @route POST /api/mindmap/generate-bidirectional
 * @access Private
 */
exports.generateMindMap = async (req, res, next) => {
  try {
    const { content, title, subjectId, noteId } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Content text is required to generate a Mind Map.',
      });
    }

    const mindMap = await biDirectionalMindMapService.generateBiDirectionalMindMap({
      userId: req.user.id,
      content,
      title: title || 'Bi-Directional Mind Map',
      subjectId: subjectId || null,
      noteId: noteId || null,
    });

    return res.status(201).json({
      success: true,
      data: mindMap,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Synthesize active-recall quiz cards from selected Mind Map nodes
 * @route POST /api/mindmap/synthesize-quiz-cards
 * @access Private
 */
exports.synthesizeQuizCards = async (req, res, next) => {
  try {
    const { mindMapId, selectedNodeIds, numQuestions = 4 } = req.body;

    const quizCards = await biDirectionalMindMapService.synthesizeQuizCardsFromNodes({
      mindMapId,
      selectedNodeIds: selectedNodeIds || [],
      numQuestions: Number(numQuestions) || 4,
    });

    return res.status(200).json({
      success: true,
      count: quizCards.length,
      data: quizCards,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record user response to quiz card and update Mind Map node mastery heatmap
 * @route POST /api/mindmap/:id/record-node-mastery
 * @access Private
 */
exports.recordNodeMastery = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nodeId, isCorrect } = req.body;

    if (!nodeId || typeof isCorrect !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'nodeId and boolean isCorrect flag are required.',
      });
    }

    const result = await biDirectionalMindMapService.updateNodeMastery({
      mindMapId: id,
      nodeId,
      isCorrect,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update mind map structural graph layout or nodes
 * @route PUT /api/mindmap/:id/update-graph
 * @access Private
 */
exports.updateGraph = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { nodesData } = req.body;

    if (!nodesData) {
      return res.status(400).json({
        success: false,
        error: 'nodesData is required.',
      });
    }

    const updatedMap = await biDirectionalMindMapService.updateMindMapGraph(id, nodesData);

    return res.status(200).json({
      success: true,
      data: updatedMap,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch saved Mind Map by ID
 * @route GET /api/mindmap/:id
 * @access Private
 */
exports.getMindMap = async (req, res, next) => {
  try {
    const mindMap = await MindMap.findOne({
      where: {
        id: req.params.id,
        user: req.user.id,
      },
    });

    if (!mindMap) {
      return res.status(404).json({
        success: false,
        error: 'Mind Map not found.',
      });
    }

    return res.status(200).json({
      success: true,
      data: mindMap,
    });
  } catch (error) {
    next(error);
  }
};
