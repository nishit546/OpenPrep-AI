import Skeleton from '../components/dashboard/Skeleton';
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Play,
  FileText,
  Calendar,
  TrendingUp,
  Award,
  BookOpen,
  Target,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  LogOut,
  X,
  Download,
  Upload,
  Settings,
  MessageSquare,
  Shield,
  Globe,
} from 'lucide-react';
import API from '../services/api';
import { toDateOnlyString } from '../utils/dateUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as LineTooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';

import LeatherBoard from '../components/dashboard/LeatherBoard';
import VintagePaper from '../components/dashboard/VintagePaper';
import GoldTabButton from '../components/dashboard/GoldTabButton';
import PomodoroTimer from '../components/dashboard/PomodoroTimer';
import FlashcardWidget from '../components/dashboard/FlashcardWidget';
import BadgeGrid from '../components/dashboard/BadgeGrid';
import PinnedTasks from '../components/dashboard/PinnedTasks';
import CreateNoteModal from '../components/dashboard/CreateNoteModal';
import StudyPlanModal from '../components/dashboard/StudyPlanModal';
import PyqAnalysisModal from '../components/dashboard/PyqAnalysisModal';
import WeaknessDashboardWidget from '../components/dashboard/WeaknessDashboardWidget';
import SubjectMasteryWidget from '../components/dashboard/SubjectMasteryWidget';
import FocusEfficiencyWidget from '../components/dashboard/FocusEfficiencyWidget';
import LeaderboardWidget from '../components/dashboard/LeaderboardWidget';
import ExamCountdownWidget from '../components/dashboard/ExamCountdownWidget';
import TargetExamOverviewWidget from '../components/dashboard/TargetExamOverviewWidget';
import CompositeBundleModal from '../components/dashboard/CompositeBundleModal';
import SyllabusImportModal from '../components/dashboard/SyllabusImportModal';
import NotesWidget from '../components/dashboard/NotesWidget';
import ThemeToggle from '../components/ThemeToggle';
import BadgesList from '../components/BadgesList';
import SM2SettingsModal from '../components/dashboard/SM2SettingsModal';
import CommunityDecksModal from '../components/dashboard/CommunityDecksModal';

import {
  fetchDashboardStats,
  fetchSubjectBreakdown,
  fetchActivePlan,
  fetchDueFlashcards,
  reviewFlashcard,
} from '../store/slices/dashboardSlice';
import { logout } from '../store/slices/authSlice';

// ── Helpers ──

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const activityConfig = {
  quiz_attempt: { icon: Target, color: 'text-blue-900' },
  pyq_upload: { icon: FileText, color: 'text-green-900' },
  flashcard_review: { icon: BookOpen, color: 'text-purple-900' },
  study_plan_create: { icon: Calendar, color: 'text-yellow-700' },
  note_upload: { icon: FileText, color: 'text-gray-700' },
};

function getActivityConfig(type) {
  return activityConfig[type] || { icon: FileText, color: 'text-neutral-700' };
}

const achievements = [
  {
    id: 'first-quiz',
    label: 'First Steps',
    description: 'Complete your first quiz',
    icon: Target,
    earned: (stats) => (stats?.attemptsCount ?? 0) > 0,
  },
  {
    id: 'streak-3',
    label: 'On Fire',
    description: '3-day streak',
    icon: Flame,
    earned: (stats) => (stats?.streak ?? 0) >= 3,
  },
  {
    id: 'mastery-50',
    label: 'Halfway There',
    description: '50% syllabus mastery',
    icon: TrendingUp,
    earned: (stats) => (stats?.syllabusProgress ?? 0) >= 50,
  },
  {
    id: 'study-10h',
    label: 'Dedicated Scholar',
    description: '10+ study hours logged',
    icon: Clock,
    earned: (stats) => (stats?.totalStudyHours ?? 0) >= 10,
  },
];



// ── Stats Card Skeleton ──
const StatsCardSkeleton = () => (
  <VintagePaper className="border-t-4 border-t-neutral-400">
    <div className="flex justify-between items-start mb-2">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-5 w-5" />
    </div>
    <Skeleton className="h-9 w-20 mt-2" />
    <Skeleton className="h-4 w-32 mt-3" />
  </VintagePaper>
);

