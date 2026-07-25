const express = require('express');
const {
  createExam,
  getExams,
  deleteExam,
  createSubject,
  getSubjects,
  deleteSubject,
  createTopic,
  getTopics,
  updateTopic,
  deleteTopic,
} = require('../controllers/academicController');
const { protect } = require('../middleware/auth');
const {
  validateCreateExam,
  validateCreateSubject,
  validateCreateTopic,
  validateUpdateTopic,
} = require('../middleware/validators');

const cacheMiddleware = require('../middleware/cache');
const clearCache = require('../middleware/clearCache');

const router = express.Router();

// Exams
router.post('/exams', protect, validateCreateExam, clearCache(req => `exams:${req.user.id}:*`), createExam);
router.get('/exams', protect, cacheMiddleware(req => `exams:${req.user.id}:${req.originalUrl}`), getExams);
router.delete('/exams/:id', protect, clearCache(req => `exams:${req.user.id}:*`), deleteExam);

// Subjects
router.post('/subjects', protect, validateCreateSubject, clearCache(req => `exams:${req.user.id}:*`), createSubject);
router.get('/subjects', protect, getSubjects); // Subjects might be fetched often, but exams cache is more critical per issue 248. The issue doesn't list GET /api/academic/subjects.
router.delete('/subjects/:id', protect, clearCache(req => `exams:${req.user.id}:*`), deleteSubject);

// Topics
router.post('/topics', protect, validateCreateTopic, clearCache(req => `exams:${req.user.id}:*`), createTopic);
router.get('/topics', protect, getTopics);
router.put('/topics/:id', protect, validateUpdateTopic, clearCache(req => `exams:${req.user.id}:*`), updateTopic);
router.delete('/topics/:id', protect, clearCache(req => `exams:${req.user.id}:*`), deleteTopic);

module.exports = router;
