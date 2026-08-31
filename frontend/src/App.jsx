import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loadUser, checkTokenFreshness, setAiQuotaExceededUntil, setAiQuotaErrorMsg } from './store/slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import CustomCursor from './components/CustomCursor';
import ScrollToTop from './components/ScrollToTop';
import MobileNavDrawer from './components/MobileNavDrawer';
import PageSkeleton from './components/PageSkeleton';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import SessionRestoreModal from './components/SessionRestoreModal';
import API from './services/api';
import QuotaExceededModal from './components/dashboard/QuotaExceededModal';
import GlobalSearchModal from './components/search/GlobalSearchModal';
import OfflineBanner from './components/OfflineBanner';
import OfflineStatusBanner from './components/common/OfflineStatusBanner';
import PwaInstallPrompt from './components/common/PwaInstallPrompt';
import OfflineIndicator from './components/common/OfflineIndicator';
import Walkthrough from './components/tutorial/Walkthrough';
import MobileBottomNav from './components/common/MobileBottomNav';
import PomodoroWidget from './components/timer/PomodoroWidget';
import MicroReviewModal from './components/widgets/MicroReviewModal';
import { startMicroScheduler, showMicroNotification } from './services/microScheduleWorker';
import ColorblindFilterSVG from './components/common/ColorblindFilterSVG';
import './App.css';



