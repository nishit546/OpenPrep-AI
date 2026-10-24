const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const {
  uploadSyllabus,
  createSyllabus,
  getGapAnalysis,
  generateNotesForGap,
  getSyllabusCatalog,
  compareSyllabi,
  updateMastery,
  getProgress,
} = require('../controllers/syllabusController');
const {
  uploadPdfSyllabus,
  getSyllabusDag,
  updateTopicStatus,
} = require('../controllers/syllabusDagController');

const router = express.Router();

// Configure multer for PDF uploads
const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit for multi-part syllabi
  fileFilter(req, file, cb) {
    if (!file.originalname.match(/\.(pdf)$/i)) {
      return cb(new Error('Please upload a PDF document.'));
    }
    cb(null, true);
  },
});

/**
 * @route   POST /api/syllabus/upload-pdf
 * @desc    Upload single or multi-part syllabus PDF documents and generate prerequisite DAG
 * @access  Private
 */
router.post('/upload-pdf', protect, (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    return uploadPdfSyllabus(req, res, next);
  });
});

/**
 * @route   GET /api/syllabus/:id/dag
 * @desc    Get topic prerequisite Directed Acyclic Graph (DAG) for a syllabus
 * @access  Private
 */
router.get('/:id/dag', protect, getSyllabusDag);

/**
 * @route   PATCH /api/syllabus/node/:id/status
 * @desc    Update topic completion status and unlock downstream dependency nodes
 * @access  Private
 */
router.patch('/node/:id/status', protect, updateTopicStatus);

/**
 * @route   PATCH /api/syllabus/:syllabusId/node/:nodeId/status
 * @desc    Update topic completion status within specific syllabus
 * @access  Private
 */
router.patch('/:syllabusId/node/:nodeId/status', protect, updateTopicStatus);

/**
 * @route   POST /api/syllabus/upload
 * @desc    Upload and parse a single PDF syllabus file
 * @access  Private
 */
router.post('/upload', protect, upload.single('syllabus'), uploadSyllabus);

/**
 * @route   POST /api/syllabus
 * @desc    Create a new structured syllabus from raw text
 * @access  Private
 */
router.post('/', protect, createSyllabus);

/**
 * @route   GET /api/syllabus
 * @desc    Get syllabus catalog for current user
 * @access  Private
 */
router.get('/', protect, getSyllabusCatalog);

/**
 * @route   POST /api/syllabus/compare
 * @desc    Compare 2+ of the user's syllabi: shared core topics, exclusive topics, overlap %
 * @access  Private
 */
router.post('/compare', protect, compareSyllabi);

/**
 * @route   GET /api/syllabus/:id/gap-analysis
 * @desc    Get gap analysis for a specific syllabus
 * @access  Private
 */
router.get('/:id/gap-analysis', protect, getGapAnalysis);

/**
 * @route   PUT /api/syllabus/mastery
 * @desc    Update the mastery level of a specific subtopic
 * @access  Private
 */
router.put('/mastery', protect, updateMastery);

/**
 * @route   POST /api/syllabus/topics/:topicId/generate-notes
 * @desc    Generate study notes for a specific syllabus gap
 * @access  Private
 */
router.post('/topics/:topicId/generate-notes', protect, generateNotesForGap);

/**
 * @route   GET /api/syllabus/:syllabusId/progress
 * @desc    Fetch syllabus progress and predicted completion date
 * @access  Private
 */
router.get('/:syllabusId/progress', protect, getProgress);

module.exports = router;
