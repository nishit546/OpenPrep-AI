const { GoogleGenAI } = require('@google/genai');
const { Op } = require('sequelize');
const Quiz = require('../models/Quiz');
const PYQQuestion = require('../models/PYQQuestion');
const prompts = require('../config/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.getEnhancedExplanation = async (req, res, next) => {
  try {
    const { questionId } = req.params;
    let questionText = null;
    let correctAnswer = null;
    let explanationText = null;

    // 1. Try to find inside Quiz JSONB array
    const quizWithQ = await Quiz.findOne({
      where: {
        questions: {
          [Op.contains]: [{ _id: questionId }]
        }
      }
    });

    if (quizWithQ) {
      const q = quizWithQ.questions.find(q => q._id === questionId);
      if (q) {
        questionText = q.questionText;
        if (q.questionType === 'SUBJECTIVE') {
          correctAnswer = q.correctAnswer || q.explanation || "Detailed subjective explanation required.";
        } else {
          correctAnswer = (q.options && q.correctOption !== undefined) ? q.options[q.correctOption] : (q.correctAnswer || '');
        }
        explanationText = q.explanation;
      }
    } else {
      // 2. Try PYQQuestion
      const pyqQ = await PYQQuestion.findByPk(questionId);
      if (pyqQ) {
        questionText = pyqQ.questionText;
        correctAnswer = "Refer to standard solution guidelines for PYQ.";
      }
    }

    if (!questionText) {
      return res.status(404).json({ success: false, error: 'Question not found' });
    }

    const prompt = prompts.solutionExplainer.getEnhancedExplanation(questionText, correctAnswer, explanationText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    try {
      require('../services/metricsService').recordTokensConsumed(
        'gemini-2.5-flash',
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
      );
    } catch (e) {}

    const explanationData = JSON.parse(response.text);

    res.status(200).json({
      success: true,
      explanation: explanationData,
    });
  } catch (error) {
    next(error);
  }
};
