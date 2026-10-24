const { sequelize } = require('../config/db');

class PoolManagerService {
  constructor() {
    this.queryLatencyHistory = [];
    this.maxLatencyHistorySize = 100;
    this.failureCount = 0;
    this.failureThreshold = 5;
    this.circuitState = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastStateChange = Date.now();
  }

  /**
   * Records execution latency of queries for rolling statistical analysis
   */
  recordLatency(durationMs) {
    if (this.queryLatencyHistory.length >= this.maxLatencyHistorySize) {
      this.queryLatencyHistory.shift();
    }
    this.queryLatencyHistory.push(durationMs);
  }

  /**
   * Calculates p50, p95, and average latency metrics
   */
  getLatencyMetrics() {
    if (this.queryLatencyHistory.length === 0) {
      return { p50: 0, p95: 0, avg: 0, samples: 0 };
    }

    const sorted = [...this.queryLatencyHistory].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const avg = parseFloat(
      (this.queryLatencyHistory.reduce((acc, curr) => acc + curr, 0) / this.queryLatencyHistory.length).toFixed(2)
    );

    return { p50, p95, avg, samples: sorted.length };
  }

  /**
   * Inspects the Sequelize pool (the one all app queries use) and updates
   * the openprep_db_pool_active_connections gauge.
   */
  getPoolStats(db = sequelize) {
    const pool = db && db.connectionManager && db.connectionManager.pool;
    const total = pool ? pool.size || 0 : 0;
    const idle = pool ? pool.available || 0 : 0;
    const active = pool ? pool.using || 0 : 0;
    const waiting = pool ? pool.waiting || 0 : 0;

    try {
      require('./metricsService').openprepDbPoolActiveConnections.set(active);
    } catch (e) {
      /* metrics must not break health checks */
    }

    return {
      pool: {
        total,
        active,
        idle,
        queueLength: waiting,
        max: (db && db.options && db.options.pool && db.options.pool.max) || 0,
        // legacy keys kept for existing consumers
        totalCount: total,
        idleCount: idle,
        waitingCount: waiting,
      },
      circuitBreaker: {
        state: this.circuitState,
        failureCount: this.failureCount,
        lastStateChange: new Date(this.lastStateChange).toISOString(),
      },
      latency: this.getLatencyMetrics(),
    };
  }

  /**
   * Health ping probe returning connection status and latency
   */
  async pingDatabase() {
    const start = Date.now();
    try {
      if (this.circuitState === 'OPEN') {
        const cooldownMs = 30000;
        if (Date.now() - this.lastStateChange > cooldownMs) {
          this.circuitState = 'HALF_OPEN';
          this.lastStateChange = Date.now();
        } else {
          throw new Error('Circuit breaker is OPEN. Connection probe suspended.');
        }
      }

      await sequelize.authenticate();
      const duration = Date.now() - start;
      this.recordLatency(duration);

      if (this.circuitState === 'HALF_OPEN') {
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        this.lastStateChange = Date.now();
      }

      return { status: 'healthy', latencyMs: duration };
    } catch (error) {
      this.failureCount += 1;
      if (this.failureCount >= this.failureThreshold) {
        this.circuitState = 'OPEN';
        this.lastStateChange = Date.now();
      }
      return { status: 'degraded', error: error.message, latencyMs: Date.now() - start };
    }
  }
}

module.exports = new PoolManagerService();
