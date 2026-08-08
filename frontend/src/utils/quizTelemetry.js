import API, { getCsrfToken } from '../services/api';

const FLUSH_INTERVAL_MS = 10000;
// Safety cap so a long-running tab (e.g. left open overnight) can't grow
// the in-memory buffer unbounded if flushes keep failing.
const MAX_BUFFER_SIZE = 200;

/**
 * Buffers quiz interaction events (question views, option selections, flag
 * toggles) in memory and periodically flushes them to the backend in a
 * single batched request, instead of firing an HTTP call per interaction.
 *
 * Flushes automatically every 10 seconds and on quiz submit, and as a
 * best-effort beacon on tab close / visibility change so no events are
 * lost when the user navigates away mid-quiz.
 */
export function createQuizTelemetryQueue(quizId) {
  let buffer = [];
  let intervalId = null;

  const enqueue = (eventType, data = {}) => {
    buffer.push({
      eventType,
      quizId,
      clientTimestamp: new Date().toISOString(),
      ...data,
    });
    if (buffer.length > MAX_BUFFER_SIZE) {
      buffer = buffer.slice(-MAX_BUFFER_SIZE);
    }
  };

  const flush = ({ useBeacon = false } = {}) => {
    if (buffer.length === 0) return;
    const events = buffer;
    buffer = [];

    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const token = localStorage.getItem('token');
      const csrfToken = getCsrfToken();
      const payload = JSON.stringify({ token, _csrf: csrfToken, events });
      const blob = new Blob([payload], { type: 'application/json' });
      const queued = navigator.sendBeacon(`${API.defaults.baseURL}/quiz/telemetry/batch`, blob);
      if (queued) return;
      // Fall through to a normal request if the browser couldn't queue the beacon
    }

    API.post('/quiz/telemetry/batch', { events }).catch(() => {
      // Best-effort: telemetry must never block or break the quiz UI
    });
  };

  const startAutoFlush = () => {
    if (intervalId) return;
    intervalId = setInterval(() => flush(), FLUSH_INTERVAL_MS);
  };

  const stopAutoFlush = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return { enqueue, flush, startAutoFlush, stopAutoFlush };
}