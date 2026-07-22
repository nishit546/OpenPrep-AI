import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Award, 
  ArrowRight, 
  Sparkles, 
  Check,
  ChevronRight,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

const Landing = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Fade-in animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
      },
    },
  };

  const featureCards = [
    {
      icon: FileText,
      title: "PDF & Notes Parsing",
      description: "Upload study materials or lecture notes. Our AI digests content, summarizes core themes, and extracts crucial facts instantly.",
      color: "from-amber-500/20 to-yellow-600/20",
      border: "border-amber-500/30"
    },
    {
      icon: Award,
      title: "PYQ Intelligence",
      description: "Analyze Previous Year Questions (PYQs). Find recurring topics, map subject weightages, and identify exam patterns before stepping into the hall.",
      color: "from-indigo-500/20 to-purple-600/20",
      border: "border-indigo-500/30"
    },
    {
      icon: Sparkles,
      title: "AI Quiz Generator",
      description: "Test your retention. Dynamically generate mock assessments and practice exams customized to your notes or specific subjects.",
      color: "from-emerald-500/20 to-teal-600/20",
      border: "border-emerald-500/30"
    },
    {
      icon: Calendar,
      title: "Smart Study Planner",
      description: "Generate adaptive study schedules. Feed in your exam dates, target subjects, and daily hours to organize your preparation calendar.",
      color: "from-rose-500/20 to-orange-600/20",
      border: "border-rose-500/30"
    },
    {
      icon: TrendingUp,
      title: "Weakness Tracker",
      description: "Visualize knowledge gaps. Follow detailed analytical insights showing exactly where you struggle, adapting your practice quizzes dynamically.",
      color: "from-sky-500/20 to-blue-600/20",
      border: "border-sky-500/30"
    },
    {
      icon: BookOpen,
      title: "Spaced Repetition",
      description: "Never forget what you learn. Flashcards backed by the SuperMemo SM-2 algorithm schedule reviews just as you are about to forget them.",
      color: "from-bronze-500/20 to-amber-700/20",
      border: "border-amber-700/30"
    }
  ];

  return (
    <div className="min-h-screen font-inter bg-[#FDFBF7] dark:bg-dark-bg text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* ── HEADER / NAVIGATION ── */}
      <header className="sticky top-0 z-50 glass-panel border-b border-black/10 dark:border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-amber-800 to-amber-950 p-2.5 rounded-xl shadow-lg border border-amber-500/30 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-playfair text-xl font-bold tracking-tight text-amber-900 dark:text-white flex items-center gap-1.5">
              OpenPrep <span className="text-sm px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-md font-mono border border-amber-500/20">AI</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Light/Dark Toggle */}
          <ThemeToggle />

          {/* Dynamic Auth Button */}
          {isAuthenticated ? (
            <Link 
              to="/dashboard"
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-medium shadow-md transition-all duration-200 text-sm hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
            >
              Go to Dashboard <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link 
                to="/login"
                className="hidden sm:inline-block px-4 py-2 text-sm font-medium text-slate-600 hover:text-amber-800 dark:text-slate-300 dark:hover:text-amber-400 transition"
              >
                Sign In
              </Link>
              <Link 
                to="/register"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-medium shadow-md transition-all duration-200 text-sm hover:shadow-lg hover:-translate-y-0.5"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative overflow-hidden pt-20 pb-28 px-6 lg:px-8 border-b border-black/5 dark:border-white/5">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl -z-10 animate-pulse-glow" />
        <div className="absolute top-1/3 right-1/4 w-[30rem] h-[30rem] bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl -z-10 animate-pulse-glow" style={{ animationDelay: '2s' }} />

        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-6 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 text-sm font-medium flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> Exam Preparation Reimagined with AI
          </motion.div>

          <motion.h2 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight max-w-4xl text-slate-900 dark:text-white"
          >
            Study Smarter. Analyze PYQs.<br />
            <span className="text-amber-800 dark:text-amber-400">Master Your Exam Planner.</span>
          </motion.h2>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed font-inter"
          >
            Stop wasting hours mapping syllabus weightages. Upload notes, analyze previous year questions, track your weak subjects, and learn using adaptive spaced repetition flashcards.
          </motion.p>

          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-xs sm:max-w-none"
          >
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-700 to-amber-900 hover:from-amber-600 hover:to-amber-800 text-white font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              Open Your Free Study Journal <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById("features");
                element?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 font-semibold shadow-sm hover:shadow transition-all duration-200 text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              Explore Features
            </button>
          </motion.div>

          {/* ── STUNNING INTERACTIVE MOCKUP ── */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 50, damping: 20, delay: 0.4 }}
            className="mt-20 w-full max-w-5xl relative group"
          >
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-700 opacity-20 blur-xl group-hover:opacity-30 transition duration-1000" />
            <div className="relative rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden shadow-2xl bg-[#F5E6CA] dark:bg-dark-card p-2 md:p-4">
              
              {/* Fake Browser Chrome */}
              <div className="flex items-center justify-between border-b border-black/10 dark:border-white/10 pb-3 mb-4 px-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                <div className="text-xs bg-black/5 dark:bg-white/5 px-20 py-1 rounded-md text-slate-500 dark:text-slate-400 font-mono select-none">
                  openprep-ai.vercel.app/dashboard
                </div>
                <div className="w-10 h-3" />
              </div>

              {/* Mockup Inside Screen */}
              <div className="rounded-lg bg-[#fdfbf7] dark:bg-slate-900 border border-black/10 dark:border-white/5 p-4 md:p-8 min-h-[300px] text-left">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Left Column: Mock Syllabus Summary */}
                  <div className="md:col-span-2 space-y-6">
                    <div className="flex justify-between items-center border-b border-black/10 dark:border-white/10 pb-4">
                      <div>
                        <h4 className="font-playfair text-2xl font-bold text-amber-900 dark:text-white">Exam: Physics Semester II</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Target Date: May 12, 2026 • 24 Days Remaining</p>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20 px-2 py-1 rounded-md font-medium">92% Ready</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/25 relative overflow-hidden">
                        <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase tracking-wider">Top Priority Chapter</span>
                        <h5 className="font-playfair text-lg font-bold text-slate-800 dark:text-white mt-1">Electromagnetism</h5>
                        <p className="text-xs text-slate-500 mt-2">12 PYQ Matches • 32% Exam Weightage</p>
                      </div>
                      <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/25 relative overflow-hidden">
                        <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold uppercase tracking-wider">Next Study Session</span>
                        <h5 className="font-playfair text-lg font-bold text-slate-800 dark:text-white mt-1">Quantum Theory</h5>
                        <p className="text-xs text-slate-500 mt-2">Today at 4:00 PM • Spaced Repetition Due</p>
                      </div>
                    </div>

                    {/* Fake Chart / Report */}
                    <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.01]">
                      <div className="flex justify-between items-center mb-3">
                        <h6 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Weekly Score Trend</h6>
                        <span className="text-xs text-amber-700 dark:text-amber-400 font-semibold">+18.4% improvement</span>
                      </div>
                      <div className="flex gap-2 items-end h-28 pt-4">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-[60%] rounded" />
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-[72%] rounded" />
                        <div className="w-full bg-gradient-to-t from-amber-700 to-amber-950 h-[85%] rounded" />
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-[78%] rounded" />
                        <div className="w-full bg-gradient-to-t from-amber-700 to-amber-950 h-[92%] rounded" />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Fake Widgets */}
                  <div className="space-y-6">
                    {/* Active Streak */}
                    <div className="p-4 rounded-xl bg-amber-900/10 dark:bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-white text-lg font-bold">
                          🔥
                        </div>
                        <div>
                          <h6 className="text-sm font-bold">14 Day Streak</h6>
                          <p className="text-[10px] text-slate-500">120 XP earned today</p>
                        </div>
                      </div>
                      <Check className="h-5 w-5 text-amber-700 dark:text-amber-400" />
                    </div>

                    {/* Spaced Repetition Flashcard Review */}
                    <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-[#F5E6CA] text-slate-800 shadow-paper relative">
                      <div className="absolute top-3 right-3 text-[10px] text-amber-800 font-mono">Card 3 of 12</div>
                      <span className="text-[9px] font-bold text-amber-800 uppercase bg-amber-500/10 px-1.5 py-0.5 rounded">Physics</span>
                      <h5 className="font-playfair text-base font-bold mt-2">What is the Heisenberg Uncertainty Principle?</h5>
                      <p className="text-xs text-slate-500 mt-2 select-none italic">Click card to reveal answer...</p>
                    </div>

                    {/* Progress Checklist */}
                    <div className="p-4 rounded-xl border border-black/5 dark:border-white/5 space-y-3 bg-black/[0.01] dark:bg-white/[0.01]">
                      <h6 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today's Goals</h6>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-4 w-4 rounded border border-amber-500 bg-amber-500/20 flex items-center justify-center"><Check className="h-3 w-3 text-amber-800 dark:text-amber-400" /></div>
                        <span>Review Electromagnetism Notes</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div className="h-4 w-4 rounded border border-amber-500 bg-amber-500/20 flex items-center justify-center"><Check className="h-3 w-3 text-amber-800 dark:text-amber-400" /></div>
                        <span>Attempt 10-Question AI Quiz</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="h-4 w-4 rounded border border-slate-300 dark:border-slate-700" />
                        <span>Update Spaced Flashcards</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS SECTION ── */}
      <section className="py-12 bg-amber-500/[0.02] border-b border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <h3 className="font-playfair text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-white">98%</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Pass Rate Met</p>
            </div>
            <div>
              <h3 className="font-playfair text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-white">10k+</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Quizzes Generated</p>
            </div>
            <div>
              <h3 className="font-playfair text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-white">3x</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Study Efficiency</p>
            </div>
            <div>
              <h3 className="font-playfair text-3xl sm:text-4xl font-extrabold text-amber-900 dark:text-white">15k+</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">Hours of Planning Saved</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CORE FEATURES ── */}
      <section id="features" className="py-24 px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h3 className="font-playfair text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Everything You Need to Ace Your Exams
          </h3>
          <p className="mt-4 text-slate-600 dark:text-slate-300 font-inter">
            OpenPrep AI combines file intelligence, spacing algorithms, analytics, and auto-scheduling into one cohesive workspace.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {featureCards.map((feat, idx) => (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className={`p-6 rounded-2xl border ${feat.border} bg-white dark:bg-slate-800 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group`}
            >
              <div>
                <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feat.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feat.icon className="h-6 w-6 text-amber-800 dark:text-amber-400" />
                </div>
                <h4 className="font-playfair text-xl font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{feat.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 bg-amber-500/[0.01] border-t border-b border-black/5 dark:border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h3 className="font-playfair text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              The Path to Mastery
            </h3>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              Four easy steps to build adaptive habits and ensure long-term retention.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Timeline connection line */}
            <div className="absolute top-1/2 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-amber-500/10 via-amber-700/20 to-amber-900/10 -translate-y-1/2 hidden md:block" />

            <div className="relative text-center group">
              <div className="h-16 w-16 rounded-full bg-[#F5E6CA] border-2 border-amber-800 flex items-center justify-center mx-auto text-xl font-bold text-amber-900 shadow-md group-hover:scale-110 transition-transform">
                1
              </div>
              <h5 className="font-playfair text-lg font-bold mt-6 mb-2">Upload Files</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">Provide PDFs, lecture slides, notes or textbook chapters.</p>
            </div>

            <div className="relative text-center group">
              <div className="h-16 w-16 rounded-full bg-[#F5E6CA] border-2 border-amber-800 flex items-center justify-center mx-auto text-xl font-bold text-amber-900 shadow-md group-hover:scale-110 transition-transform">
                2
              </div>
              <h5 className="font-playfair text-lg font-bold mt-6 mb-2">Analyze PYQs</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">Map previous exam question trends against the syllabus.</p>
            </div>

            <div className="relative text-center group">
              <div className="h-16 w-16 rounded-full bg-[#F5E6CA] border-2 border-amber-800 flex items-center justify-center mx-auto text-xl font-bold text-amber-900 shadow-md group-hover:scale-110 transition-transform">
                3
              </div>
              <h5 className="font-playfair text-lg font-bold mt-6 mb-2">Practice Quizzes</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">Challenge your memory with adaptive, customized tests.</p>
            </div>

            <div className="relative text-center group">
              <div className="h-16 w-16 rounded-full bg-[#F5E6CA] border-2 border-amber-800 flex items-center justify-center mx-auto text-xl font-bold text-amber-900 shadow-md group-hover:scale-110 transition-transform">
                4
              </div>
              <h5 className="font-playfair text-lg font-bold mt-6 mb-2">Ace the Exam</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 px-4">Review using SM-2 spaced repetition to solidify memory.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FINAL CALL TO ACTION ── */}
      <section className="py-24 px-6 text-center max-w-4xl mx-auto">
        <div className="relative p-12 rounded-3xl overflow-hidden bg-leather border-stitched text-white shadow-leather">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-900/40 via-transparent to-transparent opacity-85 pointer-events-none" />
          <h3 className="font-playfair text-3xl sm:text-4xl font-extrabold text-gold-foil leading-tight">
            Stop Guessing. Start Mastering.
          </h3>
          <p className="mt-4 text-slate-200 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Create your account today to configure your personal study planners, generate quizzes, and unlock spaced flashcards.
          </p>
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/register')}
              className="px-8 py-4 rounded-xl bg-gold-foil hover:opacity-90 text-amber-950 font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2 cursor-pointer"
            >
              Sign Up Now <ArrowRight className="h-5 w-5 text-amber-950" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-black/5 dark:border-white/5 py-12 px-6 bg-slate-50 dark:bg-slate-950/20 text-slate-500 dark:text-slate-400 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 text-slate-700 dark:text-white font-playfair font-bold">
            <BookOpen className="h-5 w-5 text-amber-800 dark:text-amber-500" />
            <span>OpenPrep AI</span>
          </div>
          <p>© {new Date().getFullYear()} OpenPrep AI. Built with ❤️ for students worldwide.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-amber-800 dark:hover:text-amber-400">Login</Link>
            <Link to="/register" className="hover:text-amber-800 dark:hover:text-amber-400">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Landing;
