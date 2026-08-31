/**
 * @fileoverview Service for explaining code snippets line-by-line and identifying bugs/optimizations.
 * Utilizes the Gemini API to provide structured, educational feedback for CS students.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Analyzes a code snippet and returns line-by-line explanations, bugs, and optimized code.
 * 
 * @param {string} code - The source code to analyze.
 * @param {string} language - The programming language (e.g., 'python', 'javascript', 'java', 'cpp').
 * @returns {Promise<Object>} Structured analysis including line explanations, bugs, and optimized code.
 */
async function explainAndDebugCode(code, language) {
    try {
        const prompt = `
      You are an expert computer science tutor and senior software engineer. 
      Analyze the following ${language} code snippet.
      
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`

      Return a STRICT JSON object with the following schema. Do not include markdown formatting or extra text:
      {
        "lineExplanations": [
          {
            "lineNumber": number,
            "code": "string (the exact code on this line)",
            "explanation": "string (plain-English explanation of what this line does)"
          }
        ],
        "bugs": [
          {
            "lineNumber": number,
            "issue": "string (description of the bug or inefficiency)",
            "severity": "high" | "medium" | "low"
          }
        ],
        "optimizedCode": "string (the fully refactored, optimized, and bug-free version of the code)"
      }
      Ensure line numbers are 1-indexed. If no bugs are found, return an empty array for "bugs".
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error explaining code:', error.message);
        throw new Error('Failed to analyze code. Please ensure the snippet is valid and try again.');
    }
}

module.exports = {
    explainAndDebugCode,
};
