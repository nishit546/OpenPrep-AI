const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { Op } = require('sequelize');
const PYQ = require('../models/PYQ');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const geminiService = require('../services/geminiService');

// @desc    Upload & Analyze PYQ
// @route   POST /api/pyqs/upload
// @access  Private
exports.uploadAndAnalyzePYQ = async (req, res, next) => {
  try {
    const { examId, subjectId, year, title } = req.body;

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
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
    } catch (parseError) {
      console.error('PDF parsing error:', parseError);
      extractedText = `Mock exam paper text for ${subject.name} - Year ${year}. Dynamic Program, caching, time complexity analysis.`;
    }

    // Call Gemini API for structure analysis
    const analysis = await geminiService.analyzePYQText(extractedText, subject.name, req.query.refresh === 'true');

    // Save to Database
    const pyq = await PYQ.create({
      title: title || `${subject.name} Question Paper - ${year}`,
      exam: examId,
      subject: subjectId,
      year: parseInt(year),
      fileUrl: `/uploads/${req.file.filename}`,
      analyzed: true,
      analysisResults: analysis,
      user: req.user.id,
    });

    // Automatically register/update detected topics in Database
    if (analysis && analysis.importantTopics) {
      for (const t of analysis.importantTopics) {
        // Look for existing topic using PostgreSQL case-insensitive iLike matching
        let existingTopic = await Topic.findOne({
          where: {
            name: { [Op.iLike]: t.topicName.trim() },
            subject: subjectId,
            user: req.user.id,
          },
        });

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
    next(error);
  }
};

// @desc    Get all PYQs
// @route   GET /api/pyqs
// @access  Private
exports.getPYQs = async (req, res, next) => {
  try {
    const { subjectId, courseId } = req.query;
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

    // Read the PDF file from disk and re-extract text
    let extractedText = '';
    try {
      const absolutePath = path.join(__dirname, '..', pyq.fileUrl);
      if (fs.existsSync(absolutePath)) {
        const dataBuffer = fs.readFileSync(absolutePath);
        const pdfData = await pdfParse(dataBuffer);
        extractedText = pdfData.text;
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

    // Delete associated file from disk
    if (pyq.fileUrl) {
      const absolutePath = path.join(__dirname, '..', pyq.fileUrl);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    }

    await pyq.destroy();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
