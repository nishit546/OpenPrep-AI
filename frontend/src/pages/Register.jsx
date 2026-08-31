import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, BookOpen } from 'lucide-react';
import { registerUser, clearError, clearRegistrationSuccess } from '../store/slices/authSlice';
import { useReCaptcha } from '../hooks/useReCaptcha';
import LazyImage from '../components/common/LazyImage';
import ThemeToggle from '../components/ThemeToggle';
import SoundToggle from '../components/SoundToggle';
import GoogleLoginButton from '../components/auth/GoogleLoginButton';
import GitHubLoginButton from '../components/auth/GitHubLoginButton';

// Password validation criteria (synced with backend validators.js)
const PASSWORD_CRITERIA = [
  { label: '8+ chars', test: (pw) => pw.length >= 8 },
  { label: 'Uppercase', test: (pw) => /[A-Z]/.test(pw) },
  { label: 'Lowercase', test: (pw) => /[a-z]/.test(pw) },
  { label: 'Number', test: (pw) => /[0-9]/.test(pw) },
  { label: 'Special char', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, registrationSuccess, message, isAuthenticated } = useSelector((state) => state.auth);
  const { executeCaptcha } = useReCaptcha();

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const [oauthError, setOauthError] = useState(null);

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
    return () => { dispatch(clearError()); dispatch(clearRegistrationSuccess()); };
  }, [dispatch]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(registerUser(formData));
  };

  // ── Confirmation screen after successful registration ──
  if (registrationSuccess) {
    return (
      <div className="h-screen w-screen max-h-screen overflow-hidden flex items-center justify-center p-4 bg-[#FFFBE9] dark:bg-[#000000] text-[#1F150C] dark:text-[#E1DCC9] font-inter">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#E3CAA5]/70 dark:bg-[#1F150C]/95 backdrop-blur-xl rounded-3xl border border-[#CEAB93] dark:border-[#412D15] shadow-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#AD8B73]/20 dark:bg-[#412D15] flex items-center justify-center mx-auto mb-6 border border-[#CEAB93] dark:border-[#412D15]">
            <Mail className="w-8 h-8 text-[#AD8B73] dark:text-[#E1DCC9]" />
          </div>
          <h1 className="text-2xl font-extrabold font-playfair text-[#1F150C] dark:text-[#E1DCC9] mb-2">Check Your Email</h1>
          <p className="text-[#412D15] dark:text-[#C4BA9D] mb-6 text-sm font-medium">{message}</p>
          <Link
            to="/login"
            className="w-full py-3.5 rounded-xl btn-primary-theme font-bold shadow-lg hover:shadow-xl transition-all inline-block text-sm"
          >
            Go to Sign In
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Main Non-Scrollable Split Screen ──
  return (
    <div className="min-h-screen w-screen md:h-screen md:max-h-screen md:overflow-hidden flex items-center justify-center p-3 sm:p-6 bg-[#FFFBE9] dark:bg-[#000000] text-[#1F150C] dark:text-[#E1DCC9] font-inter relative select-none overflow-y-auto">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_20%,rgba(173,139,115,0.12),transparent_50%)] pointer-events-none" />

      {/* Main Split Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl h-auto md:h-full md:max-h-[660px] sm:md:max-h-[700px] bg-[#FFFBE9] dark:bg-[#16120E] rounded-3xl border border-[#CEAB93]/60 dark:border-[#412D15] shadow-2xl overflow-hidden flex flex-col md:flex-row relative z-10"
      >
        {/* ── LEFT COLUMN: Sign Up Form Panel (55% Width) ── */}
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
          <div className="my-auto py-2 flex flex-col gap-3.5 mt-6 md:mt-0">
            <div className="mb-5">
              <h1 className="text-2xl sm:text-3xl font-extrabold font-playfair tracking-tight text-[#1F150C] dark:text-[#E1DCC9]">
                Sign up
              </h1>
              <p className="text-[#412D15] dark:text-[#C4BA9D] mt-1.5 text-xs sm:text-sm font-medium leading-relaxed">
                Create an account and verify your details to start preparing with OpenPrep AI. Have an account already?{' '}
                <Link to="/login" className="font-bold text-[#AD8B73] hover:underline dark:text-[#E1DCC9]">
                  Log in here
                </Link>
              </p>
            </div>

            {(error || oauthError) && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-red-700 dark:text-red-300 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error || oauthError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label htmlFor="register-name" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9] mb-1">
                  Full name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                  <input
                    id="register-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Provide your full name"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-[#1F150C] dark:text-[#E1DCC9] placeholder-[#8C6A53]/60 dark:placeholder-[#C4BA9D]/40 focus:outline-none focus:ring-2 focus:ring-[#AD8B73] dark:focus:ring-[#E1DCC9] text-xs sm:text-sm transition-all shadow-sm font-medium"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label htmlFor="register-email" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9] mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                  <input
                    id="register-email"
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
                <label htmlFor="register-password" className="block text-xs font-bold text-[#1F150C] dark:text-[#E1DCC9] mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C6A53] dark:text-[#C4BA9D]" />
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    minLength={8}
                    placeholder="Create a strong password"
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
                {/* Real-time criteria pills */}
                {formData.password.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {PASSWORD_CRITERIA.map((rule, idx) => {
                      const passed = rule.test(formData.password);
                      return (
                        <span
                          key={idx}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors ${
                            passed
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#AD8B73]/10 text-[#8C6A53] dark:text-[#C4BA9D]/60 border border-[#CEAB93]/30'
                          }`}
                        >
                          {passed && <CheckCircle className="w-2.5 h-2.5" />}
                          {rule.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submit CTA */}
              <motion.button
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl btn-primary-theme font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 text-sm mt-1"
              >
                {loading ? (
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Sign Up'
                )}
              </motion.button>
            </form>

            {/* Divider */}
            <div className="my-3 flex items-center justify-center space-x-2">
              <span className="h-px w-full bg-[#CEAB93]/50 dark:bg-[#412D15]"></span>
              <span className="text-[10px] text-[#8C6A53] dark:text-[#C4BA9D] font-bold tracking-wider uppercase">OR</span>
              <span className="h-px w-full bg-[#CEAB93]/50 dark:bg-[#412D15]"></span>
            </div>

            {/* Social OAuth Buttons */}
            <div className="space-y-3">
              <GoogleLoginButton />
              <GitHubLoginButton />
            </div>
          </div>

          {/* Legal Terms Footer */}
          <p className="text-center text-[11px] text-[#8C6A53] dark:text-[#C4BA9D]/80 font-medium">
            By signing up you agree to OpenPrep's{' '}
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
    </div>
  );
};

export default Register;
