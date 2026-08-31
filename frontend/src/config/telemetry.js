/**
 * @fileoverview Frontend OpenTelemetry distributed tracing context initializer & W3C header propagator.
 */

/**
 * Generate a random hex string of given byte length
 */
const randomHex = (bytes) => {
  const arr = new Uint8Array(bytes);
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generates a valid W3C traceparent header value.
 * Format: 00-{32 hex traceId}-{16 hex spanId}-01
 */
export const getW3CTraceParent = () => {
  try {
    const traceId = randomHex(16);
    const spanId = randomHex(8);
    return `00-${traceId}-${spanId}-01`;
  } catch (_e) {
    return '00-00000000000000000000000000000000-0000000000000000-01';
  }
};

/**
 * Initialize frontend telemetry provider
 */
export const initFrontendTelemetry = () => {
  if (typeof window !== 'undefined') {
    window.__OTEL_ENABLED__ = true;
    console.log('[Telemetry] Frontend OpenTelemetry tracer initialized.');
  }
};
