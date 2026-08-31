const { GoogleGenAI } = require('@google/genai');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const PYQDraft = require('../models/PYQDraft'); // Draft review queue model
const prompts = require('../config/prompts');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.parsePyqPdf = async (req, res, next) => {
  const startTime = Date.now();
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a multi-page PYQ PDF file.' });
    }

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    
    // Clean up temporary uploaded file
    fs.unlinkSync(req.file.path);

    const extractedText = pdfData.text;

    const prompt = prompts.pyqParser.parsePyqPdf(extractedText);

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

    const parsedData = JSON.parse(response.text);

    // Store extracted questions in draft review queue
    const draftRecords = [];
    if (parsedData.questions && Array.isArray(parsedData.questions)) {
      for (const q of parsedData.questions) {
        const draft = await PYQDraft.create({
          paperTitle: parsedData.paperTitle || 'PYQ Paper',
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          topic: q.topicCategorization,
          year: q.yearMetadata,
          status: 'pending_review',
        });
        draftRecords.push(draft);
      }
    }

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      executionTimeMs: executionTime,
      totalParsed: draftRecords.length,
      paperTitle: parsedData.paperTitle,
      drafts: draftRecords,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
