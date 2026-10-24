const pdfParse = require('pdf-parse');
const { Syllabus, SyllabusTopic, Note } = require('../models');
const { analyzeSyllabusGaps } = require('../services/gapDetectorService');
const syllabusTrackerService = require('../services/syllabusTrackerService');
const { verifyMagicBytes } = require('../middleware/upload');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const prompts = require('../config/prompts');
const { compareSyllabi: runSyllabusComparison } = require('../services/syllabusOverlapService');

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
const genAI = (apiKey && apiKey !== 'your_gemini_api_key_here') ? new GoogleGenerativeAI(apiKey) : null;

/**
 * @fileoverview Controller for managing syllabus upload, tracking, and progress updates.
 */

/**
 * Uploads and parses a PDF syllabus file.
 */
exports.uploadSyllabus = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a PDF syllabus file.' });
    }

    // Verify the upload is genuinely a PDF (magic bytes), not just named ".pdf"
    try {
      await verifyMagicBytes('.pdf', req.file.buffer);
    } catch (err) {
      return res.status(400).json({ success: false, error: 'The uploaded file is not a valid PDF.' });
    }

    // 1. Parse PDF text
    let extractedText = '';
    try {
      const parsedPdf = await pdfParse(req.file.buffer);
      extractedText = parsedPdf.text || '';
    } catch (err) {
      console.error('PDF extraction failed, falling back to mock parser:', err);
    }

    // OCR / Scanned PDF fallback warning check
    if (extractedText.trim().length < 100) {
      extractedText = 'Mock Syllabus: Scanned PDF or Image uploaded. Analyzing standard college curriculum structure for general topics.';
    }

    const syllabusName = req.file.originalname.replace('.pdf', '') || 'Curriculum Syllabus';

    let topics = [];

    // 2. Call Gemini to extract module hierarchies
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = prompts.syllabus.extractStructure(extractedText);

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        // Clean JSON formatting if Gemini wrapped it in markdown codeblocks
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        topics = parsed.topics || [];
      } catch (err) {
        console.error('Failed to parse syllabus with Gemini:', err);
      }
    }

    // Fallback if Gemini failed or is unavailable
    if (topics.length === 0) {
      topics = [
        {
          moduleName: 'Module 1: General Core',
          title: 'Introduction to Core Concepts',
          subtopics: ['Core Definitions', 'Methodology Overview'],
          weightage: 50,
        },
        {
          moduleName: 'Module 2: Advanced Topics',
          title: 'System Implementation & Design',
          subtopics: ['Database Design', 'Client-Server Communication'],
          weightage: 50,
        }
      ];
    }

    // 3. Persist to database
    const syllabus = await Syllabus.create({
      userId: req.user.id,
      name: syllabusName,
    });

    for (const t of topics) {
      await SyllabusTopic.create({
        syllabusId: syllabus.id,
        moduleName: t.moduleName || 'General Core',
        title: t.title || 'Introduction',
        subtopics: t.subtopics || [],
        weightage: t.weightage || 0,
        coverageStatus: 'Unstudied Gap',
      });
    }

    // 4. Initial gap analysis
    const analysis = await analyzeSyllabusGaps(req.user.id, syllabus.id);

    res.status(201).json({
      success: true,
      data: {
        syllabusId: syllabus.id,
        name: syllabus.name,
        coveragePercentage: analysis.coveragePercentage,
        topics: analysis.topics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Creates a new syllabus from raw text.
 */
exports.createSyllabus = async (req, res) => {
  try {
    const { text, courseName } = req.body;
    const userId = req.user.id;

    if (!text || text.trim().length < 50) {
      return res.status(400).json({ success: false, message: 'Syllabus text must be at least 50 characters.' });
    }

    const structuredData = await syllabusTrackerService.parseSyllabus(text);

    // Persist to database
    const syllabus = await Syllabus.create({
      userId: userId,
      name: courseName || 'Text-based Syllabus',
    });

    // Create topics from structured data
    for (const module of structuredData) {
      for (const topic of module.topics || []) {
        for (const subtopic of topic.subtopics || []) {
          await SyllabusTopic.create({
            syllabusId: syllabus.id,
            moduleName: module.name || 'General Module',
            title: topic.name || 'General Topic',
            subtopics: [subtopic.name],
            weightage: 0,
            coverageStatus: 'Unstudied Gap',
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      data: {
        id: syllabus.id,
        courseName: syllabus.name,
        modules: structuredData,
        createdAt: syllabus.createdAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating syllabus:', error);
    res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

/**
 * Retrieves gap analysis for a specific syllabus.
 */
exports.getGapAnalysis = async (req, res, next) => {
  try {
    const syllabusId = req.params.id;
    const userId = req.user.id;

    // Verify syllabus ownership
    const syllabus = await Syllabus.findOne({ where: { id: syllabusId, userId } });
    if (!syllabus) {
      return res.status(404).json({ success: false, error: 'Syllabus not found.' });
    }

    const analysis = await analyzeSyllabusGaps(userId, syllabusId);

    res.status(200).json({
      success: true,
      data: {
        syllabusId: syllabus.id,
        name: syllabus.name,
        coveragePercentage: analysis.coveragePercentage,
        topics: analysis.topics,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Updates the mastery level of a specific subtopic.
 */
exports.updateMastery = async (req, res, next) => {
  try {
    const { syllabusId, subtopicId, mastery } = req.body;
    const userId = req.user.id;

    if (!['not_started', 'reviewing', 'mastered'].includes(mastery)) {
      return res.status(400).json({ success: false, message: 'Invalid mastery level.' });
    }

    // Verify syllabus ownership
    const syllabus = await Syllabus.findOne({ where: { id: syllabusId, userId } });
    if (!syllabus) {
      return res.status(404).json({ success: false, error: 'Syllabus not found.' });
    }

    // Find the topic containing this subtopic
    const topic = await SyllabusTopic.findOne({
      where: { syllabusId: syllabusId }
    });

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found.' });
    }

    // Update mastery status based on subtopic
    // Note: In a real implementation, you'd track individual subtopic mastery
    topic.coverageStatus = mastery === 'mastered' ? 'Covered' :
      mastery === 'reviewing' ? 'Partially Covered' : 'Unstudied Gap';
    await topic.save();

    res.status(200).json({
      success: true,
      message: `Subtopic ${subtopicId} updated to ${mastery}.`,
      data: {
        topicId: topic.id,
        coverageStatus: topic.coverageStatus
      }
    });
  } catch (error) {
    console.error('Error updating mastery:', error);
    next(error);
  }
};

/**
 * Generates study notes for a specific syllabus gap.
 */
exports.generateNotesForGap = async (req, res, next) => {
  try {
    const topicId = req.params.topicId;
    const userId = req.user.id;

    const topic = await SyllabusTopic.findByPk(topicId);
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Syllabus topic not found.' });
    }

    let generatedContent = `### Revision Notes: ${topic.title}\n\n`;
    generatedContent += `This study note covers the subtopics: ${topic.subtopics.join(', ')}.\n\n`;
    generatedContent += `Review these concepts regularly to transition this syllabus gap into a Covered status.`;

    // Call Gemini to generate comprehensive notes
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = prompts.syllabus.generateNotesForGap(topic.title, topic.subtopics);
        const result = await model.generateContent(prompt);
        generatedContent = result.response.text().trim();
      } catch (err) {
        console.error('Failed to generate study notes with Gemini:', err);
      }
    }

    // Save note in database
    const note = await Note.create({
      user: userId,
      title: `${topic.title} Notes`,
      content: generatedContent,
      subject: '00000000-0000-0000-0000-000000000000', // Dummy general subject ID
    });

    // Update topic coverage state
    topic.linkedNoteId = note.id;
    topic.coverageStatus = 'Partially Covered';
    await topic.save();

    res.status(201).json({
      success: true,
      data: {
        noteId: note.id,
        title: note.title,
        content: note.content,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetches syllabus progress and predicted completion date.
 */
exports.getProgress = async (req, res, next) => {
  try {
    const { syllabusId } = req.params;
    const userId = req.user.id;

    // Verify syllabus ownership
    const syllabus = await Syllabus.findOne({ where: { id: syllabusId, userId } });
    if (!syllabus) {
      return res.status(404).json({ success: false, error: 'Syllabus not found.' });
    }

    // Get all topics for this syllabus
    const topics = await SyllabusTopic.findAll({ where: { syllabusId } });

    // Transform to expected format
    const structuredSyllabus = [];
    const moduleMap = new Map();

    for (const topic of topics) {
      if (!moduleMap.has(topic.moduleName)) {
        moduleMap.set(topic.moduleName, {
          id: `mod_${topic.moduleName.replace(/\s+/g, '_').toLowerCase()}`,
          name: topic.moduleName,
          topics: []
        });
      }

      const module = moduleMap.get(topic.moduleName);
      module.topics.push({
        id: `top_${topic.id}`,
        name: topic.title,
        subtopics: (topic.subtopics || []).map((sub, idx) => ({
          id: `sub_${topic.id}_${idx}`,
          name: sub,
          mastery: topic.coverageStatus === 'Covered' ? 'mastered' :
            topic.coverageStatus === 'Partially Covered' ? 'reviewing' : 'not_started'
        }))
      });
    }

    const mockSyllabus = Array.from(moduleMap.values());

    // Calculate overall progress
    const totalSubtopics = topics.reduce((sum, t) => sum + (t.subtopics?.length || 0), 0);
    const coveredSubtopics = topics.filter(t => t.coverageStatus === 'Covered')
      .reduce((sum, t) => sum + (t.subtopics?.length || 0), 0);
    const partiallyCovered = topics.filter(t => t.coverageStatus === 'Partially Covered')
      .reduce((sum, t) => sum + (t.subtopics?.length || 0), 0);

    const overallProgress = totalSubtopics > 0
      ? Math.round(((coveredSubtopics + (partiallyCovered * 0.5)) / totalSubtopics) * 100)
      : 0;

    // Predict completion date (assuming 2 items per day as default)
    const remainingItems = totalSubtopics - coveredSubtopics - partiallyCovered;
    const predictedDate = syllabusTrackerService.predictCompletionDate(mockSyllabus, 2);

    res.status(200).json({
      success: true,
      data: {
        syllabusId: syllabus.id,
        name: syllabus.name,
        syllabus: mockSyllabus,
        predictedCompletionDate: predictedDate,
        overallProgress: overallProgress
      }
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    next(error);
  }
};

/**
 * Retrieves syllabus catalog for the current user.
 */
exports.getSyllabusCatalog = async (req, res, next) => {
  try {
    const catalog = await Syllabus.findAll({ where: { userId: req.user.id } });
    res.status(200).json({ success: true, data: catalog });
  } catch (error) {
    next(error);
  }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMPARE_SYLLABI = 5;

/**
 * Builds the POST /compare handler. Loaders and the comparison function can be
 * swapped in tests so no database is needed.
 */
const createCompareHandler = (deps = {}) => {
  const findSyllabi =
    deps.findSyllabi || ((ids, userId) => Syllabus.findAll({ where: { id: ids, userId } }));
  const findTopics =
    deps.findTopics || ((ids) => SyllabusTopic.findAll({ where: { syllabusId: ids } }));
  const compare = deps.compare || runSyllabusComparison;

  return async (req, res, next) => {
    try {
      const raw = req.body && req.body.syllabusIds;
      if (!Array.isArray(raw) || raw.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) {
        return res
          .status(400)
          .json({ success: false, error: 'syllabusIds must be an array of syllabus ids.' });
      }
      const ids = [...new Set(raw)];
      if (ids.length < 2 || ids.length > MAX_COMPARE_SYLLABI) {
        return res.status(400).json({
          success: false,
          error: `Pick between 2 and ${MAX_COMPARE_SYLLABI} different syllabi to compare.`,
        });
      }

      // Ownership: every id must belong to the logged in user.
      const owned = await findSyllabi(ids, req.user.id);
      const ownedIds = new Set(owned.map((s) => s.id));
      if (ids.some((id) => !ownedIds.has(id))) {
        return res
          .status(404)
          .json({ success: false, error: 'One or more syllabi were not found.' });
      }

      const topics = await findTopics(ids);
      const syllabi = ids.map((id) => ({
        id,
        name: owned.find((s) => s.id === id).name,
        topics: topics.filter((t) => t.syllabusId === id),
      }));

      const data = await compare(syllabi);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return next(error);
    }
  };
};

exports.createCompareHandler = createCompareHandler;
exports.compareSyllabi = createCompareHandler();
