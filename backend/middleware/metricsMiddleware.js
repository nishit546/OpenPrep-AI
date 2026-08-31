/**
 * @fileoverview Prometheus custom metrics collector and /metrics router middleware.
 */
const client = require('prom-client');

// Enable default metrics collection (CPU, Memory, Event Loop Lag, etc.)
client.collectDefaultMetrics({ prefix: 'openprep_' });

// Define custom application metrics
const httpRequestDuration = new client.Histogram({
  name: 'openprep_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const aiTokenUsage = new client.Counter({
  name: 'openprep_ai_token_usage_total',
  help: 'Total token usage by AI features',
  labelNames: ['model', 'feature'],
});

const activeWebsocketConnections = new client.Gauge({
  name: 'openprep_active_websocket_connections',
  help: 'Number of active socket connections',
});

const dbPoolActiveConnections = new client.Gauge({
  name: 'openprep_db_pool_active_connections',
  help: 'Number of active database pool connections',
});

/**
 * Express middleware to record request duration
 */
const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = diff[0] + diff[1] / 1e9; // Convert to seconds

    // Extract path/route format (replacing UUIDs or dynamic parameters)
    let route = req.route ? req.route.path : req.path;
    if (route) {
      route = route.replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, ':id');
    }

    httpRequestDuration.observe(
      {
        method: req.method,
        route: route || req.path,
        status_code: res.statusCode.toString(),
      },
      duration
    );
  });

  next();
};

/**
 * Endpoint response handler for /metrics scraping route
 */
const exposeMetrics = async (req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  metricsMiddleware,
  exposeMetrics,
  aiTokenUsage,
  activeWebsocketConnections,
  dbPoolActiveConnections,
  client,
};
