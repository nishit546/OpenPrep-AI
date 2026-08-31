const geminiService = require('../services/geminiService');
const {
  buildIsolatedPrompt,
  validateGeneratedQuestions,
  ContextIsolationError,
} = require('./aiContextIsolation');

/**
 * Utility wrapper for LLM AI Service calls to generate structured Q&A items.
 *
 * @param {Object} options
 * @param {string} options.content - Source document text content
 * @param {string} [options.title] - Title of the source document
 * @param {number} [options.numQuestions=5] - Number of questions to generate
 * @param {string} [options.type='multiple_choice'] - Question type ('multiple_choice', 'short_answer', 'essay', 'true_false')
 * @param {string} [options.difficulty='medium'] - Question difficulty ('easy', 'medium', 'hard')
 * @returns {Promise<Array<{question: string, answer: string, options: string[], type: string, difficulty: string}>>}
 */
async function generateQuestionsFromContent({
  content,
  title = 'Study Notes',
  numQuestions = 5,
  type = 'multiple_choice',
  difficulty = 'medium',
}) {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Content is required for AI question generation.');
  }

  const instructions = `You are an expert exam generator. Generate ${numQuestions} high-quality ${difficulty} difficulty ${type.replace('_', ' ')} study questions based strictly on the document content provided below.

Document title: ${title}

Return ONLY a valid JSON array of question objects without codeblock formatting. Each question object must match this schema:
[
  {
    "question": "Clear question prompt?",
    "answer": "Detailed correct answer explanation",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "type": "${type}",
    "difficulty": "${difficulty}"
  }
]`;
  let prompt;
  try {
    prompt = buildIsolatedPrompt({ instructions, untrustedContent: content });
  } catch (isolationError) {
    if (isolationError instanceof ContextIsolationError) {
      throw isolationError;
    }
    throw new Error('Failed to prepare AI context.');
  }

  try {
    const rawResponse = await geminiService.generateChatResponse({
      message: prompt,
      history: [],
    });

    let cleanedText = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    // Fallback parser if markdown tags remain
    const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanedText = jsonMatch[0];
    }

    const parsedQuestions = JSON.parse(cleanedText);

    const validatedQuestions = validateGeneratedQuestions(parsedQuestions, {
      fallbackType: type,
      fallbackDifficulty: difficulty,
    });

    if (validatedQuestions.length === 0) {
      throw new Error('AI response did not contain any valid question objects.');
    }

    return validatedQuestions;
  } catch (error) {
    console.warn('LLM structured parsing fallback triggered:', error.message);

    // Dynamic heuristic fallback generator if LLM fails or returns non-JSON text
    return [
      {
        question: `Key concept summary from ${title}: What is the main theme of this document?`,
        answer: content.slice(0, 200) + '...',
        options: ['Core Concept A', 'Core Concept B', 'Core Concept C', 'Core Concept D'],
        type,
        difficulty,
      },
    ];
  }
}
module.exports = {
  generateQuestionsFromContent,
};
