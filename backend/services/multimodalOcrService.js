const { GoogleGenerativeAI } = require('@google/generative-ai');
const sharp = require('sharp');

/**
 * Preprocesses a STEM handwritten/diagram image using sharp.
 * - Converts to grayscale
 * - Applies noise reduction (median filter)
 * - Applies adaptive threshold binarization
 * - Resizes the image to a maximum of 1200x1200px (preserving aspect ratio) to optimize API ingestion
 */
async function preprocessDiagramImage(imageBuffer) {
  try {
    let pipeline = sharp(imageBuffer);
    
    // Validate image format/corruptness first by getting metadata
    const metadata = await pipeline.metadata();
    if (!['jpeg', 'png', 'webp', 'gif', 'tiff'].includes(metadata.format)) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }

    // Process image
    const processed = await pipeline
      .grayscale()
      .median(3) // Noise reduction
      .threshold(128) // Binarization
      .resize({
        width: 1200,
        height: 1200,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toBuffer();

    return processed;
  } catch (err) {
    console.error('[MultimodalOcrService] Sharp preprocessing failed:', err.message);
    throw new Error(`Image preprocessing failed: ${err.message}`);
  }
}

/**
 * Invokes Gemini 1.5 Pro Multimodal Vision API to parse diagram or math formulas.
 */
async function parseDiagramOcr(imageBuffer, mimeType = 'image/jpeg') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  // Validate mimeType
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
    throw new Error(`Invalid MIME type: ${mimeType}. Only JPG, PNG, and WEBP are supported.`);
  }

  // Preprocess the diagram image
  const preprocessedBuffer = await preprocessDiagramImage(imageBuffer);

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-1.5-pro for complex STEM/LaTeX recognition
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

  const prompt = `
    You are an expert STEM educator, mathematician, and diagram analyst.
    Analyze the uploaded preprocessed image. It may contain a handwritten math formula, a physics/chemistry/engineering diagram, or a textbook question.
    
    Please perform the following:
    1. Transcribe the formulas or text labels into highly accurate standard LaTeX (enclosed in $...$ for inline or $$...$$ for blocks).
    2. If the image depicts a diagram (like circuits, benzene rings, force diagrams), transcribe all labels/variables and describe the structure clearly.
    3. If there is a question or equation to solve, provide a clear, rigorous step-by-step mathematical explanation/solution.
    4. Identify 2-4 concept tags (e.g., "calculus", "organic-chemistry", "circuits", "linear-algebra").
    
    Provide the output in the following JSON structure:
    {
      "latex": "Transcribed LaTeX text or diagram structure description",
      "solution": "Step-by-step explanation or solution, formatted in Markdown/LaTeX",
      "conceptTags": ["tag1", "tag2"]
    }
  `;

  const imagePart = {
    inlineData: {
      data: preprocessedBuffer.toString('base64'),
      mimeType,
    },
  };

  try {
    const result = await model.generateContent({
      contents: [prompt, imagePart],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const text = result.response.text();
    if (!text || text.trim() === '') {
      throw new Error('Received empty response from Gemini Multimodal API. The image might be too blurry or unreadable.');
    }

    const parsed = JSON.parse(text);
    return {
      latex: parsed.latex || '',
      solution: parsed.solution || '',
      conceptTags: parsed.conceptTags || [],
      success: true,
    };
  } catch (err) {
    console.error('[MultimodalOcrService] Gemini parsing failed:', err.message);
    throw new Error(`Failed to solve handwritten formula / diagram: ${err.message}`);
  }
}

module.exports = {
  preprocessDiagramImage,
  parseDiagramOcr,
};
