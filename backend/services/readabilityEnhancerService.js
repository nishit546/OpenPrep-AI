/**
 * @fileoverview Service for analyzing and simplifying dense academic text for diverse learning needs.
 * Utilizes the Gemini API to generate plain English summaries, glossaries, and audio scripts.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Processes text to improve readability based on the target audience.
 * 
 * @param {string} text - The original dense academic text.
 * @param {string} readingLevel - 'layman', 'high_school', or 'undergraduate'.
 * @returns {Promise<Object>} Enhanced text, glossary, and audio script.
 */
async function enhanceReadability(text, readingLevel) {
    try {
        const levelDescription = {
            layman: 'simple, everyday language for a complete beginner',
            high_school: 'clear, structured language suitable for a high school student',
            undergraduate: 'concise, academic but accessible language for college students'
        }[readingLevel] || 'clear, accessible language';

        const prompt = `
      You are an expert educational accessibility assistant. 
      Rewrite the following academic text to be understood at a "${levelDescription}" level.
      
      Original Text:
      """${text.substring(0, 3000)}"""

      Return a STRICT JSON object with the following schema. Do not include markdown formatting:
      {
        "simplifiedText": "string (the rewritten, easy-to-read version of the text)",
        "glossary": [
          {
            "term": "string (complex academic term from original text)",
            "simpleDefinition": "string (plain English explanation)"
          }
        ],
        "audioScript": "string (a conversational, audio-friendly version of the simplified text, optimized for Text-to-Speech)"
      }
      Ensure the glossary contains 3-5 key terms.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error enhancing readability:', error.message);
        throw new Error('Failed to process text. Please ensure the text is valid and try again.');
    }
}

module.exports = {
    enhanceReadability,
};
