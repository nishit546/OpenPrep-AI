const express = require('express');
const router = express.Router();
const { getDBMetrics } = require('../services/dbHealthService');
const { verifyMigrations } = require('../services/migrationVerifier');
const { sequelize } = require('../models');

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

module.exports = router;
