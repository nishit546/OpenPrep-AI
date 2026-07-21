import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPassword, clearError, clearMessage } from '../store/slices/authSlice';

const ForgotPassword = () => {
  const dispatch = useDispatch();
  const { loading, error, message } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');

  useEffect(() => {
    return () => { dispatch(clearError()); dispatch(clearMessage()); };
  }, [dispatch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-amber-700/50 p-8">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-amber-700 hover:text-amber-800 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Login
        </Link>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold font-playfair text-stone-900">Reset Password</h1>
          <p className="text-stone-600 mt-2 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {message && (
          <div className="bg-green-50 border border-green-200 rounded-sm p-3 mb-6 flex items-start gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && !message && (
          <div className="bg-red-50 border border-red-200 rounded-sm p-3 mb-6 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-300 rounded-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-700 hover:bg-amber-800 disabled:bg-amber-400 text-amber-50 font-semibold py-2.5 rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-amber-200 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
