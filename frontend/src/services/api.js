import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';
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
} from '../utils/retry';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const url = import.meta.env.VITE_API_URL.replace(/\/$/, '');
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

// Response interceptor: on 401, attempt silent token refresh before failing
API.interceptors.response.use(
  (response) => response,
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

      store.dispatch({ type: 'auth/refreshToken/fulfilled', payload: response.data });

      API.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      processQueue(null, newToken);
      return API(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
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

export default API;
