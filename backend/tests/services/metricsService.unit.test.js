const { recordHttpRequest, recordDbQueryDuration, recordTokens, recordTokensConsumed, activeWebsocketConnections, register } = require('../../services/metricsService');

describe('Prometheus Metrics Telemetry Service', () => {
  
  beforeEach(() => {
    // Reset registers to guarantee clean runs
    register.clear();
    // Re-register metrics by calling require fresh or clearing
    const client = require('prom-client');
    client.register.clear();
  });

  it('correctly registers default system metrics and custom histograms/counters', async () => {
    // Re-import after clearing register
    const metricsService = require('../../services/metricsService');
    const metrics = await metricsService.register.metrics();
    
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('db_query_duration_seconds');
    expect(metrics).toContain('ai_tokens_consumed_total');
    expect(metrics).toContain('active_websocket_connections');
  });

  it('increments request counter and observes latency histogram', async () => {
    const metricsService = require('../../services/metricsService');
    
    metricsService.recordHttpRequest('POST', '/api/v1/auth/login', 200, 0.125);
    const metrics = await metricsService.register.metrics();

    expect(metrics).toContain('http_requests_total{method="POST",route="/api/v1/auth/login",status_code="200"} 1');
  });

  it('records database query durations in database histogram', async () => {
    const metricsService = require('../../services/metricsService');
    
    metricsService.recordDbQueryDuration(0.045);
    const metrics = await metricsService.register.metrics();

    expect(metrics).toContain('db_query_duration_seconds_count 1');
  });

  it('increments active websocket connections gauge counts correctly', async () => {
    const metricsService = require('../../services/metricsService');
    
    metricsService.activeWebsocketConnections.set(0);
    metricsService.activeWebsocketConnections.inc();
    let metrics = await metricsService.register.metrics();
    expect(metrics).toContain('active_websocket_connections 1');

    metricsService.activeWebsocketConnections.dec();
    metrics = await metricsService.register.metrics();
    expect(metrics).toContain('active_websocket_connections 0');
  });

  it('parses and counts tokens from Gemini response object', async () => {
    const metricsService = require('../../services/metricsService');
    
    const mockResult = {
      response: {
        usageMetadata: {
          promptTokenCount: 150,
          candidatesTokenCount: 85,
          totalTokenCount: 235,
        }
      }
    };

    metricsService.recordTokens(mockResult, 'gemini-1.5-pro');
    const metrics = await metricsService.register.metrics();

    expect(metrics).toContain('ai_tokens_consumed_total{model="gemini-1.5-pro",type="input"} 150');
    expect(metrics).toContain('ai_tokens_consumed_total{model="gemini-1.5-pro",type="output"} 85');
    expect(metrics).toContain('ai_tokens_consumed_total{model="gemini-1.5-pro",type="total"} 235');
  });
});
