import axios from 'axios';


import {
  DEFAULT_TIMEOUT_MS,
  getRetryDelay,
  isNetworkError,
  isOnline,
  isTimeoutError,
  resolveTimeout,
  shouldRetry,
  wait,
  waitForOnline,
} from '../utils/retry.js';

const getBaseUrl = () => {
  if ((import.meta && import.meta.env && import.meta.env.VITE_API_URL)) {
    const url = (import.meta && import.meta.env && import.meta.env.VITE_API_URL).replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const API = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  // Without an explicit deadline axios waits forever, so a connection that
  // drops mid-flight leaves the promise unsettled and the page spinning with
  // no error to catch. Per-request overrides are applied in the request
  // interceptor below (AI/OCR/upload routes legitimately take longer).
  timeout: DEFAULT_TIMEOUT_MS,
});

/**
 * Emitted on the window so the UI can render a connectivity banner and so
 * pages can refetch once the connection returns. Fired both by the browser
 * online/offline events and when a request fails with a network error while
 * navigator.onLine still (incorrectly) reports true.
 */
export const CONNECTIVITY_EVENT = 'api-connectivity-change';

let lastKnownOnline = isOnline();

const emitConnectivity = (online) => {
  if (online === lastKnownOnline) return;
  lastKnownOnline = online;
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new CustomEvent(CONNECTIVITY_EVENT, { detail: { online } }));
};

export const isApiOnline = () => lastKnownOnline;

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('online', () => emitConnectivity(true));
  window.addEventListener('offline', () => emitConnectivity(false));
}

let csrfToken = null;

// Function to fetch CSRF token if missing
const fetchCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  try {
    // Awaited inside the request interceptor, so an unbounded call here would
    // stall every mutating request in the app.
    const response = await axios.get(`${API.defaults.baseURL}/csrf-token`, {
      withCredentials: true,
      timeout: DEFAULT_TIMEOUT_MS,
    });
    csrfToken = response.data.csrfToken;
    return csrfToken;
  } catch (error) {
    console.error('Failed to fetch CSRF token', error);
    return null;
  }
};

// Exposes the already-fetched CSRF token so callers that can't go through
// the axios interceptor (e.g. navigator.sendBeacon, which can't set
// headers) can still include it in their request body.
export const getCsrfToken = () => csrfToken;
// Attach access token and CSRF token to every request
API.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Widen the deadline for endpoints that are legitimately slow (AI
  // generation, PDF/OCR parsing, uploads) rather than forcing them into the
  // instance default and timing out work that was going to succeed.
  config.timeout = resolveTimeout(config.url || '', config.explicitTimeout);

  // Attach CSRF token for non-GET requests
  if (config.method && config.method.toLowerCase() !== 'get') {
    const token = await fetchCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }

  // Issue #1176: Attach client timezone offset to headers
  config.headers['X-Timezone-Offset'] = new Date().getTimezoneOffset();
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers['X-Timezone'] = tz;
  } catch (_e) {
    /* ignore */
  }

  // Issue #2211: Inject W3C Trace Context traceparent header for distributed tracing
  try {
    const { getW3CTraceParent } = await import('../config/telemetry.js');
    config.headers['traceparent'] = getW3CTraceParent();
  } catch (_e) {
    /* ignore */
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// ── Token refresh queue (prevents multiple simultaneous refresh calls) ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor: on 401, attempt silent token refresh before failing
// Helper to render premium non-blocking toast warnings for background failures
const showBackgroundErrorToast = (message) => {
  let container = document.getElementById('security-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'security-toast-container';
    container.className = 'fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'bg-neutral-900/95 text-yellow-500 border border-yellow-700/50 px-4 py-3 rounded shadow-2xl text-xs font-semibold font-inter transition-all duration-300 opacity-0 transform translate-y-2 pointer-events-auto flex items-center gap-2';
  toast.innerHTML = `
    <svg class="w-4 h-4 text-yellow-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>
  `;
  const span = document.createElement('span');
  span.textContent = message || '';
  toast.appendChild(span);

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
};

// ── Offline Response Cache Helpers ──
const API_OFFLINE_CACHE_KEY = 'openprep_api_get_cache';

const saveResponseToOfflineCache = (url, data) => {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return;
    const existingStr = localStorage.getItem(API_OFFLINE_CACHE_KEY);
    const cache = existingStr ? JSON.parse(existingStr) : {};
    cache[url] = { data, cachedAt: Date.now() };
    localStorage.setItem(API_OFFLINE_CACHE_KEY, JSON.stringify(cache));
  } catch (_e) {
    // ignore quota/storage errors
  }
};

const getResponseFromOfflineCache = (url) => {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return null;
    const existingStr = localStorage.getItem(API_OFFLINE_CACHE_KEY);
    if (!existingStr) return null;
    const cache = JSON.parse(existingStr);
    return cache[url]?.data || null;
  } catch (_e) {
    return null;
  }
};

