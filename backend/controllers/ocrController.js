const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const prompts = require('../config/prompts');
const multimodalOcrService = require('../services/multimodalOcrService');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

exports.processHandwrittenNote = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file (JPG, PNG, WEBP)' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Read file data for Gemini Vision API
    const imagePart = {
      inlineData: {
        data: Buffer.from(fs.readFileSync(filePath)).toString('base64'),
        mimeType: mimeType,
      },
    };

    const prompt = prompts.ocr.processHandwrittenNote();

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, imagePart],
    });

    try {
      require('../services/metricsService').recordTokensConsumed(
        'gemini-2.5-flash',
        response.usageMetadata?.promptTokenCount,
        response.usageMetadata?.candidatesTokenCount
      );
    } catch (e) {}

    // Clean up temporary uploaded file
    fs.unlinkSync(filePath);

    res.status(200).json({
      success: true,
      markdown: response.text,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * Parses STEM diagram or mathematical equations from an uploaded image.
 * POST /api/ocr/parse-diagram
 */
exports.parseDiagram = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image file (JPG, PNG, WEBP)' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Validate MIME type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        error: `Invalid file type: ${mimeType}. Only JPG, PNG, and WEBP are supported.`,
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const result = await multimodalOcrService.parseDiagramOcr(fileBuffer, mimeType);

    // Clean up temporary file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};
