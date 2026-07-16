const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (apiKey && apiKey !== 'your_gemini_api_key_here') {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Response cache with configurable TTL and max keys via env vars
const responseCache = new NodeCache({
  stdTTL: parseInt(process.env.CACHE_TTL) || 3600,
  checkperiod: 300,
  maxKeys: parseInt(process.env.CACHE_MAX_KEYS) || 1000
});

// ==========================================
// HELPER UTILITIES
// ==========================================

/**
 * Deterministic hash for cache keys — non-crypto djb2 variant.
 * Produces a compact base-36 key from a prefix + input string.
 */
const hashKey = (prefix, str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `${prefix}:${Math.abs(hash).toString(36)}`;
};

/**
 * Timeout wrapper using Promise.race (safe for SDK versions that lack AbortSignal support).
 * @google/generative-ai ^0.11.4 does NOT support AbortSignal via requestOptions.
 */
async function callWithTimeout(model, prompt, timeoutMs = 30000) {
  const result = await Promise.race([
    model.generateContent(prompt),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Gemini request timed out')), timeoutMs)
    )
  ]);
  return result;
}

/**
 * Retry wrapper with exponential backoff.
 * Retries on 429 (rate limit) and 5xx (server) errors.
 * Each attempt uses callWithTimeout for per-request timeout.
 */
async function generateWithRetry(model, prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await callWithTimeout(model, prompt);
      return result;
    } catch (err) {
      const isRetryable = err.status === 429 || (err.status >= 500 && err.status < 600) || err.message === 'Gemini request timed out';
      if (isRetryable && attempt < retries - 1) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err; // Non-retryable or exhausted
    }
  }
}

// ==========================================
// RESPONSE VALIDATION
// ==========================================

const RESPONSE_SCHEMAS = {
  pyqAnalysis: {
    chapterWeightage: 'array',
    importantTopics: 'array',
    repeatedQuestions: 'array',
    trendAnalysis: 'string'
  },
  studyPlan: {
    // Array of objects with date, tasks
    _type: 'array',
    _itemSchema: { date: 'string', tasks: 'array' }
  },
  quiz: {
    title: 'string',
    questions: 'array'
  },
  flashcard: {
    _type: 'array',
    _itemSchema: { front: 'string', back: 'string' }
  },
  performance: {
    weakSubjects: 'array',
    recommendations: 'array'
  }
};

/**
 * Validate a parsed response against a schema definition.
 * Returns true if the data matches the expected shape, false otherwise.
 */
function validateResponse(data, schema) {
  if (!data) return false;
  if (schema._type === 'array') {
    if (!Array.isArray(data) || data.length === 0) return false;
    if (schema._itemSchema) {
      for (const item of data) {
        for (const [key, type] of Object.entries(schema._itemSchema)) {
          if (typeof item[key] !== type) return false;
        }
      }
    }
    return true;
  }
  for (const [key, type] of Object.entries(schema)) {
    if (key.startsWith('_')) continue;
    if (type === 'array' && (!Array.isArray(data[key]) || data[key].length === 0)) return false;
    if (type !== 'array' && typeof data[key] !== type) return false;
  }
  return true;
}

// Helper to clean JSON string from markdown formatting
const cleanJSON = (text) => {
  try {
    // Remove markdown code block markers
    let cleaned = text.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    return JSON.parse(cleaned.trim());
  } catch (error) {
    console.error('Failed to parse JSON from AI response:', error);
    // Find JSON-like substring as fallback
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    
    let startIdx = -1;
    let endIdx = -1;
    
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      startIdx = firstBrace;
      endIdx = lastBrace;
    } else if (firstBracket !== -1) {
      startIdx = firstBracket;
      endIdx = lastBracket;
    }
    
    if (startIdx !== -1 && endIdx !== -1) {
      try {
        return JSON.parse(text.substring(startIdx, endIdx + 1));
      } catch (innerError) {
        throw new Error('Invalid JSON format returned by AI');
      }
    }
    throw error;
  }
};

