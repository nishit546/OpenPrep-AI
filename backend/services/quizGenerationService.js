/**
 * @fileoverview Enhanced quiz generation service with validation pipeline
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const quizValidationService = require('./quizValidationService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

const MAX_RETRIES = 3;
const geminiService = require('./geminiService');
const AIContractVersioningService = require('./aiContractVersioningService');
const AIGenerationCacheService = require('./aiGenerationCacheService');/**
// Check cache first
const cacheKey = AIGenerationCacheService.generateFingerprint('quiz-generation', {
  content: notes,
  parameters: options,
  contractVersion: contract.version,
  modelConfig: contract.modelConfig,
});

const cached = await AIGenerationCacheService.getCachedResult(
  cacheKey.fingerprint,
  userId,
  contract.version
);

let quizzes;
if (cached) {
  quizzes = JSON.parse(cached.result);
} else {
  quizzes = await geminiService.generateQuizzes(notes, options);
  await AIGenerationCacheService.cacheResult(
    cacheKey.fingerprint,
    'quiz-generation',
    userId,
    contract.version,
    cacheKey.inputHash,
    JSON.stringify(quizzes),
    { model: 'gemini-pro', timestamp: new Date() }
  );
} 
* Generates a single quiz question with validation and retry logic
 * @param {string} topic - Topic for the question
 * @param {string} difficulty - Difficulty level
 * @param {string} sourceContext - Source material for grounding
 * @param {Array} existingQuestions - Previously generated questions
 * @param {string} quizId - Quiz ID for logging
 * @returns {Promise<Object>} Validated question or null if max retries exceeded
 */
async function generateQuestionWithValidation(
  topic,
  difficulty,
  sourceContext,
  existingQuestions = [],
  quizId
) {
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    try {
      // Generate question via Gemini
      const question = await generateSingleQuestion(topic, difficulty, sourceContext);

      // Parse JSON response
      const parsedQuestion = JSON.parse(question);

      // Validate the question
      const validationResult = await quizValidationService.validateQuestion(
        parsedQuestion,
        quizId,
        { sourceContext, existingQuestions }
      );

      if (validationResult.isValid) {
        return parsedQuestion;
      }

      // Log retry
      retryCount++;
      console.log(`Question validation failed. Retry ${retryCount}/${MAX_RETRIES}`);
    } catch (error) {
      retryCount++;
      console.error(`Generation error (attempt ${retryCount}):`, error.message);

      if (retryCount >= MAX_RETRIES) {
        console.error(`Max retries exceeded for topic: ${topic}`);
        return null;
      }
    }
  }

  return null;
}

/**
 * Generates a single question using Gemini
 * @param {string} topic - Topic for the question
 * @param {string} difficulty - Difficulty level
 * @param {string} sourceContext - Source material
 * @returns {Promise<string>} JSON string of question
 */
async function generateSingleQuestion(topic, difficulty, sourceContext) {
  const prompt = `
Generate a ${difficulty} multiple-choice question about "${topic}".

Reference material:
${sourceContext}

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "text": "The question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": "Option A",
  "explanation": "Detailed explanation grounded in the reference material.",
  "difficulty": "${difficulty}",
  "category": "${topic}"
}

Rules:
- Exactly one option must be the correct answer
- Options must be distinct and realistic
- Explanation must reference the source material
- Ensure the question is clear and unambiguous
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}

/**
 * Generates multiple questions with validation
 * @param {string} topic - Topic for questions
 * @param {number} count - Number of questions to generate
 * @param {string} sourceContext - Source material
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Array>} Array of validated questions
 */
async function generateQuestionsWithValidation(topic, count, sourceContext, quizId) {
  const questions = [];
  const difficulties = ['easy', 'medium', 'hard'];

  for (let i = 0; i < count; i++) {
    const difficulty = difficulties[i % difficulties.length];
    
    const question = await generateQuestionWithValidation(
      topic,
      difficulty,
      sourceContext,
      questions,
      quizId
    );

    if (question) {
      questions.push(question);
    } else {
      console.warn(`Failed to generate question ${i + 1}/${count} after max retries`);
    }
  }

  return questions;
}

module.exports = {
  generateQuestionWithValidation,
  generateSingleQuestion,
  generateQuestionsWithValidation,
};
