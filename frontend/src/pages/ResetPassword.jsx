import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { resetPassword, clearError, clearMessage } from '../store/slices/authSlice';

const ResetPassword = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const { loading, error, message, isAuthenticated } = useSelector((state) => state.auth);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    return () => { dispatch(clearError()); dispatch(clearMessage()); };
  }, [dispatch]);

  // If authenticated after reset, go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    dispatch(resetPassword({ token, password }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-amber-700/50 p-8">
        {message ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold font-playfair text-stone-900 text-center">Password Reset!</h1>
            <p className="text-stone-600 mt-2 text-sm text-center">{message}</p>
            <Link
              to="/login"
              className="block text-center mt-6 bg-amber-700 hover:bg-amber-800 text-amber-50 font-semibold px-6 py-2.5 rounded-sm transition-colors"
            >
              Go to Login
            </Link>
          </>
        ) : loading ? (
          <div className="text-center py-8">
            <Loader className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
            <p className="text-stone-600 text-sm">Resetting your password...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold font-playfair text-stone-900">Set New Password</h1>
              <p className="text-stone-600 mt-2 text-sm">Choose a strong password for your account</p>
            </div>

            {(error || localError) && (
              <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-6 flex items-start gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{localError || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 chars, upper, lower, number, special"
                    className="w-full pl-10 pr-10 py-2.5 bg-white border border-stone-300 rounded-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Repeat your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-400 text-amber-50 font-semibold py-2.5 rounded-sm transition-colors"
              >
                {loading ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : 'Reset Password'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
