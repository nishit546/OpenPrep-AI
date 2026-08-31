/**
 * @fileoverview Service for parsing lecture slides and generating slide-specific quiz questions.
 * Utilizes the Gemini API to create targeted multiple-choice questions based on slide content.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Mock function to simulate extracting text content per slide from a PDF/PPTX.
 * In production, use libraries like 'pdf-parse' or 'pptx-parser'.
 * 
 * @param {Buffer} fileBuffer - The uploaded slide document buffer.
 * @returns {Promise<Array>} Array of objects containing slideNumber and textContent.
 */
async function extractSlideContent(fileBuffer) {
    // Simulated extraction delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock extracted slides for demonstration
    return [
        {
            slideNumber: 1,
            title: "Introduction to Cellular Respiration",
            content: "Cellular respiration is the process by which organisms combine oxygen with foodstuff molecules, diverting the chemical energy in these substances into life-sustaining activities and discarding, as waste products, carbon dioxide and water. It includes glycolysis, the Krebs cycle, and the electron transport chain."
        },
        {
            slideNumber: 2,
            title: "Glycolysis Overview",
            content: "Glycolysis is the first step of cellular respiration. It occurs in the cytoplasm and does not require oxygen (anaerobic). One molecule of glucose is broken down into two molecules of pyruvate, producing a net gain of 2 ATP and 2 NADH molecules."
        }
    ];
}

/**
 * Generates interactive quiz questions for a specific slide's content.
 * 
 * @param {number} slideNumber - The slide number.
 * @param {string} title - The slide title.
 * @param {string} content - The extracted text content of the slide.
 * @returns {Promise<Object>} Structured quiz data for the slide.
 */
async function generateSlideQuiz(slideNumber, title, content) {
    try {
        const prompt = `
      You are an expert educational content creator. Based on the following lecture slide content, generate exactly 2 high-quality multiple-choice questions to test active recall.
      
      Slide ${slideNumber}: ${title}
      Content: "${content}"

      Return a STRICT JSON array of 2 objects. Do not include markdown formatting or extra text.
      Schema for each question:
      {
        "question": "string (the question text)",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string (must exactly match one of the options)",
        "explanation": "string (brief explanation of why the answer is correct, referencing the slide content)"
      }
      Ensure distractors are plausible and directly related to the topic.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const cleanJson = response.text().replace(/```json\n?|\n?```/g, '').trim();

        return {
            slideNumber,
            title,
            content,
            questions: JSON.parse(cleanJson)
        };
    } catch (error) {
        console.error(`Error generating quiz for slide ${slideNumber}:`, error.message);
        // Fallback to empty questions array if generation fails
        return {
            slideNumber,
            title,
            content,
            questions: []
        };
    }
}

/**
 * Processes the entire document and generates quizzes for all slides.
 */
async function processDocumentToQuiz(fileBuffer) {
    const slides = await extractSlideContent(fileBuffer);
    const quizResults = [];

    for (const slide of slides) {
        const quizData = await generateSlideQuiz(slide.slideNumber, slide.title, slide.content);
        quizResults.push(quizData);
    }

    return quizResults;
}

module.exports = {
    extractSlideContent,
    generateSlideQuiz,
    processDocumentToQuiz,
};
