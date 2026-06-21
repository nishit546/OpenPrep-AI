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

const router = express.Router();

// Exams
router.post('/exams', protect, validateCreateExam, createExam);
router.get('/exams', protect, getExams);
router.delete('/exams/:id', protect, deleteExam);

// Subjects
router.post('/subjects', protect, validateCreateSubject, createSubject);
router.get('/subjects', protect, getSubjects);
router.delete('/subjects/:id', protect, deleteSubject);

// Topics
router.post('/topics', protect, validateCreateTopic, createTopic);
router.get('/topics', protect, getTopics);
router.put('/topics/:id', protect, validateUpdateTopic, updateTopic);
router.delete('/topics/:id', protect, deleteTopic);

module.exports = router;
