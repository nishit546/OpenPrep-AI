const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const academicRoutes = require('../../routes/academicRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Exam = require('../../models/Exam');
const Subject = require('../../models/Subject');
const Topic = require('../../models/Topic');
const Quiz = require('../../models/Quiz');
const QuizAttempt = require('../../models/QuizAttempt');
const Note = require('../../models/Note');
const Flashcard = require('../../models/Flashcard');
const Progress = require('../../models/Progress');
const StudyPlan = require('../../models/StudyPlan');
const PYQ = require('../../models/PYQ');

const app = express();
app.use(express.json());
app.use('/api/academic', academicRoutes);
app.use(errorHandler);

describe('Academic Controller - Integration Tests', () => {
  let testUser;
  let testExam;
  let testSubject;
  let authToken;
  let otherUser;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_academic';

    testUser = await User.create({
      name: 'Academic User',
      email: 'academic@example.com',
      password: 'password123',
    });

    otherUser = await User.create({
      name: 'Other User',
      email: 'otheracademic@example.com',
      password: 'password123',
    });

    authToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  // ===================== EXAMS =====================
  describe('Exams CRUD', () => {
    describe('POST /api/academic/exams', () => {
      it('should create an exam', async () => {
        const res = await request(app)
          .post('/api/academic/exams')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Final Exam',
            description: 'End of semester exam',
            date: '2026-12-15',
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Final Exam');
        expect(res.body.data.user.toString()).toBe(testUser.id.toString());
        testExam = res.body.data;
      });

      it('should return 400 when name is missing', async () => {
        const res = await request(app)
          .post('/api/academic/exams')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ description: 'No name', date: '2026-12-15' });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /api/academic/exams', () => {
      it('should return all exams for the user', async () => {
        const res = await request(app)
          .get('/api/academic/exams')
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should return empty array if no exams exist for different user', async () => {
        const otherToken = jwt.sign({ id: otherUser.id }, process.env.JWT_SECRET);
        const res = await request(app)
          .get('/api/academic/exams')
          .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
      });

      it('should sort exams by date ascending', async () => {
        const res = await request(app)
          .get('/api/academic/exams')
          .set('Authorization', `Bearer ${authToken}`);

        if (res.body.data.length >= 2) {
          for (let i = 1; i < res.body.data.length; i++) {
            const prev = new Date(res.body.data[i - 1].date).getTime();
            const curr = new Date(res.body.data[i].date).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }
        }
      });
    });

    describe('DELETE /api/academic/exams/:id', () => {
      it('should delete an exam and its subjects/topics', async () => {
        const exam = await Exam.create({
          name: 'Delete Exam',
          description: 'To be deleted',
          date: '2026-06-01',
          user: testUser.id,
        });

        const subject = await Subject.create({
          name: 'Delete Subject',
          description: 'To be deleted',
          exam: exam._id,
          user: testUser.id,
        });

        await Topic.create({
          name: 'Delete Topic',
          description: 'To be deleted',
          subject: subject._id,
          user: testUser.id,
        });

        const res = await request(app)
          .delete(`/api/academic/exams/${exam._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        // Verify cascade delete
        const subjectsLeft = await Subject.findAll({ where: { exam: exam.id } });
        expect(subjectsLeft.length).toBe(0);
      });

      it('should return 404 for non-existent exam', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .delete(`/api/academic/exams/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ===================== SUBJECTS =====================
  describe('Subjects CRUD', () => {
    let examForSubject;

    beforeEach(async () => {
      examForSubject = await Exam.create({
        name: 'Subject Test Exam',
        description: 'Exam for subject tests',
        date: '2026-07-01',
        user: testUser.id,
      });
    });

    describe('POST /api/academic/subjects', () => {
      it('should create a subject under an exam', async () => {
        const res = await request(app)
          .post('/api/academic/subjects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Mathematics',
            description: 'Math subject',
            examId: examForSubject._id,
          });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.name).toBe('Mathematics');
        testSubject = res.body.data;
      });

      it('should return 404 for non-existent examId', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .post('/api/academic/subjects')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Orphan Subject',
            description: 'No exam',
            examId: fakeId,
          });

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/academic/subjects', () => {
      it('should return subjects filtered by examId', async () => {
        const res = await request(app)
          .get('/api/academic/subjects')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ examId: examForSubject._id.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
      });
    });

    describe('DELETE /api/academic/subjects/:id', () => {
      it('should delete a subject and its topics', async () => {
        const subject = await Subject.create({
          name: 'Delete Subject',
          description: 'To delete',
          exam: examForSubject._id,
          user: testUser.id,
        });

        await Topic.create({
          name: 'Topic to Delete',
          description: 'Cascade delete',
          subject: subject._id,
          user: testUser.id,
        });

        const res = await request(app)
          .delete(`/api/academic/subjects/${subject._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        const topicsLeft = await Topic.findAll({ where: { subject: subject.id } });
        expect(topicsLeft.length).toBe(0);
      });
    });
  });

  // ===================== TOPICS =====================
  describe('Topics CRUD', () => {
    let examForTopic;
    let subjectForTopic;

    beforeEach(async () => {
      examForTopic = await Exam.create({
        name: 'Topic Exam',
        description: 'Exam for topic tests',
        date: '2026-08-01',
        user: testUser.id,
      });

      subjectForTopic = await Subject.create({
        name: 'Topic Subject',
        description: 'Subject for topic tests',
        exam: examForTopic._id,
        user: testUser.id,
      });
    });

    describe('POST /api/academic/topics', () => {
      it('should create a topic', async () => {
        const res = await request(app)
          .post('/api/academic/topics')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Algebra',
            description: 'Algebraic equations',
            subjectId: subjectForTopic._id,
            status: 'Medium',
            weightage: 30,
          });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Algebra');
        expect(res.body.data.status).toBe('Medium');
        expect(res.body.data.weightage).toBe(30);
      });

      it('should default status to Medium and weightage to 0', async () => {
        const res = await request(app)
          .post('/api/academic/topics')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Default Topic',
            subjectId: subjectForTopic._id,
          });

        expect(res.body.data.status).toBe('Medium');
        expect(res.body.data.weightage).toBe(0);
      });

      it('should return 404 for non-existent subject', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .post('/api/academic/topics')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Orphan Topic',
            subjectId: fakeId,
          });

        expect(res.status).toBe(404);
      });
    });

    describe('GET /api/academic/topics', () => {
      it('should return topics sorted by weightage descending', async () => {
        const res = await request(app)
          .get('/api/academic/topics')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ subjectId: subjectForTopic._id.toString() });

        expect(res.status).toBe(200);

        if (res.body.data.length >= 2) {
          for (let i = 1; i < res.body.data.length; i++) {
            expect(res.body.data[i - 1].weightage).toBeGreaterThanOrEqual(
              res.body.data[i].weightage
            );
          }
        }
      });
    });

    describe('PUT /api/academic/topics/:id', () => {
      it('should update topic fields', async () => {
        const topic = await Topic.create({
          name: 'Update Topic',
          description: 'Original',
          subject: subjectForTopic._id,
          user: testUser.id,
        });

        const res = await request(app)
          .put(`/api/academic/topics/${topic._id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Updated Topic',
            status: 'Strong',
            weightage: 90,
          });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated Topic');
        expect(res.body.data.status).toBe('Strong');
        expect(res.body.data.weightage).toBe(90);
      });

      it('should return 404 for non-existent topic', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .put(`/api/academic/topics/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Ghost' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /api/academic/topics/:id', () => {
      it('should delete a topic', async () => {
        const topic = await Topic.create({
          name: 'Delete Topic',
          subject: subjectForTopic._id,
          user: testUser.id,
        });

        const res = await request(app)
          .delete(`/api/academic/topics/${topic._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
      });

      it('should return 404 for non-existent topic', async () => {
        const fakeId = uuidv4();
        const res = await request(app)
          .delete(`/api/academic/topics/${fakeId}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(404);
      });
    });
  });

  // ===================== CASCADE DELETION =====================
  describe('Cascade Deletion', () => {
    let exam;
    let subject;
    let topic;
    let quiz;
    let quizAttempt;
    let flashcard;
    let note;
    let progress;
    let studyPlan;

    async function createFullHierarchy() {
      exam = await Exam.create({
        name: 'Cascade Test Exam',
        description: 'Exam for cascade deletion tests',
        date: '2026-12-01',
        user: testUser.id,
      });

      subject = await Subject.create({
        name: 'Cascade Test Subject',
        description: 'Subject for cascade tests',
        exam: exam._id,
        user: testUser.id,
      });

      topic = await Topic.create({
        name: 'Cascade Test Topic',
        description: 'Topic for cascade tests',
        subject: subject._id,
        user: testUser.id,
      });

      quiz = await Quiz.create({
        title: 'Cascade Test Quiz',
        subject: subject._id,
        topic: topic._id,
        createdBy: testUser.id,
      });

      quizAttempt = await QuizAttempt.create({
        user: testUser.id,
        quiz: quiz._id,
        score: 8,
        totalQuestions: 10,
      });

      flashcard = await Flashcard.create({
        user: testUser.id,
        subject: subject._id,
        topic: topic._id,
        front: 'Cascade test front',
        back: 'Cascade test back',
      });

      note = await Note.create({
        title: 'Cascade Test Note',
        content: 'Note for cascade tests',
        subject: subject._id,
        topic: topic._id,
        user: testUser.id,
      });

      progress = await Progress.create({
        user: testUser.id,
        subject: subject._id,
        topic: topic._id,
        completionPercentage: 50,
      });

      studyPlan = await StudyPlan.create({
        exam: exam._id,
        user: testUser.id,
        startDate: '2026-11-01',
        endDate: '2026-12-31',
      });
    }

    describe('DELETE /api/academic/exams/:id', () => {
      beforeEach(async () => {
        await createFullHierarchy();
      });

      it('should cascade-delete all child records when deleting an exam', async () => {
        const res = await request(app)
          .delete(`/api/academic/exams/${exam._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Verify all associated records are cascade-deleted
        expect(await Exam.findByPk(exam.id)).toBeNull();
        expect(await Subject.findByPk(subject.id)).toBeNull();
        expect(await Topic.findByPk(topic.id)).toBeNull();
        expect(await Quiz.findByPk(quiz.id)).toBeNull();
        expect(await QuizAttempt.findByPk(quizAttempt.id)).toBeNull();
        expect(await Flashcard.findByPk(flashcard.id)).toBeNull();
        expect(await Note.findByPk(note.id)).toBeNull();
        expect(await Progress.findByPk(progress.id)).toBeNull();
        expect(await StudyPlan.findByPk(studyPlan.id)).toBeNull();
      });

      it('should cascade-delete all child records when deleting an exam with multiple subjects/topics', async () => {
        // Add a second subject with its own topic, quiz, etc.
        const subject2 = await Subject.create({
          name: 'Cascade Subject 2',
          description: 'Second subject',
          exam: exam._id,
          user: testUser.id,
        });

        const topic2 = await Topic.create({
          name: 'Cascade Topic 2',
          subject: subject2._id,
          user: testUser.id,
        });

        const quiz2 = await Quiz.create({
          title: 'Cascade Quiz 2',
          subject: subject2._id,
          topic: topic2._id,
          createdBy: testUser.id,
        });

        await QuizAttempt.create({
          user: testUser.id,
          quiz: quiz2._id,
          score: 9,
          totalQuestions: 10,
        });

        // Delete the exam
        const res = await request(app)
          .delete(`/api/academic/exams/${exam._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Both subjects and their children should be gone
        expect(await Subject.findByPk(subject2.id)).toBeNull();
        expect(await Topic.findByPk(topic2.id)).toBeNull();
        expect(await Quiz.findByPk(quiz2.id)).toBeNull();
      });
    });

    describe('DELETE /api/academic/subjects/:id', () => {
      beforeEach(async () => {
        await createFullHierarchy();
      });

      it('should cascade-delete all child records when deleting a subject', async () => {
        const res = await request(app)
          .delete(`/api/academic/subjects/${subject._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Verify associated records are cascade-deleted
        expect(await Subject.findByPk(subject.id)).toBeNull();
        expect(await Topic.findByPk(topic.id)).toBeNull();
        expect(await Quiz.findByPk(quiz.id)).toBeNull();
        expect(await QuizAttempt.findByPk(quizAttempt.id)).toBeNull();
        expect(await Flashcard.findByPk(flashcard.id)).toBeNull();
        expect(await Note.findByPk(note.id)).toBeNull();
        expect(await Progress.findByPk(progress.id)).toBeNull();

        // Exam should still exist
        expect(await Exam.findByPk(exam.id)).not.toBeNull();
      });
    });

    describe('DELETE /api/academic/topics/:id', () => {
      beforeEach(async () => {
        await createFullHierarchy();
      });

      it('should cascade-delete flashcards, notes, and progress when deleting a topic', async () => {
        const res = await request(app)
          .delete(`/api/academic/topics/${topic._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Topic should be deleted
        expect(await Topic.findByPk(topic.id)).toBeNull();

        // Flashcards and Notes for this topic should be cascade-deleted
        expect(await Flashcard.findByPk(flashcard.id)).toBeNull();
        expect(await Note.findByPk(note.id)).toBeNull();
        expect(await Progress.findByPk(progress.id)).toBeNull();

        // Quiz should still exist with topic set to null
        const updatedQuiz = await Quiz.findByPk(quiz.id);
        expect(updatedQuiz).not.toBeNull();
        expect(updatedQuiz.topic).toBeNull();

        // Subject and exam should still exist
        expect(await Subject.findByPk(subject.id)).not.toBeNull();
        expect(await Exam.findByPk(exam.id)).not.toBeNull();
      });

      it('should preserve quiz attempts when deleting a topic', async () => {
        const res = await request(app)
          .delete(`/api/academic/topics/${topic._id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);

        // Quiz attempt should still exist (quiz is preserved)
        expect(await QuizAttempt.findByPk(quizAttempt.id)).not.toBeNull();
      });
    });
  });
});