/**
 * 1. Analyze Previous Year Question Paper (PYQ)
 */
exports.analyzePYQText = async (rawText, subjectName = 'the subject', forceRefresh = false) => {
  if (!genAI) {
    console.log('Gemini API key not configured. Using Mock Data for PYQ Analysis.');
    return getMockPYQAnalysis(subjectName);
  }

  const cacheKey = hashKey('analyzePYQ', rawText.substring(0, 200) + subjectName);

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an expert exam analyzer. Analyze the following text extracted from a Previous Year Question Paper for ${subjectName}.
      Identify:
      1. Chapter-wise weightage (list of chapters with approximate percentage weightage/percentage points).
      2. Important/frequently asked topics (categorized by High, Medium, or Low importance, along with estimated frequency/appearance count).
      3. Repeated questions or very similar questions asked across years (provide question text and estimated years).
      4. General exam trend analysis (briefly describing the style of questions, emphasis on theoretical vs practical/analytical, and suggestions for preparing).

      Return the result STRICTLY as a JSON object with this exact structure:
      {
        "chapterWeightage": [
          { "chapterName": "string", "weightage": number }
        ],
        "importantTopics": [
          { "topicName": "string", "importance": "High" | "Medium" | "Low", "frequency": number }
        ],
        "repeatedQuestions": [
          { "questionText": "string", "years": [number] }
        ],
        "trendAnalysis": "string"
      }

      Text to analyze:
      ${rawText.substring(0, 15000)} // truncate to fit limits
    `;

    const result = await generateWithRetry(model, prompt);
    const parsed = cleanJSON(result.response.text());

    // Validate response structure
    if (!validateResponse(parsed, RESPONSE_SCHEMAS.pyqAnalysis)) {
      console.error('PYQ analysis response validation failed');
      return getMockPYQAnalysis(subjectName);
    }

    responseCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Gemini PYQ analysis failed:', error);
    return getMockPYQAnalysis(subjectName);
  }
};

/**
 * 2. Generate AI Study Plan
 */
exports.generateStudyPlan = async (examName, subjectsAndTopics, startDate, endDate, studyHoursPerDay = 3, forceRefresh = false) => {
  if (!genAI) {
    console.log('Gemini API key not configured. Using Mock Data for Study Plan.');
    return getMockStudyPlan(examName, subjectsAndTopics, startDate, endDate);
  }

  const cacheKey = hashKey('studyPlan', `${examName}:${startDate}:${endDate}:${studyHoursPerDay}`);

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an expert academic planner. Generate a highly personalized study plan for the exam: "${examName}".
      The user wants to prepare starting from ${startDate} to ${endDate}.
      They have ${studyHoursPerDay} hours per day available.
      The syllabus contains the following subjects and topics:
      ${JSON.stringify(subjectsAndTopics)}

      Generate a daily schedule between the start and end dates.
      For each day, allocate realistic tasks with duration (in minutes) corresponding to the topics provided. Include rest/revision tasks.
      Organize the plan as daily goals.

      Return the result STRICTLY as a JSON array of daily goals:
      [
        {
          "date": "YYYY-MM-DD",
          "tasks": [
            { "title": "string", "duration": number, "topicName": "string" }
          ]
        }
      ]
    `;

    const result = await generateWithRetry(model, prompt);
    const parsed = cleanJSON(result.response.text());

    // Validate response structure
    if (!validateResponse(parsed, RESPONSE_SCHEMAS.studyPlan)) {
      console.error('Study plan response validation failed');
      return getMockStudyPlan(examName, subjectsAndTopics, startDate, endDate);
    }

    responseCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Gemini Study Plan generation failed:', error);
    return getMockStudyPlan(examName, subjectsAndTopics, startDate, endDate);
  }
};

/**
 * 3. Generate AI Quiz
 */
