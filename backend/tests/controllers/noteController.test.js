const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const noteRoutes = require('../../routes/noteRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Subject = require('../../models/Subject');
const Exam = require('../../models/Exam');

const app = express();
app.use(express.json());
app.use('/api/notes', noteRoutes);
app.use(errorHandler);

// Minimal valid PDF buffer (works with pdf-parse topic detection)
function createTestPdfBuffer() {
  return Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
  );
}

describe('Note Controller - Integration Tests', () => {
  let testUser;
  let otherUser;
  let authToken;
  let otherToken;
  let testExam;
  let testSubject;
  const uploadedFiles = [];

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_notes';

    testUser = await User.create({
      name: 'Note User',
      email: 'noteuser@example.com',
      password: 'StrongPass1!',
    });

    otherUser = await User.create({
      name: 'Other Note User',
      email: 'othernote@example.com',
      password: 'StrongPass1!',
    });

    testExam = await Exam.create({
      name: 'Note Test Exam',
      description: 'Exam for note tests',
      date: '2026-12-15',
      user: testUser.id,
    });

    testSubject = await Subject.create({
      name: 'Test Subject',
      description: 'Subject for note tests',
      exam: testExam.id,
      user: testUser.id,
    });

    authToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
    otherToken = jwt.sign({ id: otherUser.id }, process.env.JWT_SECRET);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  // =========================================================================
  // POST /api/notes — Upload Note
  // =========================================================================
  describe('POST /api/notes', () => {
    it('should upload a note with a PDF file and return 201', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Test Note')
        .field('subjectId', testSubject._id.toString())
        .field('content', 'Sample note content')
        .attach('file', createTestPdfBuffer(), 'test-note.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test Note');
      expect(res.body.data.fileUrl).toContain('/uploads/');
      expect(res.body.data.fileType).toBe('pdf');
      expect(res.body.data.user).toBe(testUser.id.toString());

      // Track file for cleanup
      if (res.body.data.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', res.body.data.fileUrl)
        );
      }
    });

    it('should upload a note without a file (text-only) and return 201', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Text Note')
        .field('subjectId', testSubject._id.toString())
        .field('content', 'No file attached');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileUrl).toBe('');
      expect(res.body.data.fileType).toBe('text');
    });

    it('should return 400 when title is missing', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('subjectId', testSubject._id.toString());

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when subjectId is missing', async () => {
      const res = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Orphan Note');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/notes')
        .field('title', 'No Auth Note')
        .field('subjectId', testSubject._id.toString());

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // =========================================================================
  // GET /api/notes — List Notes
  // =========================================================================
  describe('GET /api/notes', () => {
    beforeAll(async () => {
      // Create a note for the test user
      await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Listable Note')
        .field('subjectId', testSubject._id.toString())
        .field('content', 'Can be listed');
    });

    it('should return notes for the authenticated user', async () => {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('id');
      expect(res.body.data[0]).toHaveProperty('title');
      expect(res.body.data[0]).toHaveProperty('fileUrl');
      expect(res.body.data[0]).toHaveProperty('createdAt');
    });

    it('should return pagination metadata', async () => {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('totalPages');
    });

    it('should return empty array for a user with no notes', async () => {
      const res = await request(app)
        .get('/api/notes')
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/notes');

      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // DELETE /api/notes/:id — Delete Note
  // =========================================================================
  describe('DELETE /api/notes/:id', () => {
    let noteToDelete;

    beforeEach(async () => {
      // Create a fresh note for deletion tests
      const createRes = await request(app)
        .post('/api/notes')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'Delete Me')
        .field('subjectId', testSubject._id.toString())
        .attach('file', createTestPdfBuffer(), 'to-delete.pdf');

      noteToDelete = createRes.body.data;

      if (noteToDelete.fileUrl) {
        uploadedFiles.push(
          path.join(__dirname, '../../', noteToDelete.fileUrl)
        );
      }
    });

    it('should delete own note and return 200', async () => {
      const res = await request(app)
        .delete(`/api/notes/${noteToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 404 when deleting another user\'s note', async () => {
      const res = await request(app)
        .delete(`/api/notes/${noteToDelete.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent note', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .delete(`/api/notes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete(`/api/notes/${noteToDelete.id}`);

      expect(res.status).toBe(401);
    });
  });
});
