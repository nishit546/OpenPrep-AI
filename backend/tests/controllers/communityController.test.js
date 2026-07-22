const request = require('supertest');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const communityRoutes = require('../../routes/communityRoutes');
const errorHandler = require('../../middleware/error');
const User = require('../../models/User');
const Feedback = require('../../models/Feedback');

const app = express();
app.use(express.json());
app.use('/api/community', communityRoutes);
app.use(errorHandler);

describe('Community Controller - Feedback List Pagination', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test_jwt_secret_for_community';

    testUser = await User.create({
      name: 'Feedback User',
      email: 'feedback-user@example.com',
      password: 'password123',
    });

    authToken = jwt.sign({ id: testUser.id }, process.env.JWT_SECRET);
  });

  afterAll(() => {
    delete process.env.JWT_SECRET;
  });

  beforeEach(async () => {
    await Feedback.destroy({ where: {} });
  });

  describe('GET /api/community/feedback', () => {
    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/community/feedback');

      expect(res.status).toBe(401);
    });

    it('should return empty data when no feedback exists', async () => {
      const res = await request(app)
        .get('/api/community/feedback')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('should paginate results with correct metadata', async () => {
      // Create 5 feedback items
      for (let i = 0; i < 5; i++) {
        await Feedback.create({
          title: `Feedback Item ${i + 1}`,
          description: `Description ${i + 1}`,
          type: i % 2 === 0 ? 'bug' : 'feature_request',
          status: 'open',
          user: testUser.id,
          upvotes: [],
        });
      }

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ page: 1, limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(3);
      expect(res.body.total).toBe(5);
      expect(res.body.page).toBe(1);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.data.length).toBe(3);
    });

    it('should return the correct page of results', async () => {
      // Create 5 feedback items with distinct titles
      for (let i = 0; i < 5; i++) {
        await Feedback.create({
          title: `Pageable Item ${i + 1}`,
          description: `Description ${i + 1}`,
          type: 'feature_request',
          status: 'open',
          user: testUser.id,
          upvotes: [],
        });
      }

      // Request page 2 with limit 3
      const res = await request(app)
        .get('/api/community/feedback')
        .query({ page: 2, limit: 3 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.page).toBe(2);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.data.length).toBe(2);
    });

    it('should sort by upvote count descending at the database level', async () => {
      const id1 = uuidv4();
      const id2 = uuidv4();
      const id3 = uuidv4();

      // Create items with increasing upvote counts
      const itemA = await Feedback.create({
        title: 'Low Upvotes',
        description: 'Least upvoted',
        type: 'bug',
        user: testUser.id,
        upvotes: [id1],
      });

      const itemB = await Feedback.create({
        title: 'High Upvotes',
        description: 'Most upvoted',
        type: 'feature_request',
        user: testUser.id,
        upvotes: [id1, id2, id3],
      });

      const itemC = await Feedback.create({
        title: 'Medium Upvotes',
        description: 'Medium upvoted',
        type: 'bug',
        user: testUser.id,
        upvotes: [id1, id2],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);

      // Most upvoted first
      expect(res.body.data[0].title).toBe('High Upvotes');
      expect(res.body.data[0].upvotes.length).toBe(3);

      // Second most upvoted
      expect(res.body.data[1].title).toBe('Medium Upvotes');
      expect(res.body.data[1].upvotes.length).toBe(2);

      // Least upvoted last
      expect(res.body.data[2].title).toBe('Low Upvotes');
      expect(res.body.data[2].upvotes.length).toBe(1);
    });

    it('should place items with empty upvotes at the end of the sorted list', async () => {
      const id1 = uuidv4();

      await Feedback.create({
        title: 'Empty Upvotes',
        description: 'No upvotes',
        type: 'bug',
        user: testUser.id,
        upvotes: [],
      });

      await Feedback.create({
        title: 'Has Upvotes',
        description: 'With upvotes',
        type: 'feature_request',
        user: testUser.id,
        upvotes: [id1],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);

      // Item with upvotes comes first
      expect(res.body.data[0].title).toBe('Has Upvotes');
      expect(res.body.data[0].upvotes.length).toBe(1);

      // Item with empty upvotes comes last
      expect(res.body.data[1].title).toBe('Empty Upvotes');
      expect(res.body.data[1].upvotes.length).toBe(0);
    });

    it('should filter results by type', async () => {
      await Feedback.create({
        title: 'Bug Report',
        description: 'A bug',
        type: 'bug',
        user: testUser.id,
        upvotes: [],
      });

      await Feedback.create({
        title: 'Feature Request',
        description: 'A feature',
        type: 'feature_request',
        user: testUser.id,
        upvotes: [],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ type: 'bug' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Bug Report');
      expect(res.body.data[0].type).toBe('bug');
    });

    it('should filter results by status', async () => {
      await Feedback.create({
        title: 'Open Feedback',
        description: 'Open item',
        type: 'bug',
        status: 'open',
        user: testUser.id,
        upvotes: [],
      });

      await Feedback.create({
        title: 'Planned Feedback',
        description: 'Planned item',
        type: 'feature_request',
        status: 'planned',
        user: testUser.id,
        upvotes: [],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ status: 'planned' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Planned Feedback');
      expect(res.body.data[0].status).toBe('planned');
    });

    it('should enforce maximum limit of 100', async () => {
      // Create 150 feedback items
      const items = [];
      for (let i = 0; i < 150; i++) {
        items.push({
          title: `Bulk Item ${i + 1}`,
          description: `Bulk description ${i + 1}`,
          type: 'bug',
          user: testUser.id,
          upvotes: [],
        });
      }
      await Feedback.bulkCreate(items);

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ limit: 999 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // limit should be capped at 100
      expect(res.body.count).toBeLessThanOrEqual(100);
      expect(res.body.total).toBe(150);
    });

    it('should return user details (name, email) with feedback', async () => {
      await Feedback.create({
        title: 'User Detail Test',
        description: 'Check user info',
        type: 'bug',
        user: testUser.id,
        upvotes: [],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].user).toBeDefined();
      expect(res.body.data[0].user.id).toBe(testUser.id);
      expect(res.body.data[0].user.name).toBe('Feedback User');
      expect(res.body.data[0].user.email).toBe('feedback-user@example.com');
    });

    it('should combine type and status filters correctly', async () => {
      await Feedback.create({
        title: 'Open Bug',
        description: 'Open bug',
        type: 'bug',
        status: 'open',
        user: testUser.id,
        upvotes: [],
      });

      await Feedback.create({
        title: 'Closed Bug',
        description: 'Closed bug',
        type: 'bug',
        status: 'closed',
        user: testUser.id,
        upvotes: [],
      });

      await Feedback.create({
        title: 'Open Feature',
        description: 'Open feature',
        type: 'feature_request',
        status: 'open',
        user: testUser.id,
        upvotes: [],
      });

      const res = await request(app)
        .get('/api/community/feedback')
        .query({ type: 'bug', status: 'open' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].title).toBe('Open Bug');
    });
  });
});
