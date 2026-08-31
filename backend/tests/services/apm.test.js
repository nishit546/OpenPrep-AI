const { expect, describe, it } = require('vitest');
const request = require('supertest');
const app = require('../../server');

describe('APM Prometheus Telemetry Integration', () => {
  it('should expose /metrics endpoint and output Prometheus compliance format', async () => {
    const res = await request(app)
      .get('/metrics')
      .expect(200);

    // Verify response content types and scrapable structures
    expect(res.headers['content-type']).to.include('text/plain');
    expect(res.text).to.contain('openprep_http_request_duration_seconds');
    expect(res.text).to.contain('openprep_ai_token_usage_total');
    expect(res.text).to.contain('openprep_active_websocket_connections');
    expect(res.text).to.contain('openprep_db_pool_active_connections');
  });
});
