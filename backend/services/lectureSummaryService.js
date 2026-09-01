/**
 * @fileoverview Lecture Summary Service that parses multi-speaker transcripts to
 * generate timestamped chapter bookmarks, extract formulas/definitions, and
 * synthesize high-yield study flashcards.
 */

const geminiService = require('./geminiService');

/**
 * Processes full transcript to extract chapters and synthesize flashcards.
 * @param {string} fullTranscript Speaker-tagged transcript string
 * @returns {Promise<{ chapters: Array, flashcards: Array }>}
 */
async function processLectureTranscript(fullTranscript) {
  const prompt = `
You are an expert educational AI assistant. Analyze the following multi-speaker lecture transcript.

Tasks:
1. Identify distinct topic transitions and generate timestamped chapter bookmarks (format: MM:SS - Topic Title).
2. Synthesize 10 to 15 high-yield flashcards covering key definitions, derivations, formulas, and concepts discussed.

Respond ONLY with valid JSON structured as:
{
  "chapters": [
    { "timestamp": "00:00", "title": "Introduction to Topic", "summary": "Brief summary" }
  ],
  "flashcards": [
    { "front": "Question/Concept", "back": "Detailed Answer/Definition", "tags": ["tag1"] }
  ]
}

Transcript:
${fullTranscript}
  `;

  try {
    const rawResponse = await geminiService.generateText(prompt);
    const cleanedJson = rawResponse.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanedJson);

    return {
      chapters: result.chapters || [],
      flashcards: result.flashcards || [],
    };
  } catch (error) {
    console.error('[LectureSummaryService] Parsing failed:', error.message);
    return {
      chapters: [],
      flashcards: [],
    };
  }
}

module.exports = {
  processLectureTranscript,
};