// Response interceptor: cache GET responses & attempt offline fallback
API.interceptors.response.use(
  (response) => {
    if (response.config && response.config.method && response.config.method.toLowerCase() === 'get') {
      saveResponseToOfflineCache(response.config.url, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 429) {
      const data = error.response.data;
      const retryInSeconds = data?.retryInSeconds || parseInt(error.response.headers['retry-after'], 10) || 900;
      const errorMsg = data?.error || 'AI daily usage quota exceeded.';

      const resetTime = Date.now() + retryInSeconds * 1000;
      localStorage.setItem('ai_quota_reset_time', String(resetTime));
      localStorage.setItem('ai_quota_error_msg', errorMsg);

      window.dispatchEvent(
        new CustomEvent('quota-exceeded', {
          detail: { retryInSeconds, message: errorMsg },
        })
      );
    }

    // ── Offline GET Cache Fallback ──
    if (originalRequest && originalRequest.method && originalRequest.method.toLowerCase() === 'get' && (isNetworkError(error) || isTimeoutError(error) || !isOnline())) {
      emitConnectivity(false);
      const cachedData = getResponseFromOfflineCache(originalRequest.url);
      if (cachedData) {
        return Promise.resolve({
          data: cachedData,
          status: 200,
          statusText: 'OK (Offline Cache)',
          headers: {},
          config: originalRequest,
          isOfflineCached: true,
        });
      }
    }

    // ── Transient failure retry ──────────────────────────────────────────
    // A dropped packet, a cold-started backend or a momentary 503 should not
    // surface as a hard failure for a request that is safe to replay. Runs
    // before the 401 branch below so it never competes with token refresh.
    if (originalRequest && (isNetworkError(error) || isTimeoutError(error) || error.response)) {
      // A network error while the browser still claims to be online usually
      // means the connection died between the two — trust the failure.
      if (isNetworkError(error)) {
        emitConnectivity(isOnline() ? lastKnownOnline : false);
      }

      const attempt = originalRequest._retryAttempt || 0;

      if (shouldRetry(error, originalRequest, attempt)) {
        originalRequest._retryAttempt = attempt + 1;

        // Sleeping through a backoff while offline just burns attempts;
        // wait for the connection instead and go as soon as it returns.
        if (!isOnline()) {
          const recovered = await waitForOnline();
          if (!recovered) {
            return Promise.reject(error);
          }
          emitConnectivity(true);
        } else {
          await wait(getRetryDelay(attempt, error, originalRequest));
        }

        return API(originalRequest);
      }
    }

    // Only attempt refresh on 401, and only once per request
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/');
    if (error.response?.status !== 401 || originalRequest?._retry || isAuthEndpoint) {
      if (originalRequest?.isBackground) {
        showBackgroundErrorToast(error.response?.data?.error || 'Background auto-save failed');
        return Promise.resolve({ data: { success: false, error: 'Background save failed' } });
      }
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      if (originalRequest?.isBackground) {
        showBackgroundErrorToast('Session expired. Background auto-save failed.');
        return Promise.resolve({ data: { success: false, error: 'No refresh token' } });
      }
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return API(originalRequest);
        })
        .catch((err) => {
          if (originalRequest?.isBackground) {
            showBackgroundErrorToast('Background auto-save failed.');
            return Promise.resolve({ data: { success: false, error: 'Token refresh failed' } });
          }
          return Promise.reject(err);
        });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Bounded so a hung refresh cannot pin every queued request behind it
      // indefinitely — the whole queue below waits on this one call.
      const response = await axios.post(
        `${API.defaults.baseURL}/auth/refresh-token`,
        { refreshToken },
        { timeout: DEFAULT_TIMEOUT_MS }
      );

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      const { store } = await import('../store/index.js');
      store.dispatch({ type: 'auth/refreshToken/fulfilled', payload: response.data });

      API.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return API(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      const { store } = await import('../store/index.js');
      const { logout } = await import('../store/slices/authSlice.js');
      store.dispatch(logout());
      if (originalRequest?.isBackground) {
        showBackgroundErrorToast('Session expired. Auto-save disabled.');
        return Promise.resolve({ data: { success: false, error: 'Session expired' } });
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);


export const getReadinessProjection = (params) => API.get('/dashboard/readiness-projection', { params });

/**
 * Explain a molecular structure in plain language.
 * POST /api/molecular/explain
 * @param {{ structureId?: string, smiles?: string, question?: string }} payload
 */
export const explainMolecularStructure = (payload) => API.post('/molecular/explain', payload);

/**
 * Generate a targeted AI diagnostic quiz from forgotten flashcard concepts.
 * POST /api/quizzes/generate-remediation
 * @param {{ deckId: string, failedCardIds: string[], count?: number }} payload
 */
export const generateRemediationQuiz = (payload) =>
  API.post('/quizzes/generate-remediation', payload);

/**
 * Grade a written answer for a subjective question against its rubric.
 * POST /api/quizzes/evaluate-subjective
 * @param {{ questionId: string, quizId: string, userAnswerText: string }} payload
 */
export const evaluateSubjectiveAnswer = (payload) =>
  API.post('/quizzes/evaluate-subjective', payload);

export const generateDistractors = (payload) =>
  API.post('/quizzes/generate-distractors', payload);

export const getQuizRecommendations = (userId, params) =>
  API.get(`/recommendations/${userId}`, { params });

export const logRecommendationHit = (userId, payload) =>
  API.post(`/recommendations/${userId}/hit`, payload);

// ── Doubt Session (Socratic Hint) APIs ──────────────────────────────
/**
 * Start a new doubt-solving session.
 * POST /api/doubts/start
 * @param {FormData} formData – must include "question"; optionally "image" file.
 */
export const startDoubtSession = (formData) =>
  API.post('/doubts/start', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

/**
 * Send a follow-up message in an existing doubt session.
 * POST /api/doubts/:id/message
 */
export const sendDoubtMessage = (sessionId, message) =>
  API.post(`/doubts/${sessionId}/message`, { message });

/**
 * Reveal the next progressive hint for a doubt session.
 * POST /api/doubts/:id/reveal-step
 */
export const revealDoubtStep = (sessionId) => API.post(`/doubts/${sessionId}/reveal-step`);

// ── Spaced Repetition Flashcard Analytics APIs ──────────────────────────
export const getLeitnerDistribution = (deckId = null) =>
  API.get('/flashcards/analytics/leitner-distribution', { params: { deckId } });

export const getDueForecast = (deckId = null) =>
  API.get('/flashcards/analytics/due-forecast', { params: { deckId } });

// ── Smart Focus Pomodoro APIs ───────────────────────────────────────────
// Consumed by components/timer/PomodoroWidget.jsx, which renders for every
// signed-in user. Both calls were imported from here and never exported, so
// the production build failed with MISSING_EXPORT and nothing deployed.
// Paths follow backend/routes/smartFocusPomodoroRoutes.js.

/**
 * Suggested focus/break lengths for this user, derived from their session
 * history.
 * GET /api/smart-focus/recommendation
 */
export const getAdaptiveFocusRecommendation = () => API.get('/smart-focus/recommendation');

/**
 * Record a completed focus session.
 * POST /api/smart-focus/sessions
 * @param {{ durationMinutes: number, mode: string, taskType: string, ambientAudio?: string }} payload
 */
export const logFocusSession = (payload) => API.post('/smart-focus/sessions', payload);

// ── Two-Way Calendar Sync APIs ──────────────────────────────────────────
// Consumed by components/calendar/TwoWayCalendarSyncManager.jsx, rendered on
// the Settings page. Paths follow backend/routes/calendarSyncRoutes.js.

/**
 * Which calendars are linked, and the Apple iCal webcal feed URL.
 * GET /api/calendar-sync/status
 */
export const getCalendarSyncStatus = () => API.get('/calendar-sync/status');

/**
 * Exchange an OAuth code for a linked Outlook calendar.
 * POST /api/calendar-sync/outlook/link
 * @param {{ code: string }} payload
 */
export const linkOutlookCalendar = (payload) => API.post('/calendar-sync/outlook/link', payload);

/**
 * Check proposed study blocks against existing calendar events.
 * POST /api/calendar-sync/check-conflicts
 * @param {{ proposedEvents: object[], existingEvents: object[] }} payload
 */
export const checkCalendarConflicts = (payload) =>
  API.post('/calendar-sync/check-conflicts', payload);

// ── Micro-Learning Study Companion APIs ────────────────────────────────
export const getNextDueMicroCard = () => API.get('/micro/next-due-card');
export const submitMicroAnswer = (payload) => API.post('/micro/submit-answer', payload);

export default API;


