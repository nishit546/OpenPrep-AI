const { GoogleGenAI } = require('@google/genai');
const Quiz = require('../models/Quiz');
const prompts = require('../config/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.getNextAdaptiveQuestion = async (req, res, next) => {
  try {
    const { quizId, currentStreak, streakType, currentDifficulty, answeredQuestionIds } = req.body;

    let nextDifficulty = currentDifficulty || 'Medium';

    // Adjust difficulty after every 3 consecutive correct or incorrect answers
    if (currentStreak >= 3) {
      if (streakType === 'correct' && currentDifficulty === 'Easy') nextDifficulty = 'Medium';
      else if (streakType === 'correct' && currentDifficulty === 'Medium') nextDifficulty = 'Hard';
      else if (streakType === 'incorrect' && currentDifficulty === 'Hard') nextDifficulty = 'Medium';
      else if (streakType === 'incorrect' && currentDifficulty === 'Medium') nextDifficulty = 'Easy';
    }

    const prompt = prompts.adaptiveQuiz.getNextAdaptiveQuestion(nextDifficulty, answeredQuestionIds);

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

    const questionData = JSON.parse(response.text);

    res.status(200).json({
      success: true,
      difficulty: nextDifficulty,
      question: questionData,
    });
  } catch (error) {
    next(error);
  }
};
