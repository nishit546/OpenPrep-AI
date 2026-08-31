const { GoogleGenAI } = require('@google/genai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const prompts = require('../config/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.generateQuizFromPdf = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a valid PDF chapter file (up to 15MB)' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    
    // Clean up temporary uploaded file
    fs.unlinkSync(req.file.path);

    const extractedText = pdfData.text.slice(0, 15000); // Limit context window length if necessary

    const prompt = prompts.pdfQuiz.generateQuizFromPdf(extractedText);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    try {
      require('../services/metricsService').recordTokensConsumed(
        'gemini-2.5-flash',
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
      );
    } catch (e) {}

    const quizData = JSON.parse(response.text);

    res.status(200).json({
      success: true,
      quiz: quizData,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
