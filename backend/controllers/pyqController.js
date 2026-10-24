const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
let uploadFileToFirebase = null;
try {
  const firebaseService = require('../services/firebaseStorageService');
  uploadFileToFirebase = firebaseService.uploadFileToFirebase;
} catch (e) {
  // Graceful fallback if firebase storage service is omitted or missing
}
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { checkAndAwardBadges } = require('../services/achievementService');
const { clusterByCosineSimilarity } = require('../utils/vectorUtils');
const { stampWorksheetPDF, generateSampleWorksheetPDF } = require('../services/pdfStampService');

// LRU/Map buffer cache for watermarked worksheets
const worksheetPdfCache = new Map();

// Cosine similarity cutoff above which two questions are treated as duplicates
const PYQ_SIMILARITY_THRESHOLD = 0.85;
// A simple concurrency limiter to prevent OOM on concurrent large PDF uploads
class Semaphore {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.queue = [];
  }
  async acquire() {
    if (this.active >= this.max) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.active++;
  }
  release() {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    }
  }
}

// Limit concurrent PDF parsing to 2
const pdfParseSemaphore = new Semaphore(2);

// @desc    Upload & Analyze PYQ
// @route   POST /api/pyqs/upload
// @access  Private
exports.uploadAndAnalyzePYQ = async (req, res, next) => {
  try {
    const { examId, subjectId, year, title, difficulty, extractedText: ocrText, fileUrl: ocrFileUrl } = req.body;
    
    if (!req.file && !ocrText) {
      return res.status(400).json({ success: false, error: 'Please upload a question paper PDF or provide extracted text' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Read PDF and extract text if no OCR text provided
    let extractedText = ocrText || '';
    let fileUrl = ocrFileUrl || '';

    if (!ocrText && req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      try {
        await pdfParseSemaphore.acquire();
        try {
          const dataBuffer = await fs.promises.readFile(req.file.path);
          if (!dataBuffer || dataBuffer.length === 0) {
            return res.status(400).json({
              success: false,
              error: "PARSE_ERROR",
              message: "The uploaded file buffer is empty or corrupt."
            });
          }

          const pdfData = await pdfParse(dataBuffer);
          extractedText = pdfData.text;

          if (!extractedText || extractedText.trim().length === 0) {
            return res.status(422).json({
              success: false,
              error: "SCANNED_PDF_NO_TEXT",
              message: "PDF parsing yielded no readable text segments. The document might be an un-scanned image."
            });
          }
        } finally {
          pdfParseSemaphore.release();
        }
      } catch (parseError) {
        console.error(`[PYQ_PARSE_FAILURE] Year: ${year}, Subject: ${subject?.name}:`, parseError);
        return res.status(500).json({
          success: false,
          error: "CORRUPTED_STRUCTURE",
          message: "Failed to parse the PDF document structure. Please ensure the file is not corrupted.",
          details: process.env.NODE_ENV === "development" ? parseError.message : undefined
        });
      }
    }

    // Call Gemini API for structure analysis
    const analysis = await geminiService.analyzePYQText(extractedText, subject.name, req.query.refresh === 'true');

// Save to Database
    const chapters = Array.isArray(analysis?.chapterWeightage)
      ? analysis.chapterWeightage.map((ch) => ch.chapterName).filter(Boolean)
      : [];

    const pyq = await PYQ.create({
      title: title || `${subject.name} Question Paper - ${year}`,
      exam: examId,
      subject: subjectId,
      year: parseInt(year),
      difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
      chapters,
      fileUrl: fileUrl,
      analyzed: true,
      analysisResults: analysis,
      user: req.user.id,
    });
    // Automatically register/update detected topics in Database
    if (analysis && analysis.importantTopics) {
      for (const t of analysis.importantTopics) {
        // Safety guard: skip malformed items that Gemini may have generated with missing fields
        if (!t || !t.topicName || !t.importance) continue;

        // Look for existing topic using PostgreSQL case-insensitive iLike matching
        let existingTopic;
        try {
          existingTopic = await Topic.findOne({
            where: {
              name: { [Op.iLike]: t.topicName.trim() },
              subject: subjectId,
              user: req.user.id,
            },
          });
        } catch (dbErr) {
          const userTopics = await Topic.findAll({ where: { subject: subjectId, user: req.user.id } });
          existingTopic = userTopics.find((tp) => tp.name.trim().toLowerCase() === t.topicName.trim().toLowerCase());
        }

        const calculatedStatus =
          t.importance === 'High' ? 'Medium' : t.importance === 'Medium' ? 'Medium' : 'Weak';

        if (existingTopic) {
          existingTopic.weightage = t.frequency || 5;
          await existingTopic.save();
        } else {
          await Topic.create({
            name: t.topicName,
            description: `Auto-generated from ${year} PYQ analysis.`,
            subject: subjectId,
            status: calculatedStatus,
            weightage: t.frequency || 3,
            user: req.user.id,
          });
        }
      }
    }

    // Log Activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'pyq_upload',
      description: `Uploaded and analyzed Previous Year Question Paper: ${pyq.title}`,
    });

    // Issue #1053: Check for PYQ Analyst badge
    const totalAnalyzed = await PYQ.count({ where: { user: req.user.id } });
    await checkAndAwardBadges(req.user.id, {
      type: 'PYQ_ANALYZED',
      payload: { totalAnalyzed }
    });

    res.status(201).json({
      success: true,
      data: pyq,
    });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      if (req.file) {
        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      if (req.file) {
        const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
next(error);
  }
};

// @desc    Detect near-duplicate / repeated PYQ questions across exam years
//          using Gemini text embeddings + cosine similarity clustering
// @route   GET /api/pyqs/clusters/:subjectId
// @access  Private
exports.getPYQClusters = async (req, res, next) => {
  try {
    const { subjectId } = req.params;

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const pyqs = await PYQ.findAll({
      where: { subject: subjectId, user: req.user.id, analyzed: true },
      order: [['year', 'ASC']],
    });

    // Flatten every previously-detected repeated question from each paper's
    // own analysis into one candidate list, tagging each with the years
    // it's linked to (its paper's year, plus any years Gemini already noted).
    const candidates = [];
    for (const pyq of pyqs) {
      const repeatedQuestions = pyq.analysisResults?.repeatedQuestions || [];
      for (const rq of repeatedQuestions) {
        if (!rq?.questionText) continue;
        const years = new Set(Array.isArray(rq.years) ? rq.years : []);
        years.add(pyq.year);
        candidates.push({ questionText: rq.questionText.trim(), years });
      }
    }

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No repeated question patterns found yet. Upload and analyze more PYQ papers for this subject.',
      });
    }

    // Compute (cached) embeddings for each candidate question
    const embeddedCandidates = [];
    for (const candidate of candidates) {
      const embedding = await geminiService.generateEmbedding(candidate.questionText);
      if (embedding && embedding.length > 0) {
        embeddedCandidates.push({ ...candidate, embedding });
      }
    }

    const clusters = clusterByCosineSimilarity(embeddedCandidates, PYQ_SIMILARITY_THRESHOLD);

    // Only surface clusters genuinely repeated across MULTIPLE distinct years
    const data = clusters
      .map((cluster) => {
        const years = new Set();
        cluster.forEach((c) => c.years.forEach((y) => years.add(y)));
        return {
          questionText: cluster[0].questionText,
          years: Array.from(years).sort((a, b) => a - b),
          occurrences: cluster.length,
        };
      })
      .filter((cluster) => cluster.years.length > 1)
      .sort((a, b) => b.years.length - a.years.length);

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({ success: false, error: error.message });
    }
    next(error);
  }
};

