/**
 * @fileoverview Controller for managing code review requests and AI review generation.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
// const CodeReview = require('../models/CodeReview');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Creates a new code review request.
 */
const createReview = async (req, res) => {
    try {
        const { title, code, language, description } = req.body;
        // const authorId = req.user.id;

        if (!code || !language) {
            return res.status(400).json({ success: false, message: 'Code and language are required.' });
        }

        const reviewId = `review_${Date.now()}`;

        // Mock DB creation
        const newReview = {
            id: reviewId,
            title,
            code,
            language,
            description,
            status: 'open',
            createdAt: new Date().toISOString()
        };

        res.status(201).json({ success: true, data: newReview });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Fetches a specific code review by ID.
 */
const getReview = async (req, res) => {
    try {
        const { id } = req.params;

        // Mock DB fetch
        const mockReview = {
            id,
            title: 'Optimize Bubble Sort Implementation',
            code: 'function bubbleSort(arr) {\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = 0; j < arr.length - i - 1; j++) {\n      if (arr[j] > arr[j + 1]) {\n        let temp = arr[j];\n        arr[j] = arr[j + 1];\n        arr[j + 1] = temp;\n      }\n    }\n  }\n  return arr;\n}',
            language: 'javascript',
            description: 'Can this be optimized further?',
            status: 'open'
        };

        res.status(200).json({ success: true, data: mockReview });
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * Requests an automated AI review of the code.
 */
const requestAiReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, language } = req.body;

        const prompt = `
      You are a senior software engineer conducting a code review.
      Language: ${language}
      Code:
      \`\`\`${language}
      ${code}
      \`\`\`
      Provide a concise, objective review in JSON format:
      {
        "summary": "string (1-2 sentence overall assessment)",
        "suggestions": ["string (actionable improvement 1)", "string (actionable improvement 2)"]
      }
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();
        const aiReview = JSON.parse(cleanJson);

        res.status(200).json({ success: true, data: aiReview });
    } catch (error) {
        console.error('Error requesting AI review:', error);
        res.status(500).json({ success: false, message: 'Failed to generate AI review.' });
    }
};

module.exports = {
    createReview,
    getReview,
    requestAiReview,
};