exports.generateQuiz = async (subjectName, topicName, notesText = '', count = 5, forceRefresh = false) => {
  if (!genAI) {
    console.log('Gemini API key not configured. Using Mock Data for Quiz.');
    return getMockQuiz(subjectName, topicName, count);
  }

  const cacheKey = hashKey('quiz', `${subjectName}:${topicName}:${count}`);

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Create a multiple choice quiz for ${subjectName} - ${topicName} with exactly ${count} questions.
      Use the following notes/context if available:
      ${notesText.substring(0, 5000)}

      Each question must have:
      - Question text
      - 4 unique options
      - Correct answer index (0, 1, 2, or 3)
      - A helpful explanation of the correct answer

      Return the result STRICTLY as a JSON object with this exact structure:
      {
        "title": "string",
        "questions": [
          {
            "questionText": "string",
            "options": ["string", "string", "string", "string"],
            "correctAnswer": number,
            "explanation": "string"
          }
        ]
      }
    `;

    const result = await generateWithRetry(model, prompt);
    const parsed = cleanJSON(result.response.text());

    // Validate response structure
    if (!validateResponse(parsed, RESPONSE_SCHEMAS.quiz)) {
      console.error('Quiz response validation failed');
      return getMockQuiz(subjectName, topicName, count);
    }

    responseCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Gemini Quiz generation failed:', error);
    return getMockQuiz(subjectName, topicName, count);
  }
};

/**
 * 4. Generate AI Flashcards
 */
exports.generateFlashcards = async (subjectName, topicName, notesText = '', count = 6, forceRefresh = false) => {
  if (!genAI) {
    console.log('Gemini API key not configured. Using Mock Data for Flashcards.');
    return getMockFlashcards(subjectName, topicName, count);
  }

  const cacheKey = hashKey('flashcards', `${subjectName}:${topicName}:${count}`);

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      Generate ${count} study flashcards for ${subjectName} - ${topicName}.
      Context/Notes:
      ${notesText.substring(0, 5000)}

      Each flashcard must have a concise question or term on the "front" and a clear, descriptive answer or definition on the "back".

      Return the result STRICTLY as a JSON array:
      [
        { "front": "string", "back": "string" }
      ]
    `;

    const result = await generateWithRetry(model, prompt);
    const parsed = cleanJSON(result.response.text());

    // Validate response structure
    if (!validateResponse(parsed, RESPONSE_SCHEMAS.flashcard)) {
      console.error('Flashcard response validation failed');
      return getMockFlashcards(subjectName, topicName, count);
    }

    responseCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Gemini Flashcards generation failed:', error);
    return getMockFlashcards(subjectName, topicName, count);
  }
};

/**
 * 5. Analyze Performance & Detect Weaknesses
 */
