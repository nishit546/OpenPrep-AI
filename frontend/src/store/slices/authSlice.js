import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../services/api';

// ── Helper: read tokens from localStorage ──
const getInitialToken = () => localStorage.getItem('token');
const getInitialRefreshToken = () => localStorage.getItem('refreshToken');

// ── Async Thunks ──

/** Register a new user. Backend returns { success, message, isEmailVerified }
 *  (no JWT — user must verify email first). */
export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await API.post('/auth/register', userData);
      // Do NOT store token — registration requires email verification
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Registration failed');
    }
  }
);

/** Login with email + password. Backend returns { token, refreshToken, user }. */
export const loginUser = createAsyncThunk(
  'auth/login',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await API.post('/auth/login', userData);
      const { token, refreshToken } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      return response.data;
    } catch (err) {
      // Pass through the backend error (e.g. "Please verify your email before logging in")
      const message = err.response?.data?.error || 'Login failed';
      const status = err.response?.status;
      return rejectWithValue(status === 403
        ? { error: message, needsVerification: true }
        : { error: message, needsVerification: false }
      );
    }
  }
);

/** Fetch the current user profile (GET /auth/me). */
export const loadUser = createAsyncThunk(
  'auth/loadUser',
  async (_, { rejectWithValue }) => {
    try {
      const response = await API.get('/auth/me');
      return response.data;
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return rejectWithValue(err.response?.data?.error || 'Session expired');
    }
  }
);

/** Verify email using the crypto token from the email link. */
export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async (token, { rejectWithValue }) => {
    try {
      const response = await API.post(`/auth/verify-email/${token}`);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Email verification failed');
    }
  }
);

/** Request a password reset email. */
export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      const response = await API.post('/auth/forgot-password', { email });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to send reset email');
    }
  }
);

/** Reset password using the crypto token from the email link. */
export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      const response = await API.post(`/auth/reset-password/${token}`, { password });
      const { token: jwt, refreshToken } = response.data;
      localStorage.setItem('token', jwt);
      localStorage.setItem('refreshToken', refreshToken);
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Password reset failed');
    }
  }
);

/** Refresh the access token using the stored refresh token. */
export const refreshTokenThunk = createAsyncThunk(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const stored = localStorage.getItem('refreshToken');
      if (!stored) throw new Error('No refresh token');
      const response = await API.post('/auth/refresh-token', { refreshToken: stored });
      const { token, refreshToken: newRefresh } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', newRefresh);
      return response.data;
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      return rejectWithValue('Session expired');
    }
  }
);

// ── Initial State ──
const initialState = {
  get token() { return getInitialToken(); },
  get refreshToken() { return getInitialRefreshToken(); },
  isAuthenticated: false,
  registrationSuccess: false,
  user: null,
  get loading() { return !!getInitialToken(); },
  error: null,
  message: null,
};

// ── Slice ──
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.registrationSuccess = false;
      state.user = null;
      state.error = null;
      state.message = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessage: (state) => {
      state.message = null;
    },
    clearRegistrationSuccess: (state) => {
      state.registrationSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // ── Register ──
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.registrationSuccess = true;
        state.message = action.payload.message || 'Registration successful. Please check your email to verify your account.';
        // NOT authenticated — email verification required
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.registrationSuccess = false;
        state.error = action.payload;
      })

      // ── Login ──
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.user = action.payload.user;
        state.registrationSuccess = false;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        // action.payload is { error, needsVerification }
        const payload = action.payload || { error: 'Login failed', needsVerification: false };
        state.error = typeof payload === 'string' ? payload : payload.error;
      })

      // ── Load User ──
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = action.payload;
      })

      // ── Verify Email ──
      .addCase(verifyEmail.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.refreshToken = null;
        state.user = null;
        state.message = action.payload.message || 'Email verified successfully. You can now log in.';
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Forgot Password ──
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.message = action.payload.message || 'Password reset link sent to your email.';
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ── Reset Password ──
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.message = action.payload.message || 'Password reset successful.';
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.token = null;
        state.refreshToken = null;
      })

      // ── Refresh Token ──
      .addCase(refreshTokenThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.error = 'Session expired. Please log in again.';
      });
  },
});

export const { logout, clearError, clearMessage, clearRegistrationSuccess } = authSlice.actions;
export default authSlice.reducer;
