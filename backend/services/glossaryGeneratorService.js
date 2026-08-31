/**
 * @fileoverview Service for generating contextual definitions, related concepts, and examples for selected text.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Generates a concise definition, related concepts, and an example sentence for a selected term.
 * 
 * @param {string} term - The selected word or phrase.
 * @param {string} context - The surrounding sentence or paragraph (optional but recommended).
 * @returns {Promise<Object>} Structured glossary entry.
 */
async function generateGlossaryEntry(term, context = '') {
    try {
        const prompt = `
      You are an expert academic tutor. Provide a clear, concise explanation for the following term.
      Term: "${term}"
      Context: "${context || 'No specific context provided'}"

      Return a STRICT JSON object. Do not include markdown formatting.
      Schema:
      {
        "definition": "string (1-2 sentence clear definition)",
        "relatedConcepts": ["string", "string", "string"],
        "exampleSentence": "string (an example sentence using the term in an academic context)"
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error generating glossary entry:', error.message);
        throw new Error('Failed to generate definition. Please try selecting a different term.');
    }
}

module.exports = {
    generateGlossaryEntry,
};