// ── Error Banner ──
const ErrorBanner = ({ message, onRetry }) => (
  <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-sm p-3 text-red-700 text-sm">
    <div className="flex items-center gap-2">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
    {onRetry && (
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-red-800 hover:text-red-900 font-semibold text-xs uppercase tracking-wider"
      >
        <RefreshCw className="w-3 h-3" /> Retry
      </button>
    )}
  </div>
);

// ── Empty State ──
const EmptyState = ({ icon: Icon = Lightbulb, message = 'No data yet' }) => (
  <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
    <Icon className="w-8 h-8 mb-2 opacity-40" />
    <p className="text-sm italic">{message}</p>
  </div>
);


// ── Main Component ──
const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth);
  const {
    stats,
    weeklyChartData,
    recentActivity,
    subjectBreakdown,
    activePlan,
    dueFlashcards,
    loadingStats,
    loadingSubjects,
    loadingPlan,
    loadingFlashcards,
    errorStats,
    errorSubjects,
    errorPlan,
    errorFlashcards,
  } = useSelector((state) => state.dashboard);

  useEffect(() => {
    const fetchAll = () => {
      dispatch(fetchDashboardStats());
      dispatch(fetchSubjectBreakdown());
      dispatch(fetchActivePlan());
      dispatch(fetchDueFlashcards());
    };

    fetchAll();

    window.addEventListener('focus', fetchAll);
    return () => window.removeEventListener('focus', fetchAll);
  }, [dispatch]);

  const handleRetry = (thunk) => () => dispatch(thunk());

  const handleLogout = useCallback(() => {
    dispatch(logout());
    navigate('/');
  }, [dispatch, navigate]);

  const [toggleError, setToggleError] = useState(null);
  const handleToggleTask = async (taskId) => {
    const planId = activePlan?.id;
    if (!planId) return;
    const task = todayTasks.find((t) => t.id === taskId);
    if (!task) return;
    const backendTaskId = task.meta?.taskId || task.id;
    setToggleError(null);
    try {
      await API.put(`/study-plans/${planId}/tasks/${backendTaskId}`, {
        completed: !task.completed,
        studyTimeMinutes: 25,
      });
      dispatch(fetchActivePlan());
      dispatch(fetchDashboardStats());
      dispatch(fetchSubjectBreakdown());
    } catch {
      setToggleError('Failed to update task. Please try again.');
    }
  };

  const handleBumpStudyTime = async (taskId, minutesToAdd = 30) => {
    const planId = activePlan?.id;
    if (!planId) return;
    const task = todayTasks.find((t) => t.id === taskId);
    if (!task) return;
    const backendTaskId = task.meta?.taskId || task.id;
    setToggleError(null);
    try {
      const currentDuration = task.duration || 60;
      await API.put(`/study-plans/${planId}/tasks/${backendTaskId}`, {
        duration: currentDuration + minutesToAdd,
      });
      dispatch(fetchActivePlan());
    } catch {
      setToggleError('Failed to bump study time. Please try again.');
    }
  };

  // ── Note & PYQ Modal State ──
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isStudyPlanOpen, setIsStudyPlanOpen] = useState(false);
  const [isPyqModalOpen, setIsPyqModalOpen] = useState(false);
  const [isBundleModalOpen, setIsBundleModalOpen] = useState(false);
  const [isSyllabusImportOpen, setIsSyllabusImportOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCommunityDecksOpen, setIsCommunityDecksOpen] = useState(false);
  const [syllabusPrefill, setSyllabusPrefill] = useState(null);
  const [comingSoon, setComingSoon] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleGoToStudyPlanFromImport = (prefill) => {
    if (prefill) setSyllabusPrefill(prefill);
    // Refresh dashboard caches so the new exam appears immediately in select
    dispatch(fetchDashboardStats());
    dispatch(fetchSubjectBreakdown());
    dispatch(fetchActivePlan());
    setIsStudyPlanOpen(true);
  };

  useEffect(() => {
    if (comingSoon) {
      const timer = setTimeout(() => setComingSoon(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [comingSoon]);

  const handleExportReport = async (format = 'pdf') => {
    setIsExporting(true);
    try {
      const response = await API.get(`/progress/export/${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'text/csv',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `progress_report_${new Date().toISOString().split('T')[0]}.${format}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setComingSoon('Failed to export progress report.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Derived Data ──
  const chartData =
    weeklyChartData.length > 0
      ? weeklyChartData.map((d) => ({ name: d.day, score: d.completion }))
      : [];

  const radarData = subjectBreakdown.map((s) => ({
    subject: s.subjectName,
    A: s.progressPercentage,
    fullMark: 100,
  }));

  const topicSubjects = subjectBreakdown.slice(0, 5).map((s) => ({
    name: s.subjectName,
    prog: s.progressPercentage,
  }));

  const todayTasks = (() => {
    if (!activePlan?.dailyGoals) return [];
    const today = toDateOnlyString(new Date());
    const todayGoal = activePlan.dailyGoals.find(
      (g) => g.date && toDateOnlyString(g.date) === today
    );
    const rawTasks = todayGoal?.tasks || activePlan.dailyGoals[0]?.tasks || [];
    return rawTasks.map((t, i) => {
      const text = t.title || t.description || t.topic?.name || 'Untitled task';
      const isBonus = !!(
        t.isBonus ||
        t.optional ||
        text.toLowerCase().includes('bonus') ||
        text.toLowerCase().includes('optional')
      );
      return {
        id: t.id || t._id || `task-${i}`,
        text,
        completed: t.completed || false,
        topic: t.topic || null,
        duration: t.duration || 60,
        meta: { taskId: t.id || t._id },
        isBonus,
      };
    });
  })();
  const regularTasks = todayTasks.filter((t) => !t.isBonus);
  const completedTasksCount = todayTasks.filter((t) => t.completed).length;
  const targetTasksCount = regularTasks.length;

  const tasksProgress =
    targetTasksCount > 0
      ? Math.round((completedTasksCount / targetTasksCount) * 100)
      : 0;

  const completedBonusCount = todayTasks.filter(
    (t) => t.isBonus && t.completed
  ).length;



  const firstDueCard = dueFlashcards.length > 0 ? dueFlashcards[0] : null;

  const handleReviewCard = useCallback(
    (quality) => {
      if (!firstDueCard) return;
      dispatch(reviewFlashcard({ cardId: firstDueCard.id, quality })).then(() => {
        if (dueFlashcards.length <= 1) {
          dispatch(fetchDueFlashcards());
        }
      });
    },
    [dispatch, firstDueCard, dueFlashcards.length]
  );

  // ── Streak display ──
  const streakDays = stats?.streak ?? 0;
  const totalStudyHours = stats?.totalStudyHours ?? 0;
  const syllabusProgress = stats?.syllabusProgress ?? 0;
  const attemptsCount = stats?.attemptsCount ?? 0;
  const strong = stats?.topicsBreakdown?.strong ?? 0;
  const medium = stats?.topicsBreakdown?.medium ?? 0;
  const totalTopics = stats?.topicsBreakdown?.total ?? 0;
  const streakFreezes = stats?.streakFreezes ?? 0;

  return (
    <LeatherBoard>
      {/* --- QUICK ACTIONS TABS --- */}
      <div className="absolute -left-4 top-24 flex-col gap-4 z-30 hidden md:flex">
        <GoldTabButton
          icon={Play}
          label="Start Quiz"
          delay={0.1}
          onClick={() => setComingSoon('Quiz feature coming soon!')}
        />
        <GoldTabButton
          icon={FileText}
          label="PYQ Intelligence"
          delay={0.2}
          onClick={() => navigate('/pyqs')}
        />
        <GoldTabButton
          icon={Calendar}
          label="Study Plan"
          delay={0.3}
          onClick={() => setIsStudyPlanOpen(true)}
        />
        <GoldTabButton
          icon={Upload}
          label="Import Syllabus"
          delay={0.35}
          onClick={() => setIsSyllabusImportOpen(true)}
        />
        <GoldTabButton
          icon={TrendingUp}
          label="Export Report"
          delay={0.4}
          onClick={() => handleExportReport('pdf')}
        />
        <GoldTabButton
          icon={MessageSquare}
          label="Study Room"
          delay={0.45}
          onClick={() => navigate('/study-group')}
        />
        <GoldTabButton
          icon={Globe}
          label="Community Decks"
          delay={0.48}
          onClick={() => setIsCommunityDecksOpen(true)}
        />
        <button
          onClick={() => {
            setIsNoteModalOpen(true);
          }}
          className="bg-neutral-800 text-yellow-500 border border-yellow-700/50 hover:bg-neutral-700 p-2 rounded-r-lg shadow-lg flex items-center justify-center relative group"
        >
          <FileText className="w-5 h-5" />
          <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-800 text-yellow-500 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity">
            Create Note
          </div>
        </button>
      </div>

      <div className="pl-4 md:pl-16 pr-4 lg:pr-8 py-8 space-y-12">
        {/* --- HERO SECTION --- */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b border-black/20 pb-8 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex-1"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gold-foil mb-2 font-playfair tracking-tight">
              Welcome back{user?.name ? `, ${user.name}` : ', Scholar'}.
            </h1>
            <p className="text-amber-100/70 text-lg italic font-playfair">
              &ldquo;The roots of education are bitter, but the fruit is sweet.&rdquo; – Aristotle
            </p>

            {/* --- EXAM COUNTDOWN WIDGET --- */}
            {activePlan?.exam?.date && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="mt-5"
              >
                <ExamCountdownWidget
                  examDate={activePlan.exam.date}
                  examName={activePlan.exam.name}
                />
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center space-x-6 mt-2 md:mt-0 shrink-0"
          >
            <div className="relative group z-50">
              <button className="bg-neutral-800 text-gold-foil border border-yellow-700/50 hover:bg-neutral-700 px-4 py-2 rounded-sm shadow-[0_4px_15px_rgba(0,0,0,0.5)] flex items-center gap-2 font-playfair font-bold text-sm tracking-wide">
                <Download className="w-4 h-4" /> Export Analytics
              </button>
              <div className="absolute right-0 top-full mt-2 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <button
                  onClick={() => handleExportReport('csv')}
                  className="w-full text-left block px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                >
                  CSV
                </button>

                <button
                  onClick={() => handleExportReport('pdf')}
                  className="w-full text-left block px-4 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
                >
                  PDF
                </button>


              </div>
            </div>

            <ThemeToggle className="mr-2" />
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="bg-neutral-800 text-yellow-500 border border-yellow-700/50 hover:bg-neutral-700 p-2.5 rounded-sm shadow-[0_4px_10px_rgba(0,0,0,0.4)] flex items-center justify-center relative group"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
              <div className="absolute top-full mt-2 px-2 py-1 bg-neutral-800 text-yellow-500 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
                SM-2 Settings
              </div>
            </button>
            <div className="flex flex-col items-center">
              <div className="relative">
                <Flame
                  className="w-12 h-12 text-orange-500 animate-pulse-glow"
                  fill="currentColor"
                />
                <div className="absolute inset-0 blur-md bg-orange-500/30 rounded-full" />
              </div>
              <span className="text-gold-foil font-bold text-2xl">{streakDays} Day</span>
              <span className="text-amber-200/50 text-xs uppercase tracking-widest">Streak</span>
            </div>

            {streakFreezes > 0 && (
              <div className="flex flex-col items-center ml-2">
                <div className="relative group cursor-pointer" title="Streak Freeze Shield">
                  <Shield
                    className="w-10 h-10 text-cyan-400 animate-pulse"
                    fill="currentColor"
                  />
                  <div className="absolute inset-0 blur-md bg-cyan-400/30 rounded-full" />
                </div>
                <span className="text-cyan-300 font-bold text-xl">{streakFreezes}</span>
                <span className="text-cyan-200/50 text-[10px] uppercase tracking-widest">Freezes</span>
              </div>
            )}

            <button
              onClick={() => navigate('/settings')}
              className="bg-neutral-800 text-amber-100/80 px-4 py-3 rounded-sm border border-amber-700/40 shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:bg-neutral-700 hover:text-yellow-400 transition-all flex items-center gap-2 group"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
              <span className="font-playfair font-bold text-sm tracking-wide hidden sm:inline">
                Settings
              </span>
            </button>

            <button
              onClick={handleLogout}
              className="bg-gradient-to-br from-red-700 to-red-900 text-red-50 px-4 py-3 rounded-sm border border-red-500/50 shadow-[0_4px_15px_rgba(0,0,0,0.5)] hover:shadow-[0_6px_20px_rgba(220,50,50,0.3)] transition-all flex items-center gap-2 group"
              aria-label="Log out"
            >
              <LogOut className="w-5 h-5 group-hover:text-white" />
              <span className="font-playfair font-bold text-sm tracking-wide group-hover:text-white hidden sm:inline">
                Logout
              </span>
            </button>
          </motion.div>
        </div>

        {/* --- TARGET EXAM COMPOSITE BUNDLE OVERVIEW --- */}
        <TargetExamOverviewWidget
          onOpenBundleModal={() => setIsBundleModalOpen(true)}
          onGenerateStudyPlan={() => setIsStudyPlanOpen(true)}
        />

        {/* --- STATISTICS OVERVIEW --- */}
        {errorStats && !loadingStats ? (
          <ErrorBanner message={errorStats} onRetry={handleRetry(fetchDashboardStats)} />
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loadingStats ? (
            <>
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
              <StatsCardSkeleton />
            </>
          ) : (
            <>
              <VintagePaper delay={0.2} className="border-t-4 border-t-red-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-neutral-800 dark:text-neutral-100 font-playfair font-bold text-xl">
                    Total Solved
                  </h3>
                  <Target className="text-neutral-600 dark:text-neutral-400 w-5 h-5" />
                </div>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white font-playfair">
                  {attemptsCount.toLocaleString()}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 italic border-t border-neutral-300 dark:border-neutral-600 pt-2">
                  Quiz attempts
                </p>
              </VintagePaper>

              <VintagePaper delay={0.3} className="border-t-4 border-t-green-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-neutral-800 dark:text-neutral-100 font-playfair font-bold text-xl">
                    Mastery
                  </h3>
                  <CheckCircle className="text-neutral-600 dark:text-neutral-400 w-5 h-5" />
                </div>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white font-playfair">
                  {syllabusProgress}%
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 italic border-t border-neutral-300 dark:border-neutral-600 pt-2">
                  Syllabus completion
                </p>
              </VintagePaper>

              <VintagePaper delay={0.4} className="border-t-4 border-t-blue-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-neutral-800 dark:text-neutral-100 font-playfair font-bold text-xl">
                    Study Hours
                  </h3>
                  <Clock className="text-neutral-600 dark:text-neutral-400 w-5 h-5" />
                </div>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white font-playfair">
                  {totalStudyHours.toFixed(1)}h
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 italic border-t border-neutral-300 dark:border-neutral-600 pt-2">
                  Total study time
                </p>
              </VintagePaper>

              <VintagePaper delay={0.5} className="border-t-4 border-t-purple-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-neutral-800 dark:text-neutral-100 font-playfair font-bold text-xl">
                    Topics Done
                  </h3>
                  <BookOpen className="text-neutral-600 dark:text-neutral-400 w-5 h-5" />
                </div>
                <p className="text-4xl font-bold text-neutral-900 dark:text-white font-playfair">
                  {strong + medium}/{totalTopics}
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-2 italic border-t border-neutral-300 dark:border-neutral-600 pt-2">
                  {totalTopics > 0
                    ? `${Math.round(((strong + medium) / totalTopics) * 100)}% Course completion`
                    : 'No topics yet'}
                </p>
              </VintagePaper>
            </>
          )}
        </div>

        {/* --- ANALYTICS SECTION (WOODEN DESK) --- */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-bold font-playfair text-amber-100 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-yellow-500" /> Performance Analytics
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExportReport('csv')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-yellow-400 border border-yellow-700/50 rounded text-xs font-semibold flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                title="Export report as CSV"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
              <button
                onClick={() => handleExportReport('pdf')}
                disabled={isExporting}
                className="px-3 py-1.5 bg-gradient-to-r from-yellow-700 to-yellow-600 hover:from-yellow-600 hover:to-yellow-500 text-yellow-50 rounded text-xs font-semibold flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
                title="Export report as PDF"
              >
                <Download className="w-3.5 h-3.5" /> Export PDF
              </button>
            </div>
          </div>

          <div className="bg-wood-desk rounded-lg shadow-inner border border-black/50 p-6 relative overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="absolute inset-0 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] pointer-events-none" />

            {/* Line Chart — Weekly Performance */}
            <VintagePaper
              animate={false}
              className="w-full h-full p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">
                Weekly Performance
              </h2>
              <div className="h-64 w-full" style={{ minHeight: '250px', minWidth: '100%' }}>
                {loadingStats ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-full h-48" />
                  </div>
                ) : errorStats ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm">Could not load chart</p>
                  </div>
                ) : chartData.length === 0 ? (
                  <EmptyState message="No weekly data yet — start studying to see your progress!" />
                ) : (
                  <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d4d4d4" />
                      <XAxis dataKey="name" stroke="#525252" tick={{ fontFamily: 'Inter' }} />
                      <YAxis stroke="#525252" tick={{ fontFamily: 'Inter' }} domain={[0, 100]} />
                      <LineTooltip
                        contentStyle={{
                          backgroundColor: '#F5E6CA',
                          border: '1px solid #8B4513',
                          borderRadius: '4px',
                        }}
                        itemStyle={{ color: '#3E2723', fontWeight: 'bold' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#8B4513"
                        strokeWidth={3}
                        dot={{ fill: '#8B4513', r: 5 }}
                        activeDot={{ r: 8, fill: '#D4AF37' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </VintagePaper>

            {/* Radar Chart — Subject Mastery */}
            <VintagePaper
              animate={false}
              className="w-full h-full p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">
                Subject Mastery
              </h2>
              <div className="h-64 w-full" style={{ minHeight: '250px', minWidth: '100%' }}>
                {loadingSubjects ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="w-full h-48" />
                  </div>
                ) : errorSubjects ? (
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    <p className="text-sm">Could not load subjects</p>
                  </div>
                ) : radarData.length === 0 ? (
                  <EmptyState message="Add subjects to see your mastery breakdown" />
                ) : (
                  <ResponsiveContainer width="99%" height="100%" minHeight={250}>
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#d4d4d4" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{
                          fontFamily: 'Inter',
                          fill: '#525252',
                          fontSize: 12,
                          fontWeight: 'bold',
                        }}
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar
                        name="Mastery"
                        dataKey="A"
                        stroke="#8B4513"
                        strokeWidth={2}
                        fill="#D4AF37"
                        fillOpacity={0.6}
                      />
                      <LineTooltip
                        contentStyle={{
                          backgroundColor: '#F5E6CA',
                          border: '1px solid #8B4513',
                          borderRadius: '4px',
                        }}
                        itemStyle={{ color: '#3E2723', fontWeight: 'bold' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </VintagePaper>
          </div>
        </div>

        {/* --- NEW WIDGETS ROW --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-center py-4">
          <div className="flex justify-center">
            <PomodoroTimer />
          </div>
          <div>
            <FlashcardWidget
              flashcard={firstDueCard}
              loading={loadingFlashcards}
              error={errorFlashcards}
              totalDue={dueFlashcards.length}
              onRetry={handleRetry(fetchDueFlashcards)}
              onReview={handleReviewCard}
            />
          </div>

          {/* BADGES / GAMIFICATION */}
          <div className="md:col-span-2 mt-6">
            <BadgeGrid />
          </div>

          <div className="flex justify-center">
            <PinnedTasks
              tasks={todayTasks}
              progress={tasksProgress}
              completedBonus={completedBonusCount}
              loading={loadingPlan}
              error={errorPlan}
              onRetry={handleRetry(fetchActivePlan)}
              onToggle={handleToggleTask}
              onBumpTime={handleBumpStudyTime}
            />
          </div>
          {toggleError && (
            <div className="flex justify-center mt-2">
              <ErrorBanner message={toggleError} />
            </div>
          )}
        </div>

        {/* --- LEADERBOARD & AI WEAKNESS DETECTION WIDGETS --- */}
        <div className="my-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <LeaderboardWidget />
          <WeaknessDashboardWidget />
        </div>

        {/* --- SUBJECT & CHAPTER MASTERY BADGES --- */}
        <div className="my-6">
          <SubjectMasteryWidget />
        </div>

        <div className="my-6">
          <FocusEfficiencyWidget />
        </div>
        <div className="my-6">
          <BadgesList achievements={user?.achievements || []} />
        </div>

        {/* --- AI REVISION SUMMARIES + AUDIO READER --- */}
        <div className="my-6">
          <NotesWidget limit={5} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* --- SUBJECT PROGRESS --- */}
          <VintagePaper delay={0.6} className="lg:col-span-1 shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2">
              Subject Progress
            </h2>

            {loadingSubjects ? (
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-36 mb-1" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : errorSubjects ? (
              <ErrorBanner message={errorSubjects} onRetry={handleRetry(fetchSubjectBreakdown)} />
            ) : topicSubjects.length === 0 ? (
              <EmptyState message="No subjects configured yet" />
            ) : (
              <div className="space-y-6">
                {topicSubjects.map((topic, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm font-semibold text-neutral-800 mb-1">
                      <span>{topic.name}</span>
                      <span>{topic.prog}%</span>
                    </div>
                    <div className="h-4 w-full bg-neutral-300 rounded-sm border border-neutral-400 relative overflow-hidden shadow-inner">
                      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMGgwLjV2NWgtMC41eiIgZmlsbD0iIzlhM2FmIi8+PC9zdmc+')] opacity-50" />
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${topic.prog}%` }}
                        transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-blue-900 to-indigo-800 relative z-10"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </VintagePaper>

          {/* --- RECENT ACTIVITY TIMELINE --- */}
          <div className="lg:col-span-2 mt-8">
            <h2 className="text-3xl font-playfair font-bold text-neutral-800 dark:text-neutral-100 mb-6 flex items-center gap-3">
              <Clock className="w-8 h-8 text-neutral-500 dark:text-neutral-400" /> Recent Activity
            </h2>
            <VintagePaper delay={0.4}>
              {loadingStats ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-48 mb-1" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : errorStats ? (
                <ErrorBanner message={errorStats} onRetry={handleRetry(fetchDashboardStats)} />
              ) : recentActivity.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  message="No activity yet — start your learning journey!"
                />
              ) : (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-yellow-700/50 before:to-transparent">
                  {recentActivity.slice(0, 6).map((item, i) => {
                    const config = getActivityConfig(item.activityType);
                    const Icon = config.icon;
                    return (
                      <motion.div
                        key={item.id || i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.2 }}
                        className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                      >
                        <div
                          className={`mt-1 bg-white dark:bg-slate-800 border border-neutral-300 dark:border-slate-600 p-2 rounded-full shadow-sm ${config.color} group-hover:scale-110 transition-transform`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="ml-4 flex-1 border-b border-neutral-200 dark:border-slate-700 pb-4">
                          <p className="text-neutral-800 dark:text-neutral-200 font-inter font-medium leading-tight">
                            {item.description}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 font-inter tracking-wide uppercase">
                            {timeAgo(item.createdAt || item.timestamp)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </VintagePaper>
          </div>
        </div>

        {/* --- ACHIEVEMENT SHOWCASE & CONSISTENCY --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <VintagePaper delay={0.9}>
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 mb-6 border-b border-neutral-400 pb-2 flex items-center">
              <Award className="mr-2" /> Trophy Cabinet
            </h2>
            <div className="flex justify-around items-center h-full pb-8">
              {achievements.map((badge) => {
                const earned = badge.earned(stats);
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className="flex flex-col items-center group cursor-pointer"
                    title={badge.description}
                  >
                    <div
                      className={`w-20 h-20 rounded-full p-1 shadow-[0_4px_10px_rgba(0,0,0,0.3)] group-hover:scale-110 transition-transform relative ${
                        earned
                          ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700'
                          : 'bg-gradient-to-br from-neutral-300 via-neutral-400 to-neutral-500 opacity-50'
                      }`}
                    >
                      <div
                        className={`w-full h-full rounded-full border-2 flex items-center justify-center ${
                          earned
                            ? 'border-yellow-200/50 bg-leather'
                            : 'border-neutral-400/50 bg-neutral-200'
                        }`}
                      >
                        <Icon
                          className={`w-10 h-10 ${earned ? 'text-gold-foil' : 'text-neutral-400'}`}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-sm font-bold mt-3 text-center ${earned ? 'text-neutral-800' : 'text-neutral-400'}`}
                    >
                      {badge.label}
                    </span>
                    <span
                      className={`text-xs ${earned ? 'text-green-700' : 'text-neutral-400 italic'}`}
                    >
                      {earned ? 'Earned' : 'Locked'}
                    </span>
                  </div>
                );
              })}
            </div>
          </VintagePaper>

          <VintagePaper delay={1.0}>
            <h2 className="text-2xl font-bold font-playfair text-neutral-900 dark:text-neutral-100 mb-4 border-b border-neutral-400 dark:border-slate-700 pb-2 flex items-center">
              <Calendar className="mr-2" /> Consistency
            </h2>
            <div className="grid grid-cols-10 gap-1 p-4 bg-neutral-200/50 dark:bg-slate-800/50 rounded-sm border border-neutral-300 dark:border-slate-700 shadow-inner">
              {weeklyChartData.length > 0
                ? weeklyChartData.map((d, i) => {
                    const intensity = Math.min(3, Math.floor((d.completion || 0) / 33));
                    const colors = [
                      'bg-neutral-300 dark:bg-slate-700',
                      'bg-yellow-700/40',
                      'bg-yellow-700/70',
                      'bg-yellow-800',
                    ];
                    return (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.2 }}
                        className={`w-full aspect-square rounded-sm ${colors[intensity]}`}
                        title={`${d.day}: ${d.completion}%`}
                      />
                    );
                  })
                : Array.from({ length: 30 }, (_, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.2 }}
                      className="w-full aspect-square rounded-sm bg-neutral-300 dark:bg-slate-700"
                    />
                  ))}
            </div>
            <p className="text-xs text-center text-neutral-600 dark:text-neutral-400 mt-2 italic">
              {weeklyChartData.length > 0 ? 'Recent activity' : 'Last 30 Days'}
            </p>
          </VintagePaper>
        </div>
      </div>
      {/* --- CREATE NOTE MODAL --- */}
      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onNoteCreated={() => setIsNoteModalOpen(false)}
      />

      {/* --- STUDY PLAN MODAL --- */}
      <StudyPlanModal
        isOpen={isStudyPlanOpen}
        onClose={() => {
          setSyllabusPrefill(null);
          setIsStudyPlanOpen(false);
        }}
        activePlan={activePlan}
        syllabusPrefill={syllabusPrefill}
        onPlanUpdate={() => dispatch(fetchActivePlan())}
        onPlanCreated={() => dispatch(fetchActivePlan())}
        onBumpTime={handleBumpStudyTime}
      />

      {/* --- PYQ ANALYSIS MODAL --- */}
      <PyqAnalysisModal
        isOpen={isPyqModalOpen}
        onClose={() => setIsPyqModalOpen(false)}
        onAnalysisComplete={() => {
          setIsPyqModalOpen(false);
          dispatch(fetchDashboardStats());
          dispatch(fetchSubjectBreakdown());
        }}
      />

      {/* --- COMPOSITE BUNDLE MODAL --- */}
      <CompositeBundleModal
        isOpen={isBundleModalOpen}
        onClose={() => setIsBundleModalOpen(false)}
        onSuccess={() => {
          setIsBundleModalOpen(false);
          dispatch(fetchDashboardStats());
          dispatch(fetchSubjectBreakdown());
        }}
      />

      {/* --- SYLLABUS IMPORT MODAL --- */}
      <SyllabusImportModal
        isOpen={isSyllabusImportOpen}
        onClose={() => setIsSyllabusImportOpen(false)}
        onSuccess={() => {
          dispatch(fetchDashboardStats());
          dispatch(fetchSubjectBreakdown());
        }}
        onGoToStudyPlan={handleGoToStudyPlanFromImport}
      />

      <CommunityDecksModal
        isOpen={isCommunityDecksOpen}
        onClose={() => setIsCommunityDecksOpen(false)}
        onCloneSuccess={() => {
          dispatch(fetchDashboardStats());
          dispatch(fetchSubjectBreakdown());
          dispatch(fetchDueFlashcards());
        }}
      />

      {/* --- SM-2 SETTINGS MODAL --- */}
      <SM2SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* --- COMING SOON TOAST --- */}

      <AnimatePresence>
        {comingSoon && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-yellow-50 px-6 py-3 rounded-sm border border-yellow-700/50 shadow-[0_4px_20px_rgba(0,0,0,0.6)] flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0" />
            <span className="font-inter font-medium">{comingSoon}</span>
            <button
              onClick={() => setComingSoon(null)}
              className="ml-2 text-yellow-400 hover:text-yellow-200"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </LeatherBoard>
  );
};

export default Dashboard;