const Landing = lazy(() => import('./pages/Landing'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PacingCoachDashboard = lazy(() => import('./pages/PacingCoachDashboard'));
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const BattleArena = lazy(() => import('./pages/BattleArena'));
const NotFound = lazy(() => import('./pages/NotFound'));
const FlashcardReview = lazy(() => import('./pages/FlashcardReview'));
const PyqDashboard = lazy(() => import('./pages/PyqDashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const CommunityDecks = lazy(() => import('./pages/CommunityDecks'));
const PublicShare = lazy(() => import('./pages/PublicShare'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const StudyGroupChat = lazy(() => import('./pages/StudyGroupChat'));
const StudySquadDashboard = lazy(() => import('./pages/StudySquadDashboard'));
const CollabNote = lazy(() => import('./pages/CollabNote'));
const RevisionScheduler = lazy(() => import('./pages/RevisionScheduler'));
const LiveQuizSession = lazy(() => import('./pages/LiveQuizSession'));
const StudyAnalytics = lazy(() => import('./pages/StudyAnalytics'));
const FormulaScratchpad = lazy(() => import('./pages/FormulaScratchpad'));
const InterviewRoomPage = lazy(() => import('./pages/InterviewRoomPage'));
const StreakDashboard = lazy(() => import('./pages/StreakDashboard'));
const MedicalCaseSimulator = lazy(() => import('./pages/MedicalCaseSimulator'));
const DrugInteractionChecker = lazy(() => import('./pages/DrugInteractionChecker'));
const ExamCountdownPlanner = lazy(() => import('./pages/ExamCountdownPlanner'));
const ClinicalNotesSummarizer = lazy(() => import('./pages/ClinicalNotesSummarizer'));
const PatientSimulator = lazy(() => import('./pages/PatientSimulator'));
const AiAssistant = lazy(() => import('./pages/AiAssistant'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const PYQAnalytics = lazy(() => import('./pages/PYQAnalytics'));
const PYQIntelligenceDashboard = lazy(() => import('./pages/PYQIntelligenceDashboard'));
const QuizSession = lazy(() => import('./pages/QuizSession'));
const MindMapViewer = lazy(() => import('./pages/MindMapViewer'));
const WeaknessDetectionDashboard = lazy(() => import('./pages/WeaknessDetectionDashboard'));
const MistakeNotebook = lazy(() => import('./pages/MistakeNotebook'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const StudyGoals = lazy(() => import('./pages/StudyGoals'));
const StudyTimeBudgetDashboard = lazy(() => import('./pages/StudyTimeBudgetDashboard'));
const VivaSimulator = lazy(() => import('./pages/VivaSimulator'));
const AttemptHistoryDashboard = lazy(() => import('./pages/AttemptHistoryDashboard'));
const CollaborativeNoteView = lazy(() => import('./pages/CollaborativeNoteView'));
const SquadsPage = lazy(() => import('./pages/SquadsPage'));
const BountyBoardPage = lazy(() => import('./pages/BountyBoardPage'));
const CodeSandboxPage = lazy(() => import('./pages/code/CodeSandboxPage'));
const RewardsShop = lazy(() => import('./components/gamification/RewardsShop'));
const OcrSolverPage = lazy(() => import('./pages/ocr/OcrSolverPage'));
const MarkdownNotesEditor = lazy(() => import('./components/notes/MarkdownNotesEditor'));
const KnowledgeGraphView = lazy(() => import('./components/notes/KnowledgeGraphView'));
const PublicVerifyCertificate = lazy(() => import('./pages/PublicVerifyCertificate'));


function App() {

  const dispatch = useDispatch();
  const { sessionExpired, aiQuotaExceededUntil, isAuthenticated, user } = useSelector((state) => state.auth);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [savedSessionPrompt, setSavedSessionPrompt] = useState(null);
  const [isMicroModalOpen, setIsMicroModalOpen] = useState(false);

  // Setup micro-learning trigger and global window handler
  useEffect(() => {
    window.openMicroReviewModal = () => setIsMicroModalOpen(true);

    if (isAuthenticated) {
      const stopScheduler = startMicroScheduler(() => {
        setIsMicroModalOpen(true);
        showMicroNotification('OpenPrep AI: Spaced Recall Time!', {
          body: 'Take 30 seconds for a quick micro-quiz question to keep your study streak alive.',
        });
      });
      return () => {
        stopScheduler();
        delete window.openMicroReviewModal;
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (localStorage.getItem('token')) {
      dispatch(loadUser());
    }
  }, [dispatch]);

  // Check for unsaved session after login
  useEffect(() => {
    if (isAuthenticated && user) {
      API.get('/session/saved')
        .then((res) => {
          if (res.data?.success && res.data?.hasSavedSession && res.data?.session) {
            setSavedSessionPrompt(res.data.session);
          }
        })
        .catch(() => {});
    } else {
      setSavedSessionPrompt(null);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    const checkQuota = () => {
      const resetTimeStr = localStorage.getItem('ai_quota_reset_time');
      if (resetTimeStr) {
        const resetTime = parseInt(resetTimeStr, 10);
        if (Date.now() < resetTime) {
          dispatch(setAiQuotaExceededUntil(resetTime));
          const msg = localStorage.getItem('ai_quota_error_msg');
          dispatch(setAiQuotaErrorMsg(msg));
        } else {
          localStorage.removeItem('ai_quota_reset_time');
          localStorage.removeItem('ai_quota_error_msg');
          dispatch(setAiQuotaExceededUntil(null));
          dispatch(setAiQuotaErrorMsg(null));
        }
      }
    };

    checkQuota();
    const interval = setInterval(checkQuota, 1000);

    const handleQuotaExceeded = (e) => {
      const { retryInSeconds, message } = e.detail;
      const resetTime = Date.now() + retryInSeconds * 1000;
      localStorage.setItem('ai_quota_reset_time', String(resetTime));
      localStorage.setItem('ai_quota_error_msg', message);
      dispatch(setAiQuotaExceededUntil(resetTime));
      dispatch(setAiQuotaErrorMsg(message));
    };

    window.addEventListener('quota-exceeded', handleQuotaExceeded);

    return () => {
      clearInterval(interval);
      window.removeEventListener('quota-exceeded', handleQuotaExceeded);
    };
  }, [dispatch]);

  // Check token freshness when the user returns to a background tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        dispatch(checkTokenFreshness());
      }
    };
    const handleFocus = () => {
      dispatch(checkTokenFreshness());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [dispatch]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[99999] focus:px-4 focus:py-2 focus:bg-amber-700 focus:text-white focus:rounded-lg focus:shadow-2xl focus:outline-none focus:ring-2 focus:ring-amber-400 font-semibold text-xs"
      >
        Skip to main content
      </a>
      {aiQuotaExceededUntil && (
        <div className="bg-red-900 border-b border-red-700 text-red-50 text-center py-2 text-xs font-semibold select-none flex items-center justify-center gap-2 relative z-[9998]">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>AI features are temporarily locked due to rate limit/quota limits.</span>
        </div>
      )}
      <OfflineBanner />
      <PwaInstallPrompt />
      <OfflineIndicator />
      <CustomCursor />
      <ScrollToTop />
      <MobileNavDrawer />
      <QuotaExceededModal />
      <SessionTimeoutModal />
      <Walkthrough />
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {localStorage.getItem('token') && <PomodoroWidget />}
      <MicroReviewModal isOpen={isMicroModalOpen} onClose={() => setIsMicroModalOpen(false)} />
      <main id="main-content" tabIndex="-1" role="main" className="focus:outline-none min-h-screen">
        <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/pacing-coach" element={<ProtectedRoute><PacingCoachDashboard /></ProtectedRoute>} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/share/:token" element={<PublicShare />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify/certificate/:certId" element={<PublicVerifyCertificate />} />
          <Route path="/certificates/verify/:certId" element={<PublicVerifyCertificate />} />


          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flashcards/review"
            element={
              <ProtectedRoute>
                <FlashcardReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flashcards"
            element={
              <ProtectedRoute>
                <Flashcards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/decks"
            element={
              <ProtectedRoute>
                <CommunityDecks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle"
            element={
              <ProtectedRoute>
                <BattleArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/battle/join/:roomId"
            element={
              <ProtectedRoute>
                <BattleArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/study-group"
            element={
              <ProtectedRoute>
                <StudyGroupChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/squads"
            element={
              <ProtectedRoute>
                <SquadsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/squads/:id"
            element={
              <ProtectedRoute>
                <StudySquadDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collab-note/:id"
            element={
              <ProtectedRoute>
                <CollabNote />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/editor"
            element={
              <ProtectedRoute>
                <MarkdownNotesEditor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/graph"
            element={
              <ProtectedRoute>
                <KnowledgeGraphView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/code/sandbox"
            element={
              <ProtectedRoute>
                <CodeSandboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/code/room/:inviteCode"
            element={
              <ProtectedRoute>
                <CodeSandboxPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rewards-shop"
            element={
              <ProtectedRoute>
                <RewardsShop />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ocr/solver"
            element={
              <ProtectedRoute>
                <OcrSolverPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-exam/:examId"
            element={
              <ProtectedRoute>
                <MockExamArena />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-assistant"
            element={
              <ProtectedRoute>
                <AiAssistant />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pyqs"
            element={
              <ProtectedRoute>
                <PyqDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pyq-analytics"
            element={
              <ProtectedRoute>
                <PYQAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pyq-intelligence"
            element={
              <ProtectedRoute>
                <PYQIntelligenceDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/mistake-notebook"
            element={
              <ProtectedRoute>
                <MistakeNotebook />
              </ProtectedRoute>
            }
          />

          <Route
            path="/study-planner"
            element={
              <ProtectedRoute>
                <StudyPlanner />
              </ProtectedRoute>
            }
          />

          <Route
            path="/revision-scheduler"
            element={
              <ProtectedRoute>
                <RevisionScheduler />
              </ProtectedRoute>
            }
          />

          <Route
            path="/viva-simulator"
            element={
              <ProtectedRoute>
                <VivaSimulator />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notes/collaborative/:noteId"
            element={
              <ProtectedRoute>
                <CollaborativeNoteView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz/:id"
            element={
              <ProtectedRoute>
                <QuizSession />
              </ProtectedRoute>
            }
          />          <Route path="/mind-map"
            element={
              <ProtectedRoute>
                <MindMapViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/live"
            element={
              <ProtectedRoute>
                <LiveQuizSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/live/:roomId"
            element={
              <ProtectedRoute>
                <LiveQuizSession />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <StudyAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-planner"
            element={
              <ProtectedRoute>
                <FormulaScratchpad />
              </ProtectedRoute>
            }
          />

          <Route
            path="/study-goals"
            element={
              <ProtectedRoute>
                <StudyGoals />
              </ProtectedRoute>
            }
          />

          <Route
            path="/time-budgets"
            element={
              <ProtectedRoute>
                <StudyTimeBudgetDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/attempt-history"
            element={
              <ProtectedRoute>
                <AttemptHistoryDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <InterviewRoomPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/interview/:roomId"
            element={
              <ProtectedRoute>
                <InterviewRoomPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/streak-dashboard"
            element={
              <ProtectedRoute>
                <StreakDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bounties"
            element={
              <ProtectedRoute>
                <BountyBoardPage />
              </ProtectedRoute>
            }
          />

          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>

          <Route path="/medical-cases" element={<MedicalCaseSimulator />} />
          <Route path="/drug-interactions" element={<DrugInteractionChecker />} />
          <Route path="/exam-countdown" element={<ExamCountdownPlanner />} />
          <Route
            path="/habit-insights"
            element={
              <ProtectedRoute>
                <HabitCorrelationDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/clinical-notes" element={<ClinicalNotesSummarizer />} />
          <Route path="/patient-simulator" element={<PatientSimulator />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      </main>
      <ColorblindFilterSVG />
      <MobileBottomNav />
      <OfflineBanner />

      {savedSessionPrompt && (
        <SessionRestoreModal
          savedSession={savedSessionPrompt}
          onClose={() => setSavedSessionPrompt(null)}
        />
      )}
    </>
  );

}

export default App;

