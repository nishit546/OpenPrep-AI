const { expect, describe, it } = require('vitest');
const { getTracer } = require('../../config/telemetry');

describe('OpenTelemetry Tracing Configuration', () => {
  it('should export getTracer helper function', () => {
    expect(typeof getTracer).toBe('function');
    const tracer = getTracer('test-tracer');
    expect(tracer).toBeDefined();
    expect(typeof tracer.startSpan).toBe('function');
  });

  it('should create spans with setAttribute and setStatus methods', () => {
    const tracer = getTracer('test-tracer');
    const span = tracer.startSpan('test.span');
    expect(span).toBeDefined();
    expect(typeof span.setAttribute).toBe('function');
    expect(typeof span.setStatus).toBe('function');
    expect(typeof span.end).toBe('function');
    span.end();
  });
});
