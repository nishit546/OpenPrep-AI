import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, Link, Navigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { verifyEmail } from '../store/slices/authSlice';

const VerifyEmail = () => {
  const { token } = useParams();
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (token) {
      dispatch(verifyEmail(token));
    }
  }, [token, dispatch]);

  // If already authenticated after verification, go to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-900 via-stone-900 to-stone-950 p-4">
      <div className="w-full max-w-md bg-gradient-to-br from-amber-50 to-amber-100 rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.8)] border border-amber-700/50 p-8 text-center">
        {loading ? (
          <>
            <Loader className="w-12 h-12 text-amber-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold font-playfair text-stone-900">Verifying Your Email...</h1>
            <p className="text-stone-600 mt-2 text-sm">Please wait while we confirm your email address.</p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold font-playfair text-stone-900">Verification Failed</h1>
            <p className="text-stone-600 mt-2 text-sm">{error}</p>
            <Link
              to="/login"
              className="inline-block mt-6 bg-amber-700 hover:bg-amber-800 text-amber-50 font-semibold px-6 py-2.5 rounded-sm transition-colors"
            >
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-xl font-bold font-playfair text-stone-900">Email Verified!</h1>
            <p className="text-stone-600 mt-2 text-sm">
              Your email has been verified successfully. You are now being redirected.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
