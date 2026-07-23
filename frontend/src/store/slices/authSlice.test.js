import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  logout,
  clearError,
  clearMessage,
  clearRegistrationSuccess,
  registerUser,
  loginUser,
  loadUser,
  verifyEmail,
  forgotPassword,
  resetPassword,
  refreshTokenThunk,
} from './authSlice';
import API from '../../services/api';

const mockUser = { _id: 'user123', name: 'Test User', email: 'test@example.com' };
const mockToken = 'fake-jwt-token';
const mockRefreshToken = 'fake-refresh-token';

// Mock the API service
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
    defaults: { headers: { common: {} }, baseURL: '' },
  },
}));

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── Initial State ──
  describe('initial state', () => {
    test('should return initial state when no token in localStorage', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state).toEqual({
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        registrationSuccess: false,
        user: null,
        loading: false,
        error: null,
        message: null,
      });
    });

    test('should derive initial loading state from token in localStorage', () => {
      const state = authReducer(undefined, { type: 'unknown' });
      expect(state.token).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.loading).toBe(false);

      localStorage.setItem('token', 'test-token');
      const stateWithToken = authReducer(undefined, { type: 'unknown' });
      expect(stateWithToken.token).toBe('test-token');
      expect(stateWithToken.isAuthenticated).toBe(false);
      expect(stateWithToken.loading).toBe(true);
    });
  });

  // ── logout reducer ──
  describe('logout reducer', () => {
    test('should clear entire auth state and remove tokens from localStorage', () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('refreshToken', mockRefreshToken);
      const initialState = {
        token: mockToken,
        refreshToken: mockRefreshToken,
        isAuthenticated: true,
        registrationSuccess: false,
        user: mockUser,
        loading: false,
        error: null,
        message: 'some message',
      };

      const state = authReducer(initialState, logout());

      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.registrationSuccess).toBe(false);
      expect(state.user).toBeNull();
      expect(state.error).toBeNull();
      expect(state.message).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  // ── clearError reducer ──
  describe('clearError reducer', () => {
    test('should set error to null', () => {
      const state = authReducer({ error: 'Some error' }, clearError());
      expect(state.error).toBeNull();
    });

    test('should remain null when error is already null', () => {
      const state = authReducer({ error: null }, clearError());
      expect(state.error).toBeNull();
    });
  });

  // ── clearMessage reducer ──
  describe('clearMessage reducer', () => {
    test('should set message to null', () => {
      const state = authReducer({ message: 'Some message' }, clearMessage());
      expect(state.message).toBeNull();
    });
  });

  // ── clearRegistrationSuccess reducer ──
  describe('clearRegistrationSuccess reducer', () => {
    test('should set registrationSuccess to false', () => {
      const state = authReducer({ registrationSuccess: true }, clearRegistrationSuccess());
      expect(state.registrationSuccess).toBe(false);
    });
  });

  // ── registerUser thunk ──
  describe('registerUser async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('pending should set loading and clear error/message', () => {
      const state = authReducer(
        { loading: false, error: 'old', message: 'old' },
        { type: registerUser.pending.type }
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.message).toBeNull();
    });

    test('fulfilled should set registrationSuccess and NOT authenticate', async () => {
      API.post.mockResolvedValue({
        data: { success: true, message: 'Check your email', isEmailVerified: false },
      });

      await store.dispatch(registerUser({ name: 'Test', email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.registrationSuccess).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.message).toBe('Check your email');
      expect(localStorage.getItem('token')).toBeNull();
    });

    test('fulfilled should use default message when not provided', async () => {
      API.post.mockResolvedValue({
        data: { success: true, isEmailVerified: false },
      });

      await store.dispatch(registerUser({ name: 'Test', email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.registrationSuccess).toBe(true);
      expect(state.message).toContain('check your email');
    });

    test('rejected should set error', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'User already exists' } },
      });

      await store.dispatch(registerUser({ name: 'Test', email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.registrationSuccess).toBe(false);
      expect(state.error).toBe('User already exists');
    });

    test('rejected should use fallback error', async () => {
      API.post.mockRejectedValue(new Error('Network error'));

      await store.dispatch(registerUser({ name: 'Test', email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.error).toBe('Registration failed');
    });
  });

  // ── loginUser thunk ──
  describe('loginUser async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('pending should set loading and clear error/message', () => {
      const state = authReducer(
        { loading: false, error: 'old', message: 'old' },
        { type: loginUser.pending.type }
      );
      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.message).toBeNull();
    });

    test('fulfilled should set user, token, refreshToken, and authenticated', async () => {
      API.post.mockResolvedValue({
        data: { token: mockToken, refreshToken: mockRefreshToken, user: mockUser },
      });

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
      expect(state.refreshToken).toBe(mockRefreshToken);
      expect(state.user).toEqual(mockUser);
      expect(state.registrationSuccess).toBe(false);
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
    });

    test('rejected should set error', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'Invalid credentials' }, status: 401 },
      });

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'wrong' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });

    test('rejected 403 should set error message', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'Please verify your email before logging in' }, status: 403 },
      });

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Please verify your email before logging in');
    });

    test('rejected should use fallback error', async () => {
      API.post.mockRejectedValue(new Error('Network error'));

      await store.dispatch(loginUser({ email: 'test@example.com', password: 'StrongPass1!' }));

      const state = store.getState().auth;
      expect(state.error).toBe('Login failed');
    });
  });

  // ── loadUser thunk ──
  describe('loadUser async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('pending should set loading', () => {
      const state = authReducer(
        { loading: false },
        { type: loadUser.pending.type }
      );
      expect(state.loading).toBe(true);
    });

    test('fulfilled should set user and authenticated', async () => {
      API.get.mockResolvedValue({ data: { user: mockUser } });

      await store.dispatch(loadUser());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
    });

    test('rejected should clear everything and remove tokens', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('refreshToken', mockRefreshToken);
      API.get.mockRejectedValue({
        response: { data: { error: 'Token expired' } },
      });

      await store.dispatch(loadUser());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.error).toBe('Token expired');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    test('rejected should use fallback error message', async () => {
      API.get.mockRejectedValue(new Error('Network error'));

      await store.dispatch(loadUser());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Session expired');
    });
  });

  // ── verifyEmail thunk ──
  describe('verifyEmail async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('fulfilled should verify email without authenticating', async () => {
      API.post.mockResolvedValue({
        data: { success: true, message: 'Email verified successfully. You can now log in.' },
      });

      await store.dispatch(verifyEmail('valid-token'));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.message).toBe('Email verified successfully. You can now log in.');
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });

    test('rejected should set error', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'Invalid or expired token' } },
      });

      await store.dispatch(verifyEmail('bad-token'));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBe('Invalid or expired token');
    });
  });

  // ── forgotPassword thunk ──
  describe('forgotPassword async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('fulfilled should set message', async () => {
      API.post.mockResolvedValue({
        data: { success: true, message: 'Reset link sent!' },
      });

      await store.dispatch(forgotPassword('test@example.com'));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.message).toBe('Reset link sent!');
    });

    test('fulfilled should use default message', async () => {
      API.post.mockResolvedValue({ data: { success: true } });

      await store.dispatch(forgotPassword('test@example.com'));

      const state = store.getState().auth;
      expect(state.message).toContain('reset link');
    });

    test('rejected should set error', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'User not found' } },
      });

      await store.dispatch(forgotPassword('ghost@example.com'));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('User not found');
    });
  });

  // ── resetPassword thunk ──
  describe('resetPassword async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('fulfilled should authenticate user', async () => {
      API.post.mockResolvedValue({
        data: { token: mockToken, refreshToken: mockRefreshToken, message: 'Password reset successful' },
      });

      await store.dispatch(resetPassword({ token: 'valid-token', password: 'NewStrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(mockToken);
      expect(state.message).toBe('Password reset successful');
      expect(localStorage.getItem('token')).toBe(mockToken);
      expect(localStorage.getItem('refreshToken')).toBe(mockRefreshToken);
    });

    test('rejected should set error and clear tokens', async () => {
      API.post.mockRejectedValue({
        response: { data: { error: 'Invalid or expired token' } },
      });

      await store.dispatch(resetPassword({ token: 'bad-token', password: 'NewStrongPass1!' }));

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.error).toBe('Invalid or expired token');
    });
  });

  // ── refreshTokenThunk ──
  describe('refreshTokenThunk async thunk', () => {
    let store;

    beforeEach(() => {
      store = configureStore({ reducer: { auth: authReducer } });
    });

    test('fulfilled should update tokens', async () => {
      localStorage.setItem('refreshToken', mockRefreshToken);
      const newToken = 'new-jwt';
      const newRefresh = 'new-refresh';
      API.post.mockResolvedValue({
        data: { token: newToken, refreshToken: newRefresh },
      });

      await store.dispatch(refreshTokenThunk());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(true);
      expect(state.token).toBe(newToken);
      expect(state.refreshToken).toBe(newRefresh);
      expect(localStorage.getItem('token')).toBe(newToken);
      expect(localStorage.getItem('refreshToken')).toBe(newRefresh);
    });

    test('rejected should clear state and tokens', async () => {
      localStorage.setItem('token', mockToken);
      localStorage.setItem('refreshToken', mockRefreshToken);
      API.post.mockRejectedValue(new Error('Refresh failed'));

      await store.dispatch(refreshTokenThunk());

      const state = store.getState().auth;
      expect(state.loading).toBe(false);
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });
});
