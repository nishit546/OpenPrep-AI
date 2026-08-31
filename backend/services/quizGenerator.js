const { GoogleGenAI } = require('@google/genai');
const { evaluateQuestionQuality } = require('./distractorEvaluator');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock-api-key' });

async function generateHighQualityQuestion(subjectTopic, maxRetries = 3) {
  let attempts = 0;
  let questionJson = null;

  while (attempts < maxRetries) {
    attempts++;
    
    // 1. Prompt Gemini for a standard multiple-choice question layout
    const basePrompt = `Generate one challenging multiple-choice question about "${subjectTopic}". 
    Return exactly a JSON object with keys: "questionStem", "correctAnswer", and "distractors" (array of 3 items). 
    Ensure distractors avoid absolute giveaways and match the correct answer's length profile. 
    Output raw, valid JSON only.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: basePrompt,
      });

      questionJson = JSON.parse(response.text.trim());
      
      // 2. Route the output through the psychometric quality gate
      const evaluation = evaluateQuestionQuality(
        questionJson.questionStem,
        questionJson.correctAnswer,
        questionJson.distractors
      );

      questionJson.diagnosticMetrics = evaluation.metrics;

      if (evaluation.passesQualityGate) {
        console.log(`[QUALITY GATE PASSED] Question cleared successfully on attempt ${attempts}.`);
        return questionJson;
      }
      
      console.warn(`[QUALITY GATE REJECTED] Attempt ${attempts} failed quality metrics. Regenerating alternatives...`);
    } catch (parseError) {
      console.error('[PARSE ERROR] Retrying due to invalid JSON payload:', parseError.message);
    }
  }

  // Fallback return if maximum repair limits are breached
  return questionJson;
}

module.exports = { generateHighQualityQuestion };
