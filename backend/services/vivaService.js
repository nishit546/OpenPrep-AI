const vivaExaminerService = require('./vivaExaminerService');

/**
 * Generates the initial technical question for the subject
 * @param {string} subjectName
 * @returns {Promise<string>}
 */
const generateFirstQuestion = async (subjectName) => {
  return vivaExaminerService.generateInitialQuestion(subjectName);
};

/**
 * Generates follow-up technical questions based on history and student answer
 * @param {string} subjectName
 * @param {object[]} turnsHistory
 * @param {string} studentAnswer
 * @returns {Promise<string>}
 */
const generateFollowUp = async (subjectName, turnsHistory, studentAnswer) => {
  const lastAITurn = [...turnsHistory].reverse().find(t => t.speaker === 'AI');
  const currentQuestion = lastAITurn ? lastAITurn.text : 'Can you explain this concept further?';

  const result = await vivaExaminerService.evaluateVivaResponse(currentQuestion, studentAnswer, subjectName);
  return result.nextQuestion;
};

/**
 * Generates final Performance Scorecard evaluation JSON
 * @param {string} subjectName
 * @param {object[]} turnsHistory
 * @returns {Promise<object>}
 */
const generateFinalScorecard = async (subjectName, turnsHistory) => {
  return vivaExaminerService.generateFinalScorecard(subjectName, turnsHistory);
};

module.exports = {
  generateFirstQuestion,
  generateFollowUp,
  generateFinalScorecard,
};
