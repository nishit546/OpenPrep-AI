import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import API from './api';
import { DEFAULT_TIMEOUT_MS, SLOW_ENDPOINT_TIMEOUT_MS } from '../utils/retry';

describe('API Service Response Interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  test('should not attempt token refresh when /auth/login returns 401', async () => {
    const error401 = {
      config: { url: '/auth/login', headers: {} },
      response: { status: 401, data: { error: 'Invalid credentials' } },
    };

    // Get the response error interceptor function
    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;

    const axiosPostSpy = vi.spyOn(axios, 'post');

    await expect(responseErrorInterceptor(error401)).rejects.toEqual(error401);
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  test('should not attempt token refresh when /auth/register returns 401', async () => {
    const error401 = {
      config: { url: '/auth/register', headers: {} },
      response: { status: 401, data: { error: 'Unauthorized' } },
    };

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;
    const axiosPostSpy = vi.spyOn(axios, 'post');

    await expect(responseErrorInterceptor(error401)).rejects.toEqual(error401);
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  test('should not attempt token refresh when /auth/refresh-token returns 401', async () => {
    const error401 = {
      config: { url: '/auth/refresh-token', headers: {} },
      response: { status: 401, data: { error: 'Invalid refresh token' } },
    };

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;
    const axiosPostSpy = vi.spyOn(axios, 'post');

    await expect(responseErrorInterceptor(error401)).rejects.toEqual(error401);
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  test('should not attempt token refresh for non-401 error status', async () => {
    // 403 rather than 500: a 500 on an idempotent request is now retried by
    // the transient-failure policy, so it would not reach the reject path.
    const error403 = {
      config: { url: '/quizzes', method: 'get', headers: {} },
      response: { status: 403, data: { error: 'Forbidden' } },
    };

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;
    const axiosPostSpy = vi.spyOn(axios, 'post');

    await expect(responseErrorInterceptor(error403)).rejects.toEqual(error403);
    expect(axiosPostSpy).not.toHaveBeenCalled();
  });

  test('should attempt token refresh on 401 for non-auth endpoints if refresh token exists', async () => {
    localStorage.setItem('refreshToken', 'valid-refresh-token');

    const originalRequest = {
      url: '/quizzes',
      headers: {},
    };

    const error401 = {
      config: originalRequest,
      response: { status: 401, data: { error: 'Token expired' } },
    };

    const axiosPostSpy = vi.spyOn(axios, 'post').mockResolvedValueOnce({
      data: { token: 'new-access-token', refreshToken: 'new-refresh-token' },
    });

    // Mock API retry request execution
    const apiSpy = vi.spyOn(API, 'request').mockResolvedValueOnce({ data: ['quiz1'] });

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;
    
    // Executing the interceptor should trigger axios.post to /auth/refresh-token
    try {
      await responseErrorInterceptor(error401);
    } catch {
      // ignore
    }

    expect(axiosPostSpy).toHaveBeenCalledWith(
      expect.stringContaining('/auth/refresh-token'),
      { refreshToken: 'valid-refresh-token' },
      // The refresh call is bounded so a hung refresh cannot pin the queue.
      expect.objectContaining({ timeout: expect.any(Number) })
    );
    expect(localStorage.getItem('token')).toBe('new-access-token');
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh-token');
    
    axiosPostSpy.mockRestore();
    apiSpy.mockRestore();
  });

  test('should resolve gracefully and show error toast for background tasks on failed refresh', async () => {
    localStorage.setItem('refreshToken', 'valid-refresh-token');

    const originalRequest = {
      url: '/notes',
      headers: {},
      isBackground: true,
    };

    const error401 = {
      config: originalRequest,
      response: { status: 401, data: { error: 'Token expired' } },
    };

    // Force axios.post for refresh token to fail
    const axiosPostSpy = vi.spyOn(axios, 'post').mockRejectedValueOnce(new Error('Refresh failed'));

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;

    const res = await responseErrorInterceptor(error401);

    // The promise should resolve to prevent unhandled rejection, returning error information
    expect(res).toBeDefined();
    expect(res.data).toBeDefined();
    expect(res.data.success).toBe(false);

    // Verify toast is injected into the DOM
    const toastContainer = document.getElementById('security-toast-container');
    expect(toastContainer).toBeInTheDocument();

    axiosPostSpy.mockRestore();
  });

  test('should safely escape HTML in background error toast (XSS defense)', async () => {
    localStorage.setItem('refreshToken', 'valid-refresh-token');
    const existing = document.getElementById('security-toast-container');
    if (existing) existing.remove();

    const originalRequest = {
      url: '/notes',
      method: 'post',
      headers: {},
      isBackground: true,
    };

    const error500 = {
      config: originalRequest,
      response: { status: 500, data: { error: '<img src=x onerror=alert(1)>' } },
    };

    const responseErrorInterceptor = API.interceptors.response.handlers[0].rejected;

    await responseErrorInterceptor(error500);

    const toastContainer = document.getElementById('security-toast-container');
    expect(toastContainer).toBeInTheDocument();
    
    const span = toastContainer.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(span.innerHTML).not.toContain('<img');
  });
});

describe('API Service Timeout Configuration', () => {
  test('the shared instance carries a default deadline', () => {
    // Without this, axios waits forever and a dropped connection leaves the
    // promise unsettled — the stuck-spinner bug this change fixes.
    expect(API.defaults.timeout).toBe(DEFAULT_TIMEOUT_MS);
    expect(API.defaults.timeout).toBeGreaterThan(0);
  });

  test('the request interceptor widens the deadline for slow endpoints', async () => {
    const requestInterceptor = API.interceptors.request.handlers[0].fulfilled;

    const slow = await requestInterceptor({ url: '/ai/generate-quiz', method: 'get', headers: {} });
    expect(slow.timeout).toBe(SLOW_ENDPOINT_TIMEOUT_MS);

    const normal = await requestInterceptor({ url: '/flashcards', method: 'get', headers: {} });
    expect(normal.timeout).toBe(DEFAULT_TIMEOUT_MS);
  });

  test('an explicit per-request timeout is preserved', async () => {
    const requestInterceptor = API.interceptors.request.handlers[0].fulfilled;

    const config = await requestInterceptor({
      url: '/flashcards',
      method: 'get',
      headers: {},
      explicitTimeout: 3000,
    });

    expect(config.timeout).toBe(3000);
  });
});

describe('API Service Transient Failure Retry', () => {
  let originalAdapter;
  let replay;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // The interceptor replays via API(config), which is the instance's bound
    // request function — a spy on API.request never sees it. Swapping the
    // adapter is the supported seam for observing the replayed call.
    originalAdapter = API.defaults.adapter;
    replay = vi.fn().mockResolvedValue({
      data: ['replayed'],
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    API.defaults.adapter = replay;
  });

  afterEach(() => {
    API.defaults.adapter = originalAdapter;
  });

  const interceptor = () => API.interceptors.response.handlers[0].rejected;

  test('retries an idempotent GET that failed with a network error', async () => {
    const originalRequest = { url: '/flashcards', method: 'get', headers: {} };
    const networkError = {
      config: originalRequest,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };

    const result = await interceptor()(networkError);

    expect(replay).toHaveBeenCalledTimes(1);
    expect(result.data).toEqual(['replayed']);
    expect(originalRequest._retryAttempt).toBe(1);
  });

  test('retries an idempotent GET on a 503', async () => {
    const originalRequest = { url: '/progress', method: 'get', headers: {} };
    const error503 = {
      config: originalRequest,
      response: { status: 503, headers: {}, data: {} },
    };

    await interceptor()(error503);

    expect(replay).toHaveBeenCalledTimes(1);
  });

  test('does not replay a POST, which could double-submit', async () => {
    const originalRequest = { url: '/quizzes/submit', method: 'post', headers: {} };
    const networkError = {
      config: originalRequest,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };

    await expect(interceptor()(networkError)).rejects.toBe(networkError);
    expect(replay).not.toHaveBeenCalled();
  });

  test('gives up after the attempt budget and rejects with the original error', async () => {
    const originalRequest = { url: '/flashcards', method: 'get', headers: {}, _retryAttempt: 2 };
    const networkError = {
      config: originalRequest,
      code: 'ERR_NETWORK',
      message: 'Network Error',
    };

    await expect(interceptor()(networkError)).rejects.toBe(networkError);
    expect(replay).not.toHaveBeenCalled();
  });

  test('does not retry a 404', async () => {
    const originalRequest = { url: '/notes/missing', method: 'get', headers: {} };
    const error404 = {
      config: originalRequest,
      response: { status: 404, headers: {}, data: {} },
    };

    await expect(interceptor()(error404)).rejects.toBe(error404);
    expect(replay).not.toHaveBeenCalled();
  });

  test('never replays the refresh-token call itself', async () => {
    const originalRequest = { url: '/auth/refresh-token', method: 'get', headers: {} };
    const error503 = {
      config: originalRequest,
      response: { status: 503, headers: {}, data: {} },
    };

    await expect(interceptor()(error503)).rejects.toBe(error503);
    expect(replay).not.toHaveBeenCalled();
  });
});
