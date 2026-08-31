/**
 * @fileoverview OpenTelemetry distributed tracing SDK setup with auto-instrumentations.
 */
let sdk = null;
let api = null;

try {
  api = require('@opentelemetry/api');
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');

  // Configure trace exporter pointing to OTEL Collector / Tempo (default: http://localhost:4318/v1/traces)
  const traceExporter = new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  });

  sdk = new NodeSDK({
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Enable essential auto-instrumentations for pg, redis, express, and http
        '@opentelemetry/instrumentation-express': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-redis-4': { enabled: true },
        '@opentelemetry/instrumentation-http': { enabled: true },
      }),
    ],
    serviceName: process.env.OTEL_SERVICE_NAME || 'openprep-ai-backend',
  });

  // Start OpenTelemetry SDK
  sdk.start();
  console.log('[Telemetry] OpenTelemetry Node SDK initialized successfully.');

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('[Telemetry] OpenTelemetry SDK shutdown successfully.'))
      .catch((err) => console.error('[Telemetry] Error shutting down OpenTelemetry SDK:', err))
      .finally(() => process.exit(0));
  });
} catch (error) {
  console.warn(
    '[Telemetry] OpenTelemetry optional dependencies are missing or initialization failed. Distributed tracing fallback active. Error:',
    error.message
  );
}

const getTracer = (name = 'openprep-ai-backend') => {
  if (api && api.trace) {
    return api.trace.getTracer(name);
  }
  // Fallback no-op tracer interface
  return {
    startSpan: () => ({
      setAttribute: () => {},
      setAttributes: () => {},
      setStatus: () => {},
      recordException: () => {},
      end: () => {},
    }),
  };
};

module.exports = {
  sdk,
  getTracer,
};

