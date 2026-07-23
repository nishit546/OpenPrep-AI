const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const pyqRoutes = require('../../routes/pyqRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Exam = require('../../models/Exam');
const PYQ = require('../../models/PYQ');

const app = express();
app.use(express.json());
app.use('/api/pyqs', pyqRoutes);
app.use(errorHandler);

// Minimal valid PDF buffer
function createTestPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
}

describe('PYQ Controller - Integration Tests', () => {
  let testUser;
  let otherUser;
  let authToken;
  let otherToken;
  let testExam;
  let testSubject;
  const uploadedFiles = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_pyq';

    testUser = await User.create({
      name: 'PYQ User',
      email: 'pyquser@example.com',
      password: 'StrongPass1!',
    });

    otherUser = await User.create({
      name: 'Other PYQ User',
      email: 'otherpyq@example.com',
      password: 'StrongPass1!',
    });

    testExam = await Exam.create({
      name: 'PYQ Test Exam',
      description: 'Exam for PYQ tests',
      date: '2026-12-15',
      user: testUser.id,
    });

    testSubject = await Subject.create({
      name: 'PYQ Subject',
      description: 'Subject for PYQ tests',
      exam: testExam.id,
      user: testUser.id,
    });

    authToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
    otherToken = jwt.sign({ id: otherUser.id }, process.env.JWT_SECRET);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;

    // Clean up any uploaded test files that weren't deleted during tests
    uploadedFiles.forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {
          // File may have been cleaned up by delete endpoint
        }
      }
    });
  });

  // =========================================================================
  // POST /api/pyqs/upload — Upload PYQ
  // =========================================================================
  describe('POST /api/pyqs/upload', () => {
    it('should upload a PYQ PDF and return 201 with analysis', async () => {
      const res = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2024')
        .attach('file', createTestPdfBuffer(), 'pyq-2024.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toContain('Question Paper');
      expect(res.body.data.fileUrl).toContain('/uploads/');
      expect(res.body.data.analyzed).toBe(true);
      expect(res.body.data.analysisResults).toBeDefined();
      expect(res.body.data.analysisResults).toHaveProperty('chapterWeightage');
      expect(res.body.data.analysisResults).toHaveProperty('importantTopics');
      expect(res.body.data.year).toBe(2024);

      // Track file
      if (res.body.data.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', res.body.data.fileUrl)
        );
      }
    });

    it('should return 400 when no file is attached', async () => {
      const res = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2024');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('upload a question paper');
    });

    it('should return 400 when subjectId is missing', async () => {
      const res = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('year', '2024')
        .attach('file', createTestPdfBuffer(), 'pyq.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/pyqs/upload')
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2024')
        .attach('file', createTestPdfBuffer(), 'pyq.pdf');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/pyqs — List PYQs
  // =========================================================================
  describe('GET /api/pyqs', () => {
    beforeAll(async () => {
      // Create a PYQ for listing tests
      const res = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2023')
        .attach('file', createTestPdfBuffer(), 'pyq-2023.pdf');

      if (res.body.data && res.body.data.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', res.body.data.fileUrl)
        );
      }
    });

    it('should return PYQs for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/pyqs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('year');
      expect(res.body.data[0]).toHaveProperty('fileUrl');
    });

    it('should return pagination metadata', async () => {
      const res = await request(app)
        .get('/api/pyqs')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('totalPages');
    });

    it('should return empty array for a user with no PYQs', async () => {
      const res = await request(app)
        .get('/api/pyqs')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/pyqs');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // GET /api/pyqs/:id — Get PYQ Details
  // =========================================================================
  describe('GET /api/pyqs/:id', () => {
    let existingPyq;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2025')
        .attach('file', createTestPdfBuffer(), 'pyq-2025.pdf');

      existingPyq = createRes.body.data;

      if (existingPyq && existingPyq.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', existingPyq.fileUrl)
        );
      }
    });

    it('should return PYQ details for the owner', async () => {
      const res = await request(app)
        .get(`/api/pyqs/${existingPyq.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(existingPyq.id);
      expect(res.body.data.title).toBe(existingPyq.title);
      expect(res.body.data.year).toBe(2025);
      expect(res.body.data.analysisResults).toBeDefined();
    });

    it('should return 404 when accessing another user\'s PYQ', async () => {
      const res = await request(app)
        .get(`/api/pyqs/${existingPyq.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent PYQ', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get(`/api/pyqs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // POST /api/pyqs/:id/analyze — Re-analyze PYQ
  // =========================================================================
  describe('POST /api/pyqs/:id/analyze', () => {
    let pyqToAnalyze;

    beforeAll(async () => {
      const createRes = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2024')
        .attach('file', createTestPdfBuffer(), 'pyq-analyze.pdf');

      pyqToAnalyze = createRes.body.data;

      if (pyqToAnalyze && pyqToAnalyze.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', pyqToAnalyze.fileUrl)
        );
      }
    });

    it('should re-analyze an owned PYQ and return 200', async () => {
      const res = await request(app)
        .post(`/api/pyqs/${pyqToAnalyze.id}/analyze`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(pyqToAnalyze.id);
      expect(res.body.data.analysisResults).toBeDefined();
      expect(res.body.data.analyzed).toBe(true);
    });

    it('should return 404 when analyzing another user\'s PYQ', async () => {
      const res = await request(app)
        .post(`/api/pyqs/${pyqToAnalyze.id}/analyze`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent PYQ', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .post(`/api/pyqs/${fakeId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).post(`/api/pyqs/${pyqToAnalyze.id}/analyze`);

      expect(res.status).toBe(401);
    });

    it('should return 400 when attempting path traversal analysis', async () => {
      const maliciousPyq = await PYQ.create({
        title: 'Trapped PYQ',
        exam: testExam.id,
        subject: testSubject._id.toString(),
        year: 2024,
        fileUrl: '../../.env',
        analyzed: true,
        user: testUser.id,
      });

      const res = await request(app)
        .post(`/api/pyqs/${maliciousPyq.id}/analyze`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid file path');

      // Cleanup
      await maliciousPyq.destroy();
    });
  });

  // =========================================================================
  // DELETE /api/pyqs/:id — Delete PYQ
  // =========================================================================
  describe('DELETE /api/pyqs/:id', () => {
    let pyqToDelete;

    beforeEach(async () => {
      // Create a fresh PYQ to delete
      const createRes = await request(app)
        .post('/api/pyqs/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('examId', testExam._id.toString())
        .field('subjectId', testSubject._id.toString())
        .field('year', '2022')
        .attach('file', createTestPdfBuffer(), 'pyq-delete.pdf');

      pyqToDelete = createRes.body.data;

      if (pyqToDelete && pyqToDelete.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', pyqToDelete.fileUrl)
        );
      }
    });

    it('should delete own PYQ and return 200', async () => {
      const res = await request(app)
        .delete(`/api/pyqs/${pyqToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when deleting another user\'s PYQ', async () => {
      const res = await request(app)
        .delete(`/api/pyqs/${pyqToDelete.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent PYQ', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/pyqs/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/api/pyqs/${pyqToDelete.id}`);

      expect(res.status).toBe(401);
    });

    it('should return 400 when attempting path traversal deletion', async () => {
      const maliciousPyq = await PYQ.create({
        title: 'Trapped PYQ',
        exam: testExam.id,
        subject: testSubject._id.toString(),
        year: 2024,
        fileUrl: '../../.env',
        analyzed: true,
        user: testUser.id,
      });

      const res = await request(app)
        .delete(`/api/pyqs/${maliciousPyq.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Invalid file path');

      // Cleanup
      await maliciousPyq.destroy();
    });
  });
});
