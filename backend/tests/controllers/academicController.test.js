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
});
