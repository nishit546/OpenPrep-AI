import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, AlertCircle, BookOpen, ShieldCheck, Building } from 'lucide-react';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import GitHubLoginButton from '../components/auth/GitHubLoginButton';
import { loginUser, loadUser, clearError } from '../store/slices/authSlice';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import ForgotPasswordModal from '../components/auth/ForgotPasswordModal';
import { useReCaptcha } from '../hooks/useReCaptcha';
import LazyImage from '../components/common/LazyImage';
import API from '../services/api';
import { loginWithPasskey, isPasskeySupported } from '../services/passkeyClient';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  const { executeCaptcha } = useReCaptcha();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  
  // New state for handling 2FA step
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpToken, setTotpToken] = useState('');
  const [verifying2FA, setVerifying2FA] = useState(false);
  const [twoFaError, setTwoFaError] = useState('');

  const [oauthError, setOauthError] = useState(null);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');

  const handleSsoDiscovery = async () => {
    if (!formData.email || !formData.email.includes('@')) {
      setSsoError('Please enter your institutional email address above first.');
      return;
    }

    setSsoLoading(true);
    setSsoError('');

    try {
      const res = await API.post('/auth/sso/discover', { email: formData.email });
      if (res.data.success && res.data.loginUrl) {
        window.location.href = res.data.loginUrl;
      }
    } catch (err) {
      setSsoError(err.response?.data?.error || 'No institutional SSO found for this domain.');
    } finally {
      setSsoLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorParam = searchParams.get('error');

    if (errorParam) {
      if (errorParam === 'oauth_cancelled') {
        setOauthError('Social authentication was cancelled.');
      } else {
        setOauthError(decodeURIComponent(errorParam));
      }
    }
  }, [navigate]);

  useEffect(() => {
    return () => { dispatch(clearError()); };
  }, [dispatch]);

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.warn('Google OAuth popup blocked or failed, redirecting:', err);
      window.location.href = googleAuthUrl;
    },
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = await executeCaptcha('login');
    dispatch(loginUser({ ...formData, captchaToken: token }));
  };

  return (
    <div className="min-h-screen w-screen md:h-screen md:max-h-screen md:overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-[#FFFBE9] dark:bg-[#000000] text-[#1F150C] dark:text-[#E1DCC9] font-inter relative select-none overflow-y-auto">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(173,139,115,0.12),transparent_50%)] pointer-events-none" />

      {/* Main Split Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl h-auto md:h-full md:max-h-[640px] sm:md:max-h-[680px] bg-[#FFFBE9] dark:bg-[#16120E] rounded-3xl border border-[#CEAB93]/60 dark:border-[#412D15] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* ── LEFT COLUMN: Sign In Form Panel (55% Width) ── */}
        <div className="w-full md:w-[55%] flex flex-col justify-between gap-6 md:gap-0 p-6 sm:p-8 md:p-10 bg-[#FFFBE9] dark:bg-[#16120E] text-[#1F150C] dark:text-[#E1DCC9] overflow-y-auto md:overflow-hidden">
          {/* Top Logo / Mobile Controls */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-[#AD8B73] dark:bg-[#1F150C] p-2 rounded-xl border border-[#CEAB93]/50 dark:border-[#412D15] group-hover:scale-105 transition-transform">
                <BookOpen className="h-5 w-5 text-[#FFFBE9] dark:text-[#E1DCC9]" />
              </div>
              <span className="font-playfair text-lg font-bold text-[#1F150C] dark:text-[#E1DCC9]">
                OpenPrep AI
              </span>
            </Link>
            <div className="flex md:hidden items-center gap-2">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Form Content */}
          <div className="my-auto py-2 flex flex-col gap-4 mt-6 md:mt-0">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-playfair tracking-tight text-[#1F150C] dark:text-[#E1DCC9]">
                {requires2FA ? 'Two-Factor Authentication' : 'Sign in'}
              </h1>
              <p className="text-[#412D15] dark:text-[#C4BA9D] mt-1.5 text-xs sm:text-sm font-medium leading-relaxed">
                {requires2FA 
                  ? 'Please enter the 6-digit code from your authenticator app or a recovery code.'
                  : <>Welcome back! Sign in to access your personalized dashboard. Don't have an account?{' '}
                    <Link to="/register" className="font-bold text-[#AD8B73] hover:underline dark:text-[#E1DCC9]">
                      Sign up here
                    </Link></>
                }
              </p>
            </div>

            {(error || oauthError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error || oauthError}</span>
              </div>
            )}

            {!requires2FA ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Address */}
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9] mb-1">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                    <input
                      id="login-email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="Provide your email address"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-[#1F150C] dark:text-[#E1DCC9] placeholder-[#8C6A53]/60 dark:placeholder-[#C4BA9D]/40 focus:outline-none focus:ring-2 focus:ring-[#AD8B73] dark:focus:ring-[#E1DCC9] text-xs sm:text-sm transition-all shadow-sm font-medium"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="login-password" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-xs font-semibold text-[#AD8B73] hover:underline dark:text-[#E1DCC9] bg-transparent border-none cursor-pointer p-0"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-[#1F150C] dark:text-[#E1DCC9] placeholder-[#8C6A53]/60 dark:placeholder-[#C4BA9D]/40 focus:outline-none focus:ring-2 focus:ring-[#AD8B73] dark:focus:ring-[#E1DCC9] text-xs sm:text-sm transition-all shadow-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C6A53] hover:text-[#1F150C] dark:text-[#C4BA9D] dark:hover:text-[#E1DCC9] transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit CTA */}
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl btn-primary-theme font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Sign In'
                  )}
                </motion.button>
              </form>
            ) : (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label htmlFor="totp-token" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9] mb-1">
                    Authentication Code
                  </label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                    <input
                      id="totp-token"
                      type="text"
                      maxLength="8"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value)}
                      required
                      placeholder="Enter 6-digit code or backup code"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-[#1F150C] dark:text-[#E1DCC9] placeholder-[#8C6A53]/60 dark:placeholder-[#C4BA9D]/40 focus:outline-none focus:ring-2 focus:ring-[#AD8B73] dark:focus:ring-[#E1DCC9] text-sm tracking-widest transition-all shadow-sm font-semibold"
                    />
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="submit"
                  disabled={verifying2FA}
                  className="w-full py-3 rounded-xl btn-primary-theme font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm mt-2"
                >
                  {verifying2FA ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Verify Code'
                  )}
                </motion.button>

                <button
                  type="button"
                  onClick={() => setRequires2FA(false)}
                  className="w-full text-center text-xs text-[#AD8B73] dark:text-[#C4BA9D] hover:underline font-semibold mt-2"
                >
                  Back to standard sign in
                </button>
              </form>
            )}

            {/* Social OAuth & Enterprise SSO Buttons */}
            {/* Passkey Passwordless Login */}
            {isPasskeySupported() && !requires2FA && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    setPasskeyLoading(true);
                    setPasskeyError('');
                    try {
                      const res = await loginWithPasskey({ email: formData.email || null });
                      if (res.token) {
                        dispatch(loadUser());
                        navigate('/dashboard', { replace: true });
                      }
                    } catch (err) {
                      if (err.name !== 'NotAllowedError') {
                        setPasskeyError(err.message || 'Passkey login failed');
                      }
                    } finally {
                      setPasskeyLoading(false);
                    }
                  }}
                  disabled={passkeyLoading}
                  className="w-full py-2.5 px-4 bg-[#AD8B73]/15 hover:bg-[#AD8B73]/25 dark:bg-[#251D17] dark:hover:bg-[#2F251E] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-xs sm:text-sm font-bold text-[#1F150C] dark:text-[#E1DCC9] transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Fingerprint className="w-4 h-4 text-[#AD8B73] dark:text-[#E1DCC9]" />
                  {passkeyLoading ? 'Verifying biometric...' : 'Sign in with Passkey (Face / Touch ID)'}
                </button>
                {passkeyError && (
                  <p className="text-[11px] text-red-600 dark:text-red-400 mt-1 text-center font-medium">
                    {passkeyError}
                  </p>
                )}
              </div>
            )}

            {/* Divider */}
            <div className="relative flex items-center justify-center my-1">
              <div className="border-t border-[#CEAB93]/40 dark:border-[#412D15] w-full" />
              <span className="bg-[#FFFBE9] dark:bg-[#16120E] px-3 text-[11px] uppercase tracking-wider text-[#8C6A53] dark:text-[#C4BA9D] font-semibold">
                Or continue with
              </span>
              <div className="border-t border-[#CEAB93]/40 dark:border-[#412D15] w-full" />
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-3">
              <GoogleLoginButton />
              <GitHubLoginButton />
              <button
                type="button"
                id="sso-login-btn"
                onClick={handleSsoDiscovery}
                disabled={ssoLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-[#CEAB93]/50 dark:border-[#412D15] bg-[#FFFBE9]/80 dark:bg-[#140F0A] hover:bg-[#F7EFE0] dark:hover:bg-[#1A140F] text-[#1F150C] dark:text-[#E1DCC9] font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Building className="w-4 h-4 text-[#AD8B73]" />
                {ssoLoading ? 'Discovering SSO IdP...' : 'Sign in with Institutional SSO'}
              </button>
              {ssoError && (
                <p className="text-[11px] text-red-500 font-semibold text-center mt-1">
                  {ssoError}
                </p>
              )}
            </div>
          </div>

          {/* Legal Terms Footer */}
          <p className="text-center text-[11px] text-[#8C6A53] dark:text-[#C4BA9D]/80 font-medium">
            By signing in you agree to OpenPrep's{' '}
            <a href="#" className="underline font-semibold hover:text-[#1F150C] dark:hover:text-[#E1DCC9]">Privacy Policy</a> and{' '}
            <a href="#" className="underline font-semibold hover:text-[#1F150C] dark:hover:text-[#E1DCC9]">Terms of Service</a>
          </p>
        </div>

        {/* ── RIGHT COLUMN: Hero Visual & Brand Panel (45% Width) ── */}
        <div className="hidden md:flex md:w-[45%] flex-col justify-between p-8 md:p-10 relative overflow-hidden bg-[#0D0A08] text-[#E1DCC9] border-l border-[#CEAB93]/30 dark:border-[#412D15]">
          {/* Abstract Hero Image Background */}
          <LazyImage
            src="/assets/abstract_hero.png"
            webpSrc="/assets/abstract_hero.webp"
            alt="OpenPrep Abstract Sculpture"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-screen scale-105 -z-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A08] via-[#0D0A08]/40 to-[#0D0A08]/70 -z-0" />

          {/* Top Brand Header & Controls */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#AD8B73] dark:bg-[#1F150C] border border-[#CEAB93]/40 dark:border-[#412D15] flex items-center justify-center shadow-lg">
                <BookOpen className="w-4 h-4 text-[#FFFBE9] dark:text-[#E1DCC9]" />
              </div>
              <span className="font-playfair text-xl font-extrabold tracking-wide text-white">
                OpenPrep
              </span>
            </div>
            <div className="flex items-center gap-2">
              <SoundToggle />
              <ThemeToggle />
            </div>
          </div>

          {/* Center Tagline */}
          <div className="relative z-10 my-auto py-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl sm:text-3xl font-extrabold font-playfair leading-tight text-white drop-shadow-md">
                Realize the potential of AI-Powered Exam Preparation
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-[#C4BA9D] leading-relaxed font-medium">
                Personalized study schedules, real-time PYQ analytics, interactive flashcards, and instant AI tutoring.
              </p>
            </motion.div>
          </div>

          {/* Bottom Support Footer */}
          <div className="relative z-10 text-xs text-[#C4BA9D]/90">
            <p className="font-medium">Experiencing issues?</p>
            <p className="mt-0.5">
              Get assistance via{' '}
              <a href="mailto:support@openprep.ai" className="underline font-bold text-white hover:text-[#CEAB93] transition">
                support@openprep.ai
              </a>
            </p>
          </div>
        </div>
      </motion.div>
      <ForgotPasswordModal isOpen={isForgotPasswordOpen} onClose={() => setIsForgotPasswordOpen(false)} />
    </div>
  );
};

export default Login;
