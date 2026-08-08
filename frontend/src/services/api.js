import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

let csrfToken = null;

// Function to fetch CSRF token if missing
const fetchCsrfToken = async () => {
  if (csrfToken) return csrfToken;
  try {
    const response = await axios.get(`${API.defaults.baseURL}/csrf-token`, {
      withCredentials: true,
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

  // Attach CSRF token for non-GET requests
  if (config.method && config.method.toLowerCase() !== 'get') {
    const token = await fetchCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
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
    <span>${message}</span>
  `;

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
      const response = await axios.post(
        `${API.defaults.baseURL}/auth/refresh-token`,
        { refreshToken }
      );

      const { token: newToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);

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

export default API;
