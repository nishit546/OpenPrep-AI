const express = require('express');
const router = express.Router();
const { getDBMetrics } = require('../services/dbHealthService');
const { verifyMigrations } = require('../services/migrationVerifier');
const { sequelize } = require('../models');

// These endpoints expose database internals (query text, connection pool
// state, maintenance triggers) and were previously reachable by anyone who
// knew the path — this router had no auth applied at all, unlike every
// other /api/admin/* route. Locking it down the same way as adminRoutes.js.
router.use(protect);
router.use(requireAdmin);

// GET /api/admin/db/status
router.get('/status', async (req, res) => {
  try {
    const metrics = await getDBMetrics();
    const migrations = await verifyMigrations();
    
    res.json({
      timestamp: new Date().toISOString(),
      migrations,
      metrics
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate database metrics', details: err.message });
  }
});

// POST /api/admin/db/vacuum-analyze
router.post('/vacuum-analyze', async (req, res) => {
  try {
    if (sequelize.options?.dialect === 'postgres') {
      await sequelize.query('ANALYZE;');
      return res.json({ message: 'Database analyze maintenance completed successfully.' });
    }
    res.status(400).json({ message: 'Operation not supported on current SQL dialect engine.' });
  } catch (err) {
    res.status(500).json({ error: 'Maintenance cycle failed execution', details: err.message });
  }
});

// GET /api/admin/db/slow-queries
router.get('/slow-queries', getSlowQueries);

// GET /api/admin/db/index-recommendations
router.get('/index-recommendations', getIndexRecommendations);

module.exports = router;