// @desc    Full-text search for PYQ question papers & contents
//          Uses PostgreSQL tsvector / tsquery & GIN index ranking when available
// @route   GET /api/pyqs/search
// @access  Private
exports.searchPYQs = async (req, res, next) => {
  const startTime = process.hrtime.bigint();
  try {
    const { q, search, subjectId, courseId, year, difficulty, chapter } = req.query;
    const searchQuery = (q || search || '').trim();

    if (!searchQuery) {
      return res.status(400).json({ success: false, error: 'Search query is required' });
    }

    const targetId = subjectId || courseId;
    if (targetId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
      }

      const subjectExists = await Subject.findByPk(targetId);
      if (!subjectExists) {
        return res.status(404).json({ success: false, error: 'Course/Subject not found' });
      }
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const filter = { user: req.user.id };
    if (targetId) filter.subject = targetId;
    if (year) filter.year = parseInt(year, 10);
    if (difficulty) {
      const difficultyList = difficulty.split(',').filter((d) => ['Easy', 'Medium', 'Hard'].includes(d));
      if (difficultyList.length > 0) filter.difficulty = { [Op.in]: difficultyList };
    }
    if (chapter) filter.chapters = { [Op.contains]: [chapter] };

    // Format multi-keyword search terms
    const cleanWords = searchQuery
      .replace(/[':\*\&\|\!\(\)]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);

    let order = [['year', 'DESC']];

    const dialect = sequelize ? sequelize.getDialect() : 'postgres';
    if (dialect === 'postgres' && cleanWords.length > 0) {
      const tsqueryStr = cleanWords.map((w) => `${w}:*`).join(' & ');
      const escapedTsquery = sequelize.escape(tsqueryStr);

      filter[Op.and] = filter[Op.and] || [];
      filter[Op.and].push(
        sequelize.literal(
          `coalesce("searchVector", to_tsvector('english', coalesce(title, '') || ' ' || coalesce(array_to_string(chapters, ' '), '') || ' ' || coalesce("analysisResults"::text, ''))) @@ to_tsquery('english', ${escapedTsquery})`
        )
      );

      order = [
        [
          sequelize.literal(
            `ts_rank(coalesce("searchVector", to_tsvector('english', coalesce(title, '') || ' ' || coalesce(array_to_string(chapters, ' '), '') || ' ' || coalesce("analysisResults"::text, ''))), to_tsquery('english', ${escapedTsquery}))`
          ),
          'DESC',
        ],
        ['year', 'DESC'],
      ];
    } else if (cleanWords.length > 0) {
      // In-memory / SQLite fallback for unit testing environments
      const searchConditions = cleanWords.map((word) => {
        const pattern = `%${word}%`;
        const searchOp = Op.iLike || Op.like;
        return {
          [Op.or]: [
            { title: { [searchOp]: pattern } },
            sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), 'LIKE', pattern.toLowerCase()),
            sequelize.where(sequelize.fn('LOWER', sequelize.col('chapters')), 'LIKE', pattern.toLowerCase()),
            sequelize.where(sequelize.fn('LOWER', sequelize.col('analysisResults')), 'LIKE', pattern.toLowerCase()),
          ],
        };
      });
      filter[Op.and] = [...(filter[Op.and] || []), ...searchConditions];
    }

    const { count: total, rows: pyqs } = await PYQ.findAndCountAll({
      where: filter,
      order,
      offset,
      limit,
    });

    const endTime = process.hrtime.bigint();
    const queryExecutionTimeMs = Number(endTime - startTime) / 1e6;

    res.status(200).json({
      success: true,
      count: pyqs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      queryExecutionTimeMs: Math.round(queryExecutionTimeMs * 100) / 100,
      data: pyqs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all PYQs for the authenticated user (with optional search)
// @route   GET /api/pyqs
// @access  Private
exports.getPYQs = async (req, res, next) => {
  try {
    const { subjectId, courseId, year, difficulty, chapter, search, q } = req.query;
    const searchQuery = (q || search || '').trim();

    if (searchQuery) {
      return exports.searchPYQs(req, res, next);
    }

    const targetId = subjectId || courseId;
    if (targetId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetId)) {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
      }

      const subjectExists = await Subject.findByPk(targetId);
      if (!subjectExists) {
        return res.status(404).json({ success: false, error: 'Course/Subject not found' });
      }
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const filter = { user: req.user.id };
    if (targetId) filter.subject = targetId;
    if (year) filter.year = parseInt(year, 10);
    if (difficulty) {
      const difficultyList = difficulty.split(',').filter((d) => ['Easy', 'Medium', 'Hard'].includes(d));
      if (difficultyList.length > 0) filter.difficulty = { [Op.in]: difficultyList };
    }
    if (chapter) filter.chapters = { [Op.contains]: [chapter] };
    const { count: total, rows: pyqs } = await PYQ.findAndCountAll({
      where: filter,
      order: [['year', 'DESC']],
      offset,
      limit,
    });

    res.status(200).json({
      success: true,
      count: pyqs.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: pyqs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get PYQ analysis details
// @route   GET /api/pyqs/:id
// @access  Private
exports.getPYQDetails = async (req, res, next) => {
  try {
    const pyq = await PYQ.findOne({
      where: { id: req.params.id, user: req.user.id },
    });
    if (!pyq) {
      return res.status(404).json({ success: false, error: 'Question paper analysis not found' });
    }
    res.status(200).json({ success: true, data: pyq });
  } catch (error) {
    next(error);
  }
};

// @desc    Re-analyze PYQ with AI
// @route   POST /api/pyqs/:id/analyze
// @access  Private
exports.getPYQAnalysis = async (req, res, next) => {
  try {
    const pyq = await PYQ.findOne({
      where: { id: req.params.id, user: req.user.id },
    });
    if (!pyq) {
      return res.status(404).json({ success: false, error: 'Question paper not found' });
    }

    if (pyq.fileUrl) {
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const absolutePath = path.resolve(path.join(__dirname, '..', pyq.fileUrl));
      const relative = path.relative(uploadsDir, absolutePath);
      const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

      if (!isInside) {
        return res.status(400).json({ success: false, error: 'Invalid file path' });
      }
    }

    // Read the PDF file from disk and re-extract text
    let extractedText = '';
    try {
      if (pyq.fileUrl) {
        const absolutePath = path.resolve(path.join(__dirname, '..', pyq.fileUrl));
        if (fs.existsSync(absolutePath)) {
          const dataBuffer = await fs.promises.readFile(absolutePath);
          const pdfData = await pdfParse(dataBuffer);
          extractedText = pdfData.text;
        }
      }
    } catch (parseError) {
      console.error('PDF parsing error during re-analysis:', parseError);
    }

    // Get subject for analysis context
    const subject = await Subject.findByPk(pyq.subject);
    const subjectName = subject ? subject.name : 'the subject';

    // Re-analyze with Gemini (force refresh to bypass cache)
    const analysis = await geminiService.analyzePYQText(
      extractedText || `${subjectName} - Year ${pyq.year}`,
      subjectName,
      true
    );

    // Update the PYQ record
    pyq.analysisResults = analysis;
    pyq.analyzed = true;
    await pyq.save();

    res.status(200).json({ success: true, data: pyq });
  } catch (error) {
    // Handle Gemini API rate limit errors
    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    // Handle Gemini API server errors
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

// @desc    Stream PYQ Analysis via Server-Sent Events (SSE)
// @route   GET /api/pyqs/:id/analyze-stream
// @access  Private
exports.analyzePYQStream = async (req, res, next) => {
  try {
    const pyq = await PYQ.findOne({
      where: { id: req.params.id, user: req.user.id },
    });
    if (!pyq) {
      return res.status(404).json({ success: false, error: 'Question paper not found' });
    }

    // Set Server-Sent Events (SSE) headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    // Initial connection ACK
    res.write(`data: ${JSON.stringify({ status: 'connected', message: 'SSE stream established' })}\n\n`);

    let extractedText = '';
    try {
      if (pyq.fileUrl) {
        const absolutePath = path.resolve(path.join(__dirname, '..', pyq.fileUrl));
        if (fs.existsSync(absolutePath)) {
          const dataBuffer = await fs.promises.readFile(absolutePath);
          const pdfData = await pdfParse(dataBuffer);
          extractedText = pdfData.text;
        }
      }
    } catch (parseError) {
      console.error('PDF parsing error during SSE stream:', parseError);
    }

    const subject = await Subject.findByPk(pyq.subject);
    const subjectName = subject ? subject.name : 'the subject';

    const analysis = await geminiService.analyzePYQStream(
      extractedText || `${subjectName} - Year ${pyq.year}`,
      subjectName,
      (chunkText) => {
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }
    );

    if (analysis) {
      pyq.analysisResults = analysis;
      pyq.analyzed = true;
      await pyq.save();
    }

    res.write(`data: ${JSON.stringify({ status: 'completed', analysis })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('Error during PYQ SSE analysis streaming:', error);
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || 'Stream processing failed' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
};

// @desc    Delete PYQ
// @route   DELETE /api/pyqs/:id
// @access  Private
exports.deletePYQ = async (req, res, next) => {
  try {
    const pyq = await PYQ.findOne({
      where: { id: req.params.id, user: req.user.id },
    });
    if (!pyq) {
      return res.status(404).json({ success: false, error: 'Question paper not found' });
    }

    // Path traversal guard — the afterDestroy hook on the model handles actual file deletion
    if (pyq.fileUrl) {
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const absolutePath = path.resolve(path.join(__dirname, '..', pyq.fileUrl));
      const relative = path.relative(uploadsDir, absolutePath);
      const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

      if (!isInside) {
        return res.status(400).json({ success: false, error: 'Invalid file path' });
      }
    }

    await pyq.destroy();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
// @desc    Get PYQ Frequency and Difficulty Trend Analysis
// @route   GET /api/pyqs/trends
// @access  Private
exports.getPYQTrends = async (req, res, next) => {
  try {
    const { subjectId, startYear, endYear } = req.query;
    const filter = { user: req.user.id };

    if (subjectId) {
      filter.subject = subjectId;
    }

    if (startYear || endYear) {
      filter.year = {};
      if (startYear) filter.year[Op.gte] = parseInt(startYear, 10);
      if (endYear) filter.year[Op.lte] = parseInt(endYear, 10);
    }

    const pyqs = await PYQ.findAll({
      where: filter,
      order: [['year', 'ASC']],
    });

    // Aggregate topic weightages and difficulty trends year-over-year
    const yearlyTrends = {};
    const topicAggregates = {};
    const difficultyCounts = { Easy: 0, Medium: 0, Hard: 0 };

    pyqs.forEach((pyq) => {
      const year = pyq.year;
      if (!yearlyTrends[year]) {
        yearlyTrends[year] = { year, totalPapers: 0, topics: {}, difficulties: { Easy: 0, Medium: 0, Hard: 0 } };
      }

      yearlyTrends[year].totalPapers += 1;
      if (pyq.difficulty && difficultyCounts[pyq.difficulty] !== undefined) {
        difficultyCounts[pyq.difficulty] += 1;
        yearlyTrends[year].difficulties[pyq.difficulty] += 1;
      }

      // Extract important topics from analysisResults JSONB
      const analysis = pyq.analysisResults;
      const importantTopics = analysis?.importantTopics || [];

      importantTopics.forEach((t) => {
        if (!t || !t.topicName) return;
        const topicName = t.topicName.trim();
        const frequency = t.frequency || t.weightage || 1;

        if (!yearlyTrends[year].topics[topicName]) {
          yearlyTrends[year].topics[topicName] = 0;
        }
        yearlyTrends[year].topics[topicName] += frequency;

        if (!topicAggregates[topicName]) {
          topicAggregates[topicName] = { topicName, totalFrequency: 0, appearances: 0 };
        }
        topicAggregates[topicName].totalFrequency += frequency;
        topicAggregates[topicName].appearances += 1;
      });
    });

    const formattedTrends = Object.values(yearlyTrends).sort((a, b) => a.year - b.year);
    const topTopics = Object.values(topicAggregates).sort((a, b) => b.totalFrequency - a.totalFrequency);

    res.status(200).json({
      success: true,
      data: {
        trends: formattedTrends,
        topTopics,
        difficultySummary: difficultyCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get AI predicted difficulty and topic trends forecast for upcoming exams
// @route   GET /api/pyqs/forecast
// @access  Private
exports.getUpcomingForecast = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required' });
    }

    const subject = await Subject.findOne({ where: { id: subjectId, user: req.user.id } });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const pyqs = await PYQ.findAll({
      where: { subject: subjectId, user: req.user.id },
      order: [['year', 'ASC']],
    });

    const history = pyqs.map((p) => ({
      year: p.year,
      difficulty: p.difficulty,
      chapters: p.chapters || [],
      importantTopics: p.analysisResults?.importantTopics || [],
    }));

    if (history.length === 0) {
      const topics = await Topic.findAll({ where: { subject: subjectId, user: req.user.id } });
      history.push({
        year: 'current syllabus state',
        availableTopics: topics.map((t) => t.name),
      });
    }

    const forecast = await geminiService.predictUpcomingExamTrends(
      subject.name,
      history,
      req.query.refresh === 'true'
    );

    res.status(200).json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    next(error);
  }
};

const PYQAnalysis = require('../models/PYQAnalysis');
const PYQQuestion = require('../models/PYQQuestion');
const pyqAnalyzerService = require('../services/pyqAnalyzerService');
const PDFDocument = require('pdfkit');

exports.analyzePYQBatch = async (req, res, next) => {
  try {
    const { subjectId, examName } = req.body;
    const files = req.files;

    if (!subjectId) {
      return res.status(400).json({ success: false, error: 'subjectId is required.' });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one past exam paper PDF.' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found.' });
    }

    // 1. Extract combined text from uploaded files (PDF/Image)
    const combinedText = await pyqAnalyzerService.extractTextFromFiles(files, subject.name);

    // 2. Call batch analysis via Gemini
    const result = await pyqAnalyzerService.analyzePYQBatch(combinedText, subject.name);

    // 3. Save aggregated analysis to DB
    const analysis = await PYQAnalysis.create({
      subjectId,
      examName: examName || result.examName || 'Board Exams',
      yearRange: result.yearRange,
      weightageData: result.weightageData,
      totalQuestions: result.totalQuestions,
      userId: req.user.id,
    });

    // 4. Save individual questions for trend heatmaps
    if (result.questions && result.questions.length > 0) {
      const questionsToCreate = result.questions.map((q) => ({
        pyqAnalysisId: analysis.id,
        chapterName: q.chapterName || 'General',
        topicName: q.topicName || 'General Concepts',
        questionText: q.questionText,
        marks: q.marks || 5,
        year: q.year || 2024,
      }));
      await PYQQuestion.bulkCreate(questionsToCreate);
    }

    // Clean up local temp files uploaded by multer
    for (const file of files) {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', file.path);
      });
    }

    res.status(201).json({
      success: true,
      data: {
        id: analysis.id,
        examName: analysis.examName,
        yearRange: analysis.yearRange,
        weightageData: analysis.weightageData,
        totalQuestions: analysis.totalQuestions,
        questions: result.questions,
      },
    });
  } catch (error) {
    // Attempt temp files cleanup on error
    if (req.files) {
      for (const file of req.files) {
        fs.unlink(file.path, (err) => {});
      }
    }
    next(error);
  }
};

exports.getSubjectAnalyses = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const analyses = await PYQAnalysis.findAll({
      where: { subjectId, userId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        { model: PYQQuestion, as: 'questions' },
      ],
    });

    res.status(200).json({
      success: true,
      data: analyses,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportPYQAnalysisPDF = async (req, res, next) => {
  try {
    const { analysisId } = req.params;
    const analysis = await PYQAnalysis.findOne({
      where: { id: analysisId, userId: req.user.id },
      include: [
        { model: PYQQuestion, as: 'questions' },
      ],
    });

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Analysis record not found.' });
    }

    const doc = new PDFDocument({ margin: 50 });
    
    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PYQ_Analysis_${analysis.yearRange}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(22).font('Helvetica-Bold').text('PYQ Trend Analysis Report', { align: 'center' });
    doc.moveDown();

    // Metadata
    doc.fontSize(12).font('Helvetica').text(`Exam Category: ${analysis.examName}`);
    doc.text(`Year Range: ${analysis.yearRange}`);
    doc.text(`Total Questions Analyzed: ${analysis.totalQuestions}`);
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`);
    doc.moveDown(1.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(1.5);

    // Chapter Weightage
    doc.fontSize(16).font('Helvetica-Bold').text('Chapter Marks Weightage Breakdown');
    doc.moveDown(0.5);

    const weightageList = analysis.weightageData?.chapterWeightage || [];
    weightageList.forEach((ch, idx) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. ${ch.chapterName}`);
      doc.fontSize(10).font('Helvetica').text(`   Weightage: ${ch.percentage}% (${ch.marks} marks over ${ch.questionCount} questions)`);
      doc.moveDown(0.3);
    });

    doc.moveDown(1.5);

    // Recurring Topics List
    doc.fontSize(16).font('Helvetica-Bold').text('High-Yield Priorities & Topics');
    doc.moveDown(0.5);

    const topicsSeen = {};
    (analysis.questions || []).forEach((q) => {
      if (q.topicName) {
        topicsSeen[q.topicName] = (topicsSeen[q.topicName] || 0) + 1;
      }
    });

    const topTopicsList = Object.entries(topicsSeen)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    topTopicsList.forEach(([topic, count], idx) => {
      doc.fontSize(11).font('Helvetica-Bold').text(`- ${topic}`);
      doc.fontSize(10).font('Helvetica').text(`   Appeared in past papers: ${count} times`);
      doc.moveDown(0.2);
    });

    doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Get PYQ metadata (aggregated statistics)
// @route   GET /api/pyqs/metadata
// @access  Private
exports.getPYQMetadata = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get aggregated PYQ statistics
    const totalPYQs = await PYQ.count({ where: { user: userId } });
    
    const analyzedCount = await PYQ.count({ 
      where: { user: userId, analyzed: true } 
    });

    // Get unique subjects
    const subjects = await PYQ.findAll({
      where: { user: userId },
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('subject')), 'subject']],
      raw: true,
    });
    const uniqueSubjects = subjects.length;

    // Get year range
    const yearStats = await PYQ.findOne({
      where: { user: userId },
      attributes: [
        [sequelize.fn('MIN', sequelize.col('year')), 'minYear'],
        [sequelize.fn('MAX', sequelize.col('year')), 'maxYear'],
      ],
      raw: true,
    });

    // Get difficulty distribution
    const difficultyStats = await PYQ.findAll({
      where: { user: userId },
      attributes: [
        'difficulty',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['difficulty'],
      raw: true,
    });

    const difficultyDistribution = {
      Easy: 0,
      Medium: 0,
      Hard: 0,
    };

    difficultyStats.forEach((stat) => {
      if (stat.difficulty && difficultyDistribution.hasOwnProperty(stat.difficulty)) {
        difficultyDistribution[stat.difficulty] = parseInt(stat.count, 10);
      }
    });

    const metadata = {
      totalPYQs,
      analyzedCount,
      uniqueSubjects,
      yearRange: {
        min: yearStats?.minYear || null,
        max: yearStats?.maxYear || null,
      },
      difficultyDistribution,
      lastUpdated: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error('[pyqController.getPYQMetadata] Error:', error);
    next(error);
  }
};

/**
 * @desc    Stream watermarked PDF PYQ worksheet with dynamic solution QR code
 * @route   GET /api/pyqs/export/worksheet/:id
 * @access  Private / Public
 */
exports.exportWorksheetPDF = async (req, res, next) => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id || req.query.studentId || 'STD-GUEST-USER';
    const cacheKey = `${id}_${studentId}`;

    if (worksheetPdfCache.has(cacheKey)) {
      const cached = worksheetPdfCache.get(cacheKey);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=OpenPrep_Worksheet_${id}.pdf`);
      res.setHeader('X-Cache', 'HIT');
      return res.send(cached);
    }

    let pyq = null;
    try {
      pyq = await PYQ.findByPk(id, {
        include: [
          { model: Subject, as: 'subject' },
          { model: Topic, as: 'topic' }
        ]
      });
    } catch (e) {
      // Fallback if db query fails or id is non-standard
    }

    const title = pyq
      ? `${pyq.title || 'PYQ Exam Paper'} (${pyq.year || new Date().getFullYear()})`
      : `PYQ Exam Practice Worksheet - ${id}`;

    const questions = pyq?.questions || [
      {
        question: 'Explain the fundamental derivation and experimental validation for this PYQ topic.',
        options: ['(A) Formulation Alpha', '(B) Formulation Beta', '(C) Formulation Gamma', '(D) Formulation Delta']
      },
      {
        question: 'Calculate the equilibrium constant and verify the thermodynamic feasibility.',
        options: ['(A) Option 1', '(B) Option 2', '(C) Option 3', '(D) Option 4']
      }
    ];

    const watermarkedPdfBuffer = await generateSampleWorksheetPDF(title, questions, {
      documentId: id,
      studentId,
      watermarkText: 'OpenPrep AI – Exam Prep Edition',
      baseUrl: 'https://openprep.ai',
      discussionUrl: `https://openprep.ai/pyq/discuss/${encodeURIComponent(id)}`
    });

    if (worksheetPdfCache.size > 100) {
      const oldestKey = worksheetPdfCache.keys().next().value;
      worksheetPdfCache.delete(oldestKey);
    }
    worksheetPdfCache.set(cacheKey, watermarkedPdfBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OpenPrep_Worksheet_${id}.pdf`);
    res.setHeader('X-Cache', 'MISS');
    return res.send(watermarkedPdfBuffer);
  } catch (error) {
    console.error('[pyqController.exportWorksheetPDF] Error:', error);
    next(error);
  }
};