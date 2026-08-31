/**
 * @fileoverview Service for analyzing task descriptions and deadlines to auto-assign Eisenhower Matrix quadrants.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Analyzes a task and returns its quadrant, estimated time, and reasoning.
 * Quadrants: 1 (Do First), 2 (Schedule), 3 (Delegate), 4 (Eliminate)
 * 
 * @param {string} description - The task description.
 * @param {string} deadline - The task deadline (ISO string or relative time).
 * @returns {Promise<Object>} Structured task analysis.
 */
async function analyzeTask(description, deadline) {
    try {
        const prompt = `
      You are an expert productivity coach. Analyze the following study task and categorize it using the Eisenhower Matrix.
      Task Description: "${description}"
      Deadline: "${deadline || 'None specified'}"

      Return a STRICT JSON object. Do not include markdown formatting.
      Schema:
      {
        "quadrant": 1 | 2 | 3 | 4,
        "quadrantName": "Do First" | "Schedule" | "Delegate" | "Eliminate",
        "estimatedTimeMinutes": number (your best guess for how long this will take, e.g., 30, 60, 120),
        "reasoning": "string (brief 1-2 sentence explanation of why it belongs in this quadrant)"
      }
      
      Rules:
      - Quadrant 1: Urgent and Important (e.g., exam tomorrow, assignment due today).
      - Quadrant 2: Not Urgent but Important (e.g., long-term project, regular review).
      - Quadrant 3: Urgent but Not Important (e.g., minor administrative task with tight deadline).
      - Quadrant 4: Not Urgent and Not Important (e.g., organizing already organized notes).
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('Error analyzing task:', error.message);
        // Fallback to default Quadrant 2 if AI fails
        return {
            quadrant: 2,
            quadrantName: 'Schedule',
            estimatedTimeMinutes: 60,
            reasoning: 'Default categorization due to analysis error.'
        };
    }
}

module.exports = {
    analyzeTask,
};
