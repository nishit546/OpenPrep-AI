/**
 * @fileoverview OMR Controller for generating printable PDF OMR bubble sheets,
 * streaming official answer key PDFs, uploading scanned OMR sheets, and grading responses.
 */

const express = require('express');
const router = express.Router();
const { generateOmrSheet, generateAnswerKey } = require('../services/omrPdfService');
const omrProcessorService = require('../services/omrProcessorService');
const { Quiz, AnswerKey } = require('../models');

/**
 * GET /api/quizzes/:id/omr-sheet.pdf
 * Compiles and streams a printable vector PDF OMR sheet for a given quiz.
 */
const getOmrSheetPdf = async (req, res) => {
  try {
    const { id } = req.params;
    let quizData = { id, examCode: 'NEET-2026-A1', questions: new Array(40).fill({}) };

    if (Quiz) {
      try {
        const found = await Quiz.findByPk(id);
        if (found) {
          quizData = {
            id: found.id,
            examCode: found.examCode || 'EXAM-2026',
            questions: found.questions || new Array(40).fill({}),
          };
        }
      } catch (dbErr) {
        console.warn('[OMRController] Database record fetch failed, using fallback quiz data:', dbErr.message);
      }
    }

    const studentInfo = { id: req.query.studentId || (req.user ? req.user.id : 'GUEST-USER') };
    const pdfBuffer = await generateOmrSheet(quizData, studentInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=OMR_Sheet_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[OMRController] Error generating OMR sheet PDF:', err);
    return res.status(500).json({
      error: 'Failed to compile and stream layout sheet vector',
      details: err.message,
    });
  }
};

/**
 * GET /api/quizzes/:id/answer-key.pdf
 * Compiles and streams the official PDF answer key for a given quiz.
 */
const getAnswerKeyPdf = async (req, res) => {
  try {
    const { id } = req.params;
    let quizData = {
      id,
      examCode: 'NEET-2026-A1',
      questions: [
        {
          question: 'What is the primary function of mitochondria?',
          correctAnswer: 'A',
          explanation: 'Powerhouse of the cell generating ATP.',
        },
      ],
    };

    if (Quiz) {
      try {
        const found = await Quiz.findByPk(id);
        if (found) {
          quizData = {
            id: found.id,
            examCode: found.examCode || 'EXAM-2026',
            questions: found.questions || [],
          };
        }
      } catch (dbErr) {
        console.warn('[OMRController] Database record fetch failed, using fallback answer key data:', dbErr.message);
      }
    }

    const pdfBuffer = await generateAnswerKey(quizData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Answer_Key_${id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('[OMRController] Error generating answer key PDF:', err);
    return res.status(500).json({
      error: 'Failed to compile and stream answer key vector',
      details: err.message,
    });
  }
};

/**
 * POST /api/omr/upload-and-grade
 * Processes an uploaded OMR image, performs optical scanning, and returns itemized scores.
 */
const uploadAndGradeOMR = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'OMR sheet image is required.' });
    }

    const { answerKeyId } = req.body;
    if (!answerKeyId) {
      return res.status(400).json({ success: false, message: 'Answer Key ID is required.' });
    }

    const answerKeyRecord = await AnswerKey.findByPk(answerKeyId);
    if (!answerKeyRecord) {
      return res.status(404).json({ success: false, message: 'Answer key record not found.' });
    }

    const { correctAnswers, markingScheme, gridConfig } = answerKeyRecord;

    const { studentAnswers, annotatedImageBase64 } = await omrProcessorService.processOMRSheet(
      req.file.buffer,
      gridConfig
    );

    let totalScore = 0;
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalUnattempted = 0;
    let totalNegativePenalty = 0;

    const itemizedBreakdown = [];

    Object.keys(correctAnswers).forEach((qNum) => {
      const studentAns = studentAnswers[qNum] || 'UNATTEMPTED';
      const correctAns = correctAnswers[qNum];

      let status = 'INCORRECT';
      let scoreForQ = 0;

      if (studentAns === correctAns) {
        status = 'CORRECT';
        scoreForQ = markingScheme.correct || 4;
        totalCorrect += 1;
      } else if (studentAns === 'UNATTEMPTED') {
        status = 'UNATTEMPTED';
        scoreForQ = markingScheme.unattempted || 0;
        totalUnattempted += 1;
      } else {
        status = studentAns === 'MULTIPLE' ? 'MULTIPLE_SHADED' : 'INCORRECT';
        const penalty = Math.abs(markingScheme.incorrect || 1);
        scoreForQ = -penalty;
        totalIncorrect += 1;
        totalNegativePenalty += penalty;
      }

      totalScore += scoreForQ;

      itemizedBreakdown.push({
        questionNumber: qNum,
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        status,
        score: scoreForQ,
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        totalScore,
        summary: {
          totalQuestions: Object.keys(correctAnswers).length,
          totalCorrect,
          totalIncorrect,
          totalUnattempted,
          negativePenalty: totalNegativePenalty,
        },
        itemizedBreakdown,
        annotatedOverlay: `data:image/png;base64,${annotatedImageBase64}`,
      },
    });
  } catch (error) {
    console.error('[OMRController] Upload & Grade error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process and grade OMR sheet.' });
  }
};

// Route Definitions
router.get('/:id/omr-sheet.pdf', getOmrSheetPdf);
router.get('/:id/answer-key.pdf', getAnswerKeyPdf);
router.post('/upload-and-grade', uploadAndGradeOMR);

module.exports = router;
module.exports.getOmrSheetPdf = getOmrSheetPdf;
module.exports.getAnswerKeyPdf = getAnswerKeyPdf;
module.exports.uploadAndGradeOMR = uploadAndGradeOMR;
