const { GoogleGenerativeAI } = require('@google/generative-ai');
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Heuristic fallback Cloze generator when AI is offline or quota reached
 */
function heuristicClozeExtract(text, count = 5) {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const clozeCards = [];
  const importantKeywords = [
    'is defined as',
    'refers to',
    'consists of',
    'discovered by',
    'principle',
    'formula',
    'equation',
    'characterized by',
    'responsible for',
    'measured in',
    'synthesized in',
  ];

  for (let i = 0; i < sentences.length && clozeCards.length < count; i++) {
    const sentence = sentences[i];
    const words = sentence.split(/\s+/);

    if (words.length >= 6) {
      // Find candidate keyword or capitalize noun
      let targetWordIdx = -1;
      for (let wIdx = 0; wIdx < words.length; wIdx++) {
        const cleanWord = words[wIdx].replace(/[^a-zA-Z0-9]/g, '');
        if (cleanWord.length >= 5 && /^[A-Z]/.test(cleanWord) && wIdx > 0) {
          targetWordIdx = wIdx;
          break;
        }
      }

      if (targetWordIdx === -1) {
        targetWordIdx = Math.floor(words.length / 2);
      }

      const targetWord = words[targetWordIdx].replace(/[.,;:]/g, '');
      const clozeSentence = words
        .map((w, idx) => (idx === targetWordIdx ? `{{c1::${targetWord}}}` : w))
        .join(' ');

      clozeCards.push({
        front: clozeSentence,
        back: `Answer: ${targetWord}\n\nContext: ${sentence}`,
        clozeTerm: targetWord,
        hint: 'Key Term',
        isCloze: true,
      });
    }
  }

  return clozeCards;
}

/**
 * AI Cloze Deletion Extraction Service
 * Analyzes study notes or textbook excerpts and generates high-yield cloze deletions with hints.
 */
async function generateClozeCardsFromText(text, { count = 5, subject = 'General' } = {}) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (!genAI) {
    return heuristicClozeExtract(text, count);
  }

  const prompt = `You are an expert medical and STEM educator creating Anki-compatible Cloze Deletion flashcards.
Text to extract from:
"""
${text.slice(0, 4000)}
"""

Task:
Extract up to ${count} high-yield Cloze Deletion flashcards targeting key definitions, mechanism steps, formulas, or anatomical terms.
Use standard Anki Cloze syntax: {{c1::Target Term::Optional Hint}}

Format your response as a valid JSON array of objects with the exact schema:
[
  {
    "front": "Complete sentence containing {{c1::Key Term::Hint}}.",
    "back": "Key Term - Brief explanation or context",
    "clozeTerm": "Key Term",
    "hint": "Hint",
    "isCloze": true,
    "tags": ["cloze", "${subject.toLowerCase().replace(/\s+/g, '-')}"]
  }
]
Return ONLY the raw JSON array.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const responseText = response.text?.trim() || '';
    const cleanJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item) => ({
        front: item.front || item.text,
        back: item.back || item.clozeTerm || 'Explanation',
        clozeTerm: item.clozeTerm || '',
        hint: item.hint || '',
        isCloze: true,
        tags: Array.isArray(item.tags) ? item.tags : ['cloze'],
      }));
    }

    return heuristicClozeExtract(text, count);
  } catch (err) {
    console.warn('[ClozeExtractionService] Gemini error, falling back to heuristic cloze generator:', err.message);
    return heuristicClozeExtract(text, count);
  }
}

module.exports = {
  generateClozeCardsFromText,
  heuristicClozeExtract,
};
