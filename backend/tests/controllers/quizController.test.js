const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const quizRoutes = require('../../routes/quizRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Exam = require('../../models/Exam');
const Subject = require('../../models/Subject');
const Topic = require('../../models/Topic');
const Quiz = require('../../models/Quiz');
const QuizAttempt = require('../../models/QuizAttempt');

const app = express();
app.use(express.json());
app.use('/api/quizzes', quizRoutes);
app.use(errorHandler);

describe('Quiz Controller - Integration Tests', () => {
  let testUser;
  let testUser2;
  let testSubject;
  let testTopic;
  let authToken;
  let otherAuthToken;
  let testQuiz;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_quiz';

    testUser = await User.create({
      name: 'Quiz User',
      email: 'quiz@example.com',
      password: 'password123',
    });

    testUser2 = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: 'password123',
    });

    authToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
    otherAuthToken = jwt.sign({ id: testUser2.id }, process.env.JWT_SECRET);

    const examForSubject = await Exam.create({
      name: 'Quiz Test Exam',
      description: 'Exam for quiz subject',
      date: new Date(),
      user: testUser.id,
    });

    testSubject = await Subject.create({
      name: 'Test Subject',
      description: 'A subject for testing',
      exam: examForSubject.id,
      user: testUser.id,
    });

    testTopic = await Topic.create({
      name: 'Test Topic',
      description: 'A topic for testing',
      subject: testSubject._id,
      user: testUser.id,
    });

    const question1Id = uuidv4();
    const question2Id = uuidv4();

    testQuiz = await Quiz.create({
      title: 'Test Quiz',
      subject: testSubject._id,
      topic: testTopic._id,
      questions: [
        {
          _id: question1Id,
          questionText: 'What is 2+2?',
          options: ['1', '2', '3', '4'],
          correctAnswer: 3,
          explanation: '2+2 equals 4',
        },
        {
          _id: question2Id,
          questionText: 'What is the capital of France?',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correctAnswer: 1,
          explanation: 'Paris is the capital of France',
        },
      ],
      type: 'AI_Generated',
      createdBy: testUser.id,
    });
  });

  afterAll(async () => {
    delete process.env.JWT_SECRET;
  });

  describe('GET /api/quizzes', () => {
    it('should return quizzes belonging to the authenticated user (scoped query)', async () => {
      const res = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
      expect(res.body.data[0].title).toBe('Test Quiz');
    });

    it('should not return quizzes owned by other users (IDOR protection)', async () => {
      const res = await request(app)
        .get('/api/quizzes')
        .set('Authorization', `Bearer ${otherAuthToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/quizzes/attempts/history', () => {
    it('should return empty array when no attempts exist', async () => {
      const res = await request(app)
        .get('/api/quizzes/attempts/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('GET /api/quizzes/:id', () => {
    it('should return 404 for non-existent quiz', async () => {
      const fakeId = uuidv4();
      const res = await request(app)
        .get(`/api/quizzes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Quiz not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/quizzes/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid request');
    });

    it("should return 404 when another user tries to view someone else's quiz (IDOR protection)", async () => {
      const res = await request(app)
        .get(`/api/quizzes/${testQuiz._id}`)
        .set('Authorization', `Bearer ${otherAuthToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Quiz not found');
    });

    it('should return quiz for the owner', async () => {
      const res = await request(app)
        .get(`/api/quizzes/${testQuiz._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(testQuiz._id.toString());
      expect(res.body.data.title).toBe('Test Quiz');
    });
  });

  describe('POST /api/quizzes/:id/submit — IDOR Protection', () => {
    const validAnswers = [{ questionId: '000000000000000000000001', selectedAnswer: 0 }];

    it("should return 404 when another user tries to submit on someone else's quiz (IDOR protection)", async () => {
      const res = await request(app)
        .post(`/api/quizzes/${testQuiz._id}/submit`)
        .set('Authorization', `Bearer ${otherAuthToken}`)
        .send({ answers: validAnswers, timeSpent: 60 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Quiz not found');
    });

    it('should allow quiz owner to submit an attempt', async () => {
      const realAnswers = testQuiz.questions.map((q) => ({
        questionId: q._id.toString(),
        selectedAnswer: q.correctAnswer,
      }));

      const res = await request(app)
        .post(`/api/quizzes/${testQuiz._id}/submit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ answers: realAnswers, timeSpent: 120 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('score');
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.user).toBe(testUser.id.toString());
    });

    afterEach(async () => {
      // Clean up attempts created during these tests
      await QuizAttempt.destroy({ where: {} });
    });
  });
});
