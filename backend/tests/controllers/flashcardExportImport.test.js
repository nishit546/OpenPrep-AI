/**
 * Tests for flashcard export (GET /api/flashcards/export) and
 * import (POST /api/flashcards/import) endpoints.
 *
 * Uses supertest against a minimal Express app wired to the real
 * Sequelize models (same pattern as flashcardController.test.js).
 */
const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const flashcardRoutes = require('../../routes/flashcardRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Exam = require('../../models/Exam');
const Subject = require('../../models/Subject');
const Topic = require('../../models/Topic');
const Flashcard = require('../../models/Flashcard');

const app = express();
app.use(express.json());
app.use('/api/flashcards', flashcardRoutes);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuthHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function buildCSV(rows) {
  const header = 'front,back';
  return [header, ...rows.map((r) => `${r.front},${r.back}`)].join('\r\n');
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Flashcard Export & Import', () => {
  let testUser;
  let testSubject;
  let authToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_flashcard_export_import';

    testUser = await User.create({
      name: 'Export Import User',
      email: `export-import-${Date.now()}@example.com`,
      password: 'Password123!',
    });

    authToken = jwt.sign({ id: testUser.id, type: 'access' }, process.env.JWT_SECRET);

    const testExam = await Exam.create({
      name: 'Export Import Exam',
      description: 'Exam for export/import tests',
      date: new Date(),
      user: testUser.id,
    });

    testSubject = await Subject.create({
      name: 'Export Import Subject',
      description: 'Subject for export/import',
      exam: testExam.id,
      user: testUser.id,
    });
  });

  afterEach(async () => {
    await Flashcard.destroy({ where: { user: testUser.id } });
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  // ─── Export ────────────────────────────────────────────────────────────────

  describe('GET /api/flashcards/export', () => {
    beforeEach(async () => {
      await Flashcard.bulkCreate([
        { user: testUser.id, subject: testSubject.id, front: 'Q1', back: 'A1' },
        { user: testUser.id, subject: testSubject.id, front: 'Q2', back: 'A2' },
      ]);
    });

    it('exports JSON by default (no format param)', async () => {
      const res = await request(app)
        .get('/api/flashcards/export')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.data[0]).toHaveProperty('front');
      expect(res.body.data[0]).toHaveProperty('back');
    });

    it('exports JSON when format=json', async () => {
      const res = await request(app)
        .get('/api/flashcards/export?format=json')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('exports CSV when format=csv', async () => {
      const res = await request(app)
        .get('/api/flashcards/export?format=csv')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/csv/);
      expect(res.text).toContain('front,back,subject,topic');
      expect(res.text).toContain('Q1');
      expect(res.text).toContain('Q2');
    });

    it('filters by subjectId', async () => {
      // Another subject — cards should not appear in export of testSubject
      const otherExam = await Exam.create({
        name: 'Other Exam',
        description: '',
        date: new Date(),
        user: testUser.id,
      });
      const otherSubject = await Subject.create({
        name: 'Other Subject',
        exam: otherExam.id,
        user: testUser.id,
      });
      await Flashcard.create({ user: testUser.id, subject: otherSubject.id, front: 'OQ', back: 'OA' });

      const res = await request(app)
        .get(`/api/flashcards/export?subjectId=${testSubject.id}&format=json`)
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      const fronts = res.body.data.map((c) => c.front);
      expect(fronts).not.toContain('OQ');
    });

    it('returns empty list when no flashcards exist', async () => {
      await Flashcard.destroy({ where: { user: testUser.id } });
      const res = await request(app)
        .get('/api/flashcards/export')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns 400 for invalid format value', async () => {
      const res = await request(app)
        .get('/api/flashcards/export?format=xml')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(400);
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app).get('/api/flashcards/export');
      expect(res.status).toBe(401);
    });

it('CSV output includes proper header row', async () => {

      const res = await request(app)

        .get('/api/flashcards/export?format=csv')

        .set(makeAuthHeader(authToken));



      const firstLine = res.text.split(/\r?\n/)[0];

      expect(firstLine).toBe('front,back,subject,topic,tags,hint');

    });
    it('CSV escapes fields containing commas', async () => {
      await Flashcard.destroy({ where: { user: testUser.id } });
      await Flashcard.create({
        user: testUser.id,
        subject: testSubject.id,
        front: 'What is A, B?',
        back: 'Answer',
      });

      const res = await request(app)
        .get('/api/flashcards/export?format=csv')
        .set(makeAuthHeader(authToken));

      expect(res.status).toBe(200);
      expect(res.text).toContain('"What is A, B?"');
    });
  });

  // ─── Import ────────────────────────────────────────────────────────────────

  describe('POST /api/flashcards/import', () => {
    it('imports cards from a JSON body (cards array)', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .set(makeAuthHeader(authToken))
        .send({
          cards: [
            { front: 'Import Q1', back: 'Import A1' },
            { front: 'Import Q2', back: 'Import A2' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.imported).toBe(2);
      expect(res.body.skipped).toBe(0);
    });

    it('skips records missing front or back', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .set(makeAuthHeader(authToken))
        .send({
          cards: [
            { front: 'Valid Q', back: 'Valid A' },
            { front: '', back: 'No Front' },
            { front: 'No Back', back: '' },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.imported).toBe(1);
      expect(res.body.skipped).toBe(2);
      expect(res.body.invalid).toHaveLength(2);
    });

    it('returns 400 when all records are invalid', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .set(makeAuthHeader(authToken))
        .send({
          cards: [{ front: '', back: '' }],
        });

      expect(res.status).toBe(400);
    });

    it('returns 400 when no subjectId is provided', async () => {
      const res = await request(app)
        .post('/api/flashcards/import')
        .set(makeAuthHeader(authToken))
        .send({ cards: [{ front: 'Q', back: 'A' }] });

      expect(res.status).toBe(400);
    });

    it('returns 400 when subjectId is not a valid UUID', async () => {
      const res = await request(app)
        .post('/api/flashcards/import?subjectId=not-a-uuid')
        .set(makeAuthHeader(authToken))
        .send({ cards: [{ front: 'Q', back: 'A' }] });

      expect(res.status).toBe(400);
    });

    it('returns 404 when subject does not belong to the user', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${uuidv4()}`)
        .set(makeAuthHeader(authToken))
        .send({ cards: [{ front: 'Q', back: 'A' }] });

      expect(res.status).toBe(404);
    });

    it('returns 400 with neither file nor cards body', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .set(makeAuthHeader(authToken))
        .send({});

      expect(res.status).toBe(400);
    });

    it('imports cards from an uploaded JSON file', async () => {
      const tmpFile = path.join(__dirname, `tmp-${Date.now()}.json`);
      fs.writeFileSync(
        tmpFile,
        JSON.stringify([
          { front: 'File Q1', back: 'File A1' },
          { front: 'File Q2', back: 'File A2' },
        ])
      );

      try {
        const res = await request(app)
          .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
          .set(makeAuthHeader(authToken))
          .attach('file', tmpFile, { contentType: 'application/json', filename: 'cards.json' });

        expect(res.status).toBe(201);
        expect(res.body.imported).toBe(2);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it('imports cards from an uploaded CSV file', async () => {
      const tmpFile = path.join(__dirname, `tmp-${Date.now()}.csv`);
      fs.writeFileSync(tmpFile, buildCSV([
        { front: 'CSV Q1', back: 'CSV A1' },
        { front: 'CSV Q2', back: 'CSV A2' },
      ]));

      try {
        const res = await request(app)
          .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
          .set(makeAuthHeader(authToken))
          .attach('file', tmpFile, { contentType: 'text/csv', filename: 'cards.csv' });

        expect(res.status).toBe(201);
        expect(res.body.imported).toBe(2);
      } finally {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      }
    });

    it('returns 401 without auth token', async () => {
      const res = await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .send({ cards: [{ front: 'Q', back: 'A' }] });

      expect(res.status).toBe(401);
    });

    it('persists imported cards to the database', async () => {
      await request(app)
        .post(`/api/flashcards/import?subjectId=${testSubject.id}`)
        .set(makeAuthHeader(authToken))
        .send({ cards: [{ front: 'DB Q', back: 'DB A' }] });

      const count = await Flashcard.count({
        where: { user: testUser.id, subject: testSubject.id, front: 'DB Q' },
      });
      expect(count).toBe(1);
    });
  });
});