exports.analyzePerformanceAndRecommend = async (attemptsSummary, forceRefresh = false) => {
  if (!genAI) {
    console.log('Gemini API key not configured. Using Mock Recommendations.');
    return getMockRecommendations();
  }

  const cacheKey = hashKey('performance', JSON.stringify(attemptsSummary));

  // Check cache (skip if forceRefresh)
  if (!forceRefresh) {
    const cached = responseCache.get(cacheKey);
    if (cached) return cached;
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      You are an AI learning mentor. Analyze this student's recent quiz performance summary:
      ${JSON.stringify(attemptsSummary)}

      Identify specific areas of weakness and provide 3-4 highly personalized study/revision recommendations.

      Return the result STRICTLY as a JSON object:
      {
        "weakSubjects": ["string"],
        "recommendations": [
          { "subject": "string", "topic": "string", "suggestion": "string", "priority": "High" | "Medium" | "Low" }
        ]
      }
    `;

    const result = await generateWithRetry(model, prompt);
    const parsed = cleanJSON(result.response.text());

    // Validate response structure
    if (!validateResponse(parsed, RESPONSE_SCHEMAS.performance)) {
      console.error('Performance analysis response validation failed');
      return getMockRecommendations();
    }

    responseCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Gemini performance analysis failed:', error);
    return getMockRecommendations();
  }
};

// ==========================================
// MOCK DATA FALLBACKS
// ==========================================

function getMockPYQAnalysis(subjectName) {
  return {
    chapterWeightage: [
      { chapterName: 'Introduction & Foundations', weightage: 15 },
      { chapterName: 'Core Algorithms & Logic', weightage: 35 },
      { chapterName: 'Advanced Optimization', weightage: 25 },
      { chapterName: 'Real-world Integration', weightage: 25 },
    ],
    importantTopics: [
      { topicName: 'Big O Notation & Complexities', importance: 'High', frequency: 8 },
      { topicName: 'Dynamic Programming', importance: 'High', frequency: 5 },
      { topicName: 'System Scalability Design', importance: 'Medium', frequency: 3 },
      { topicName: 'Memory Allocation', importance: 'Low', frequency: 1 },
    ],
    repeatedQuestions: [
      {
        questionText: 'Explain the difference between Dynamic Programming and Greedy Algorithms with examples.',
        years: [2021, 2023, 2025],
      },
      {
        questionText: 'What is Time Complexity and how does Quicksort compare to Mergesort in average vs worst cases?',
        years: [2022, 2024],
      },
    ],
    trendAnalysis: `The exam for ${subjectName} focuses heavily on practical logic design and algorithmic optimizations. Theoretical questions comprise only 30% of the paper, while 70% requires drawing flowcharts, calculating complexities, or writing pseudocode. Over the last 3 years, there is a clear trend towards Scalability and Cloud Architectures.`,
  };
}

function getMockStudyPlan(examName, subjectsAndTopics, startDate, endDate) {
  const days = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Generate study days (max 7 days for demo/mock simplicity)
  let current = new Date(start);
  const limitDays = 7;
  let count = 0;

  while (current <= end && count < limitDays) {
    const formattedDate = current.toISOString().split('T')[0];
    days.push({
      date: formattedDate,
      tasks: [
        { title: 'Read introductory slides & outline syllabus', duration: 45, topicName: 'Overview' },
        { title: 'Complete practice problems & formula cheat sheet', duration: 90, topicName: 'Practice' },
        { title: 'AI Mock Quiz & Review weak areas', duration: 45, topicName: 'Evaluation' }
      ]
    });
    current.setDate(current.getDate() + 1);
    count++;
  }
  return days;
}

function getMockQuiz(subjectName, topicName, count) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      questionText: `Sample Question ${i} for ${topicName} in ${subjectName}?`,
      options: [
        `Option A: Primary definition`,
        `Option B: Secondary alternative definition`,
        `Option C: Third choice (Distractor)`,
        `Option D: None of the above`,
      ],
      correctAnswer: 0,
      explanation: `Option A is correct because it directly addresses the core principles of ${topicName} as detailed in standard academic textbooks.`,
    });
  }
  return {
    title: `${topicName} AI Generated Practice Quiz`,
    questions,
  };
}

function getMockFlashcards(subjectName, topicName, count) {
  const cards = [];
  for (let i = 1; i <= count; i++) {
    cards.push({
      front: `What is the core concept of ${topicName} (Card ${i})?`,
      back: `It refers to the fundamental design pattern in ${subjectName} that maximizes performance and efficiency.`,
    });
  }
  return cards;
}

function getMockRecommendations() {
  return {
    weakSubjects: ['Computer Architecture', 'Data Structures'],
    recommendations: [
      {
        subject: 'Computer Architecture',
        topic: 'Cache Coherence Protocols',
        suggestion: 'Revise MESI protocol state transitions. Make flashcards to memorize state conditions.',
        priority: 'High',
      },
      {
        subject: 'Data Structures',
        topic: 'AVL Tree Rotations',
        suggestion: 'Practice double rotations on paper and complete a mini quiz to verify your progress.',
        priority: 'Medium',
      },
    ],
  };
}
