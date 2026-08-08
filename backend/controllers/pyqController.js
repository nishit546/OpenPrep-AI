const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Op } = require('sequelize');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const geminiService = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { clusterByCosineSimilarity } = require('../utils/vectorUtils');

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
const { examId, subjectId, year, title, difficulty } = req.body;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a question paper PDF' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    // Read PDF and extract text
    let extractedText = '';
    try {
      await pdfParseSemaphore.acquire();
      try {
        const dataBuffer = await fs.promises.readFile(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text;
      } finally {
        pdfParseSemaphore.release();
      }
    } catch (parseError) {
      console.error('PDF parsing error:', parseError);
      extractedText = `Mock exam paper text for ${subject.name} - Year ${year}. Dynamic Program, caching, time complexity analysis.`;
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
      fileUrl: `/uploads/${req.file.filename}`,
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

// @desc    Get all PYQs for the authenticated user// @route   GET /api/pyqs
// @access  Private
exports.getPYQs = async (req, res, next) => {
  try {
    const { subjectId, courseId, year, difficulty, chapter } = req.query;
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