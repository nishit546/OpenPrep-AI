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

const router = express.Router();

// Exams
router.post('/exams', protect, createExam);
router.get('/exams', protect, getExams);
router.delete('/exams/:id', protect, deleteExam);

// Subjects
router.post('/subjects', protect, createSubject);
router.get('/subjects', protect, getSubjects);
router.delete('/subjects/:id', protect, deleteSubject);

// Topics
router.post('/topics', protect, createTopic);
router.get('/topics', protect, getTopics);
router.put('/topics/:id', protect, updateTopic);
router.delete('/topics/:id', protect, deleteTopic);

module.exports = router;
