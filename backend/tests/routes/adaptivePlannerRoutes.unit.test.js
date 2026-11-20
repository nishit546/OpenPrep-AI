const express = require('express');
const request = require('supertest');
const router = require('../../routes/adaptivePlannerRoutes');

describe('adaptive planner route contract', () => {
  const app = express().use('/api/adaptive-planner', router);

  it.each([
    ['post', '/api/adaptive-planner/generate'],
    ['get', '/api/adaptive-planner/adjustments'],
    ['get', '/api/adaptive-planner/today'],
    ['get', '/api/adaptive-planner/stats'],
    ['post', '/api/adaptive-planner/adjustments/plan-1/apply'],
  ])('registers and protects %s %s', async (method, path) => {
    const response = await request(app)[method](path);
    expect(response.status).toBe(401);
  });
});
