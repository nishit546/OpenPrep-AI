const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const sanitizeHtml = require('sanitize-html');
const { Op } = require('sequelize');
const Note = require('../models/Note');const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { escapeLikePattern } = require('../utils/likePattern');
const { summarizeNoteText, transcribeAndSummarizeAudio } = require('../services/geminiService');
const { GeminiRateLimitError, GeminiServerError } = require('../services/geminiService');
const { extractTextFromImage, extractTextFromPDF } = require('../services/ocrService');
const { loadEnv } = require('../config/env');
const pdfExportService = require('../services/pdfExportService');
const { verifyDigitalSignature } = require('../services/signatureService');

// Helper to escape regex special characters if regex search is used anywhere
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @swagger
 * /api/notes/export:
 *   get:
 *     summary: Export user's notes as JSON or Markdown ZIP
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, zip]
 *           default: json
 *     responses:
 *       200:
 *         description: Notes exported successfully
 */
exports.exportNotes = async (req, res, next) => {
  try {
    const config = loadEnv();
    if (!config) {
      return res.status(500).json({ success: false, error: 'Configuration could not be loaded.' });
    }
    
    const limit = config.NOTE_EXPORT_LIMIT || 500;
    const noteCount = await Note.count({ where: { user: req.user.id } });
    
    if (noteCount > limit) {
      return res.status(400).json({ 
        success: false, 
        error: `Export exceeds the configured limit of ${limit} notes.` 
      });
    }

    const format = req.query.format || 'json';

    // Build filter criteria
    const whereClause = { user: req.user.id };
    if (req.query.subjectId) {
      whereClause.subject = req.query.subjectId;
    }

    if (req.query.topicIds) {
      const topicIdsArray = Array.isArray(req.query.topicIds)
        ? req.query.topicIds
        : req.query.topicIds.split(',').map((id) => id.trim()).filter(Boolean);
      if (topicIdsArray.length > 0) {
        whereClause.topic = { [Op.in]: topicIdsArray };
      }
    }

    const notes = await Note.findAll({
      where: whereClause,
      include: [
        { model: Subject, as: 'subjectRef', attributes: ['name'] },
        { model: Topic, as: 'topicRef', attributes: ['name', 'title'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    if (format === 'json') {
      const data = notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        subject: n.subjectRef?.name || null,
        topic: n.topicRef?.name || n.topicRef?.title || null,
        category: n.category,
        tags: n.tags,
        aiSummary: n.aiSummary,
        createdAt: n.createdAt,
      }));
      res.setHeader('Content-Disposition', 'attachment; filename="openprep-notes.json"');
      return res.status(200).json({ success: true, data });
    }

    if (format === 'pdf') {
      // Fetch user profile info for dynamic watermark & digital signature
      const userObj = await User.findByPk(req.user.id, { attributes: ['id', 'name', 'email'] });
      const studentName = userObj?.name || 'OpenPrep Explorer';
      const userEmail = userObj?.email || '';

      // Group notes by Topic (Chapter) or Subject/Category fallback
      const chapterMap = new Map();

      notes.forEach((note) => {
        const chapterKey = note.topicRef?.name || note.topicRef?.title || note.subjectRef?.name || note.category || 'General Study Notes';
        if (!chapterMap.has(chapterKey)) {
          chapterMap.set(chapterKey, {
            title: chapterKey,
            subjectName: note.subjectRef?.name || '',
            topicName: note.topicRef?.name || note.topicRef?.title || '',
            notes: [],
          });
        }
        chapterMap.get(chapterKey).notes.push(note);
      });

      const chapters = Array.from(chapterMap.values());

      const pdfOptions = {
        title: req.query.title || 'Custom Study Notes Digest',
        studentName,
        userEmail,
        userId: req.user.id,
        institution: req.query.institution || 'OpenPrep AI',
        includeToc: req.query.includeToc !== 'false',
        includeSignature: req.query.includeSignature !== 'false',
        watermarkText: req.query.watermarkText || '',
        watermarkOpacity: req.query.watermarkOpacity ? parseFloat(req.query.watermarkOpacity) : 0.06,
      };

      const pdfBuffer = await pdfExportService.generateChapterWiseNotesPdf(chapters, pdfOptions);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="openprep-study-notes.pdf"');
      return res.status(200).send(pdfBuffer);
    }

    // ZIP export — one .md file per note with a small metadata header
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="openprep-notes.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => next(err));
    archive.pipe(res);

    notes.forEach((note, index) => {
      const safeTitle = note.title.replace(/[^a-z0-9-_ ]/gi, '').trim() || `note-${index + 1}`;
      const frontMatter = [
        '---',
        `title: ${note.title}`,
        `subject: ${note.subjectRef?.name || ''}`,
        `category: ${note.category}`,
        `createdAt: ${note.createdAt.toISOString()}`,
        '---',
        '',
      ].join('\n');
      archive.append(`${frontMatter}${note.content || ''}`, { name: `${safeTitle}.md` });
    });

    await archive.finalize();
  } catch (error) {
    next(error);
  }
};

/**
 * @desc Verify PDF digital signature authenticity seal
 * @route POST /api/notes/verify-signature
 * @access Public / Protected
 */
exports.verifyNotePdfSignature = async (req, res, next) => {
  try {
    const { payloadData, signatureHash } = req.body;

    if (!payloadData || !signatureHash) {
      return res.status(400).json({
        success: false,
        error: 'Both payloadData and signatureHash are required for verification.',
      });
    }

    const isValid = verifyDigitalSignature(payloadData, signatureHash);

    return res.status(200).json({
      success: true,
      valid: isValid,
      message: isValid
        ? 'Digital signature is authentic, verified, and un-tampered.'
        : 'Digital signature verification failed. Document payload or signature hash is invalid.',
    });
  } catch (error) {
    next(error);
  }
};


/**
 * @swagger
 * /api/notes/import:
 *   post:
 *     summary: Import Markdown files as new notes
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Notes imported successfully
 */
exports.importNotes = async (req, res, next) => {
  try {
    const { subjectId, topicId } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'Please upload at least one .md file' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const createdNotes = [];

    for (const file of req.files) {
      const rawText = file.buffer.toString('utf8');
      const headingMatch = rawText.match(/^#\s+(.+)$/m);
      const title = (headingMatch ? headingMatch[1] : path.parse(file.originalname).name).slice(0, 100);

      // Strip any HTML/script payloads hiding inside the imported Markdown
      const safeContent = sanitizeHtml(rawText, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'h3']),
        allowedAttributes: {},
      });

      const note = await Note.create({
        title: title || 'Imported Note',
        content: safeContent,
        subject: subjectId,
        topic: topicId || null,
        fileType: 'text',
        category: 'Other',
        user: req.user.id,
      });

      createdNotes.push(note);
    }

    await ActivityLog.create({
      user: req.user.id,
      activityType: 'note_upload',
      description: `Imported ${createdNotes.length} note(s) from Markdown`,
    });

    res.status(201).json({ success: true, count: createdNotes.length, data: createdNotes });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/upload:
 *   post:
 *     summary: Upload a new study note (text, PDF, DOCX, or image)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Note uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Note'
 */
exports.uploadNote = async (req, res, next) => {
  try {
    const {
      title,
      content,
      subjectId,
      topicId,
      isPublic,
      category,
      tags,
      isOcrExtracted,
      ocrConfidence,
      originalImageUrl,
    } = req.body;

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    let fileUrl = '';
    let fileType = 'text';

    if (req.file) {
      fileUrl = `/uploads/${req.file.filename}`;
      const ext = req.file.filename.split('.').pop().toLowerCase();
      fileType = ext === 'pdf' ? 'pdf' : ['jpg', 'jpeg', 'png'].includes(ext) ? 'image' : 'docx';
    }

    const note = await Note.create({
      title,
      content,
      subject: subjectId,
      topic: topicId || null,
      fileUrl,
      fileType,
      isPublic: isPublic === 'true' || isPublic === true,
      category: category || 'Lecture Notes',
      tags: typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []),
      user: req.user.id,
      isOcrExtracted: isOcrExtracted === 'true' || isOcrExtracted === true,
      ocrConfidence: ocrConfidence ? parseFloat(ocrConfidence) : null,
      originalImageUrl: originalImageUrl || null,
    });

    // Log activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'note_upload',
      description: `Uploaded new study notes: "${note.title}"`,
    });

    // Index wiki-links
    const { indexNoteLinks } = require('../services/noteGraphService');
    await indexNoteLinks(note.id, note.content);

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/ocr-upload:
 *   post:
 *     summary: Extract text from image or PDF via OCR
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Text extracted successfully via OCR
 */
exports.uploadOcrNote = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an image or PDF file' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const validImageExts = ['.png', '.jpg', '.jpeg', '.webp'];
    const validPDFExts = ['.pdf'];
    const invalidExts = ['.gif', '.bmp'];

    if (invalidExts.includes(ext)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Unsupported format: GIF and BMP are not allowed for OCR.' });
    }

    if (!validImageExts.includes(ext) && !validPDFExts.includes(ext)) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Please upload a valid image file (.png, .jpg, .jpeg, .webp) or PDF (.pdf).' });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Process OCR based on file type
    let extractedText, confidence, wordCount;
    
    if (validPDFExts.includes(ext)) {
      // Extract text from PDF
      const pdfResult = await extractTextFromPDF(fileBuffer);
      extractedText = pdfResult.extractedText;
      confidence = pdfResult.confidence;
      wordCount = pdfResult.wordCount;
    } else {
      // Extract text from image using OCR
      const ocrResult = await extractTextFromImage(fileBuffer);
      extractedText = ocrResult.extractedText;
      confidence = ocrResult.confidence;
      wordCount = ocrResult.wordCount;
    }
    
    // Sanitize extracted text
    const sanitizedText = sanitizeHtml(extractedText, {
      allowedTags: [], // Strip all HTML from OCR
      allowedAttributes: {}
    });

    // Check for empty results
    if (!sanitizedText || sanitizedText.trim().length === 0) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'No text could be extracted from the uploaded file. Please try a clearer image or a different file.' });
    }

    // Optionally cleanup the uploaded file if we don't want to store raw image beyond this endpoint,
    // but the issue allows storing as Note later. The prompt says "Do not store unnecessary OCR worker data or raw image data beyond the project's existing upload/storage flow."
    // We will keep the file in /uploads and let the frontend use its URL to create a Note.

    res.status(200).json({
      success: true,
      data: {
        extractedText: sanitizedText,
        confidence,
        wordCount,
        fileUrl: `/uploads/${req.file.filename}`,
      },
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
};

/**
 * @swagger
 * /api/notes:
 *   get:
 *     summary: Retrieve notes with search, filter, and pagination
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: subjectId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notes list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 */
exports.getNotes = async (req, res, next) => {
  try {
    const { subjectId, category, search, publicOnly } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const where = {};

    // Privacy filter
    if (publicOnly === 'true') {
      where.isPublic = true;
    } else {
      // By default show user's own notes, OR public notes
      where[Op.or] = [{ user: req.user.id }, { isPublic: true }];
    }

    if (subjectId) where.subject = subjectId;
    if (category) where.category = category;
    if (req.query.tag) {
      where.tags = { [Op.contains]: [req.query.tag] };
    }

    if (search) {
      // Sanitize search string to prevent regex or LIKE injection/errors
      const sanitizedQuery = escapeRegex(search);
      const searchOp = Op.iLike || Op.like;
      const sanitizedSearch = escapeLikePattern(sanitizedQuery);
      const searchCondition = {
        [Op.or]: [
          { title: { [searchOp]: `%${sanitizedSearch}%` } },
          { content: { [searchOp]: `%${sanitizedSearch}%` } },
        ],
      };

      if (where[Op.or]) {
        const existingOr = where[Op.or];
        delete where[Op.or];
        where[Op.and] = [{ [Op.or]: existingOr }, searchCondition];
      } else {
        where[Op.and] = searchCondition;
      }
    }

    const { count: total, rows: notes } = await Note.findAndCountAll({
      where,
      distinct: true,
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
        { model: User, as: 'userRef', attributes: ['id', 'name', 'email'] },
      ],
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    const populatedNotes = notes.map((n) => {
      const json = n.toJSON();
      json.subject = json.subjectRef;
      json.topic = json.topicRef;
      if (json.userRef) {
        json.user = {
          _id: json.userRef.id,
          id: json.userRef.id,
          name: json.userRef.name,
          email: json.userRef.email,
        };
      }
      return json;
    });

    res.status(200).json({
      success: true,
      count: populatedNotes.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: populatedNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/{id}/download:
 *   put:
 *     summary: Track note download and increment download count
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Download count incremented
 *       404:
 *         description: Note not found
 */
exports.downloadNote = async (req, res, next) => {
  try {
    const note = await Note.findByPk(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const isOwner = note.user === req.user.id;
    if (!isOwner && !note.isPublic) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    note.downloadsCount += 1;
    await note.save();

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   delete:
 *     summary: Delete a note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Note deleted successfully
 *       404:
 *         description: Note not found
 */
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({ where: { id: req.params.id, user: req.user.id } });
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    // Path traversal guard — the afterDestroy hook on the model handles actual file deletion
    if (note.fileUrl) {
      const uploadsDir = path.resolve(path.join(__dirname, '../uploads'));
      const filePath = path.resolve(path.join(__dirname, '..', note.fileUrl));
      const relative = path.relative(uploadsDir, filePath);
      const isInside = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

      if (!isInside) {
        return res.status(400).json({ success: false, error: 'Invalid file path' });
      }
    }

    await note.destroy();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/{id}/summarize:
 *   post:
 *     summary: Generate AI summary of a note using Gemini
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: AI summary generated or returned from cache
 *       404:
 *         description: Note not found
 */
exports.summarizeNote = async (req, res, next) => {
  try {
    const note = await Note.findOne({
      where: { id: req.params.id, user: req.user.id },
      include: [{ model: Subject, as: 'subjectRef', attributes: ['name'] }],
    });

    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    if (!note.content || note.content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Note has no text content to summarize',
      });
    }

    const forceRefresh = req.body.forceRefresh === true;

    // Return cached summary if available and not forcing refresh
    if (note.aiSummary && !forceRefresh) {
      return res.status(200).json({ success: true, data: note.aiSummary, cached: true });
    }

    const subjectName = note.subjectRef?.name || 'the subject';
    const aiSummary = await summarizeNoteText(note.content, subjectName, forceRefresh);

    // Cache AI summary on the note record
    note.aiSummary = aiSummary;
    await note.save();

    res.status(200).json({ success: true, data: aiSummary, cached: false });
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

/**
 * @swagger
 * /api/notes/voice:
 *   post:
 *     summary: Upload and process voice note audio file with Gemini AI
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Voice note transcribed and summarized successfully
 */
exports.uploadVoiceNote = async (req, res, next) => {
  try {
    const { title, subjectId, topicId, isPublic } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload an audio file' });
    }

    const subject = await Subject.findByPk(subjectId);
    if (!subject) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = req.file.mimetype;

    // Transcribe and summarize voice note via Gemini API
    const audioResult = await transcribeAndSummarizeAudio(fileBuffer, mimeType, subject.name);

    const note = await Note.create({
      title,
      content: audioResult.transcription || 'No transcription generated',
      subject: subjectId,
      topic: topicId || null,
      fileUrl,
      fileType: 'audio',
      isPublic: isPublic === 'true' || isPublic === true,
      category: 'Summary',
      aiSummary: {
        summary: audioResult.summary || '',
        keyConcepts: audioResult.keyConcepts || [],
        examTips: audioResult.examTips || [],
      },
      user: req.user.id,
    });

    // Log activity
    await ActivityLog.create({
      user: req.user.id,
      activityType: 'note_upload',
      description: `Uploaded and summarized voice note: "${note.title}"`,
    });

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    if (req.file) {
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (error instanceof GeminiRateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter,
      });
    }
    if (error instanceof GeminiServerError) {
      return res.status(503).json({
        success: false,
        error: error.message,
      });
    }

    next(error);
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   put:
 *     summary: Update an existing note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Note updated successfully
 *       404:
 *         description: Note not found
 */
exports.updateNote = async (req, res, next) => {
  try {
    const { title, content, isPublic, category, tags } = req.body;
    const note = await Note.findOne({ where: { id: req.params.id, user: req.user.id } });
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found or access denied' });
    }

    if (title !== undefined) note.title = title;
    if (content !== undefined) note.content = content;
    if (isPublic !== undefined) note.isPublic = isPublic === 'true' || isPublic === true;
    if (category !== undefined) note.category = category;
    if (tags !== undefined) note.tags = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (Array.isArray(tags) ? tags : []);

    await note.save();

    // Index wiki-links
    const { indexNoteLinks } = require('../services/noteGraphService');
    await indexNoteLinks(note.id, note.content);

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate invite link for collaboration
// @route   POST /api/notes/:id/share
// @access  Private
exports.shareCollaboration = async (req, res, next) => {
  try {
    const note = await Note.findOne({ where: { id: req.params.id, user: req.user.id } });
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    note.isCollaborative = true;
    await note.save();

    const inviteLink = `/notes/collaborative/${note.id}`;

    res.status(200).json({
      success: true,
      data: {
        isCollaborative: true,
        inviteLink,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/notes/{id}:
 *   get:
 *     summary: Retrieve single note by ID
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Note details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Note'
 *       404:
 *         description: Note not found
 */
exports.getNote = async (req, res, next) => {
  try {
    const note = await Note.findByPk(req.params.id, {
      include: [{ model: Subject, as: 'subjectRef', attributes: ['name'] }],
    });
    if (!note) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }

    const isOwner = note.user === req.user.id;
    if (!isOwner && !note.isCollaborative && !note.isPublic) {
      return res.status(403).json({ success: false, error: 'Access denied to this note' });
    }

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

exports.getNotesGraph = async (req, res, next) => {
  try {
    const { getKnowledgeGraph } = require('../services/noteGraphService');
    const graphData = await getKnowledgeGraph(req.user.id);
    res.status(200).json({ success: true, data: graphData });
  } catch (error) {
    next(error);
  }
};

exports.syncNotes = async (req, res, next) => {
  try {
    const { notes } = req.body;
    if (!Array.isArray(notes)) {
      return res.status(400).json({ success: false, error: 'Payload must contain a "notes" array' });
    }

    const { indexNoteLinks } = require('../services/noteGraphService');
    const syncedNotes = [];

    for (const item of notes) {
      let note = null;
      if (item.id) {
        note = await Note.findOne({ where: { id: item.id, user: req.user.id } });
      }

      if (note) {
        if (item.title !== undefined) note.title = item.title;
        if (item.content !== undefined) note.content = item.content;
        if (item.category !== undefined) note.category = item.category;
        if (item.tags !== undefined) note.tags = item.tags;
        await note.save();
      } else {
        note = await Note.create({
          id: item.id || undefined,
          title: item.title || 'Untitled Note',
          content: item.content || '',
          subject: item.subjectId || item.subject,
          category: item.category || 'Lecture Notes',
          tags: item.tags || [],
          user: req.user.id,
        });
      }

      await indexNoteLinks(note.id, note.content);
      syncedNotes.push(note);
    }

    res.status(200).json({ success: true, data: syncedNotes });
  } catch (error) {
    next(error);
  }
};
