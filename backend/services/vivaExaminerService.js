const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'your_gemini_api_key_here') ? new GoogleGenerativeAI(apiKey) : null;

const examinerSystemPrompt = `
You are an expert academic examiner conducting a strict yet supportive technical viva voce oral examination.
Your role is to test the student's depth of understanding, request derivations or deeper explanations when answers are brief or vague, and ask logical follow-up questions.
Keep your questions concise, professional, and targeted to academic concepts.
`;

/**
 * Generates an initial viva question for a given topic.
 * @param {string} topic
 * @returns {Promise<string>}
 */
async function generateInitialQuestion(topic) {
  if (!genAI) {
    return `Welcome to the viva voce examination for ${topic || 'General Studies'}. Let's begin: Can you explain the difference between processes and threads in Operating Systems, and how they share resources?`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      ${examinerSystemPrompt}
      Topic: ${topic}.
      Generate a foundational, open-ended oral viva question to test the student's understanding of this topic.
      Keep it clear, concise, and under 2 sentences. Return only the question text.
    `;
    const result = await model.generateContent(prompt);
    try {
      require('./metricsService').recordTokens(result, 'gemini-1.5-flash');
    } catch (e) {}
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  } catch (err) {
    logger.error('[VivaExaminer] First question generation failed:', err);
    return `Let's begin: Please explain the core working principles of ${topic || 'this topic'}.`;
  }
}

/**
 * Evaluates a user's response and generates the next follow-up question.
 * @param {string} currentQuestion
 * @param {string} userAnswer
 * @param {string} topic
 * @returns {Promise<object>}
 */
async function evaluateVivaResponse(currentQuestion, userAnswer, topic) {
  const fallbackResponse = {
    score: 8,
    feedback: 'Good response. Try to elaborate on structural elements and corner cases.',
    strengths: ['Clear definition of core concepts'],
    weaknesses: ['Lacks concrete examples'],
    nextQuestion: 'Can you explain the main limitations or trade-offs of the approach you just described?',
  };

  if (!genAI) {
    return fallbackResponse;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      ${examinerSystemPrompt}
      Topic: ${topic}
      Question asked: "${currentQuestion}"
      Student responded: "${userAnswer}"

      Evaluate the student's answer and determine a logical, slightly deeper follow-up question based on their answer.
      If their answer was vague, incorrect, or incomplete, prompt them to explain or derive the concepts further.

      Return STRICTLY a JSON object matching this structure:
      {
        "score": number (1 to 10 based on accuracy and clarity),
        "feedback": "string (constructive feedback, max 2 sentences)",
        "strengths": ["string"],
        "weaknesses": ["string"],
        "nextQuestion": "string (challenging follow-up question, under 2 sentences)"
      }
      Do not include any code block tags, markdown, or text outside the JSON object.
    `;

    const result = await model.generateContent(prompt);
    try {
      require('./metricsService').recordTokens(result, 'gemini-1.5-flash');
    } catch (e) {}
    const text = result.response.text().trim();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    logger.error('[VivaExaminer] Response evaluation failed:', err);
    return fallbackResponse;
  }
}

/**
 * Generates the final Performance Scorecard evaluation JSON
 * @param {string} topic
 * @param {object[]} turnsHistory
 * @returns {Promise<object>}
 */
async function generateFinalScorecard(topic, turnsHistory) {
  const fallbackScorecard = {
    score: 75,
    conceptualDepth: 70,
    technicalAccuracy: 80,
    communicationClarity: 75,
    vocabularyPrecision: 80,
    answerConciseness: 75,
    feedback: 'Good overall performance. Work on explaining mathematical derivations and structural edge cases more clearly.',
    masteryBreakdown: [
      { area: 'Technical Accuracy', score: 70 },
      { area: 'Conceptual Depth', score: 80 },
      { area: 'Communication Clarity', score: 75 },
      { area: 'Vocabulary Precision', score: 80 },
      { area: 'Answer Conciseness', score: 75 }
    ]
  };

  if (!genAI) {
    return fallbackScorecard;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const formattedHistory = turnsHistory
      .map((t) => `${t.speaker === 'AI' ? 'Examiner' : 'Student'}: ${t.text}`)
      .join('\n');

    const prompt = `
      You are an expert academic evaluator scoring a student's oral viva voce technical examination.
      Topic: ${topic}
      
      Analyze the interview transcript:
      ${formattedHistory}

      Evaluate performance out of 100 on five rubrics:
      1. Technical Accuracy (correctness of definitions, terms, and statements)
      2. Conceptual Depth (understanding of foundational concepts, ability to explain details)
      3. Communication Clarity (articulateness, focus of answer)
      4. Vocabulary Precision (use of proper domain terminology)
      5. Answer Conciseness (brevity and point-to-point delivery)

      Return STRICTLY a JSON object matching this structure:
      {
        "score": number (average score out of 100),
        "conceptualDepth": number (0-100),
        "technicalAccuracy": number (0-100),
        "communicationClarity": number (0-100),
        "vocabularyPrecision": number (0-100),
        "answerConciseness": number (0-100),
        "feedback": "string (verbal constructive advice)",
        "masteryBreakdown": [
          { "area": "Technical Accuracy", "score": number },
          { "area": "Conceptual Depth", "score": number },
          { "area": "Communication Clarity", "score": number },
          { "area": "Vocabulary Precision", "score": number },
          { "area": "Answer Conciseness", "score": number }
        ]
      }
      Do not include any code block tags, markdown, or text outside the JSON object.
    `;

    const result = await model.generateContent(prompt);
    try {
      require('./metricsService').recordTokens(result, 'gemini-1.5-flash');
    } catch (e) {}
    const text = result.response.text().trim();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (err) {
    logger.error('[VivaExaminer] Scorecard generation failed:', err);
    return fallbackScorecard;
  }
}

module.exports = {
  generateInitialQuestion,
  evaluateVivaResponse,
  generateFinalScorecard,
};
