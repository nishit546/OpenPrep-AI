import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Gauge,
  Loader2,
  Play,
  RotateCcw,
  Timer,
  TrendingUp,
} from 'lucide-react';

import {
  getPacingPlan,
  getLivePacing,
  getPacingAutopsy,
  getSubjectPacingProfile,
} from '../services/pacingCoachApi';
import AutopsyReport from '../components/pacing-coach/AutopsyReport';
import LivePacingStrip from '../components/pacing-coach/LivePacingStrip';

/**
 * Pacing Coach dashboard.
 *
 * The coach itself runs inside an attempt; this page walks a worked example
 * through the same three endpoints an attempt uses, so the budgets, the live
 * strip and the autopsy can be seen without sitting a mock exam.
 */

/** The three stages of the walkthrough. */
const STAGE = {
  SETUP: 'setup',
  LIVE: 'live',
  AUTOPSY: 'autopsy',
};

/**
 * The worked example. Five questions across three difficulties over ten
 * minutes, with an attempt that ends one of each classification so the autopsy
 * has something to say about all four.
 */
const DEMO_QUESTIONS = [
  { id: 'q1', maxScore: 1, difficulty: 'easy' },
  { id: 'q2', maxScore: 2, difficulty: 'medium' },
  { id: 'q3', maxScore: 4, difficulty: 'hard' },
  { id: 'q4', maxScore: 1, difficulty: 'medium' },
  { id: 'q5', maxScore: 2, difficulty: 'hard' },
];

const DEMO_DURATION_SECONDS = 600;
const DEMO_REVIEW_BUFFER_PERCENT = 10;

const DEMO_ATTEMPT = {
  timeSpent: 580,
  answers: [
    { questionId: 'q1', timeSpent: 40, isCorrect: true },
    { questionId: 'q2', timeSpent: 130, isCorrect: true },
    { questionId: 'q3', timeSpent: 300, isCorrect: false },
    { questionId: 'q4', timeSpent: 20, isCorrect: false },
    { questionId: 'q5', timeSpent: 90, isCorrect: true },
  ],
};

/** Where the live snapshot is taken: part-way through question 2. */
const DEMO_LIVE_SNAPSHOT = {
  elapsedSeconds: 150,
  currentQuestionOrder: 2,
  currentQuestionElapsed: 110,
  completedQuestions: [{ questionId: 'q1', timeSpent: 40 }],
};

/** Reads the message off an axios error without losing the fallback. */
function messageFor(error) {
  return error?.response?.data?.error || error?.message || 'Something went wrong.';
}

/** "10m", or "1m 30s" when there are seconds worth showing. */
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';

  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);

  if (minutes === 0) return `${rest}s`;
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

const DIFFICULTY_TONE = {
  easy: 'text-emerald-400',
  medium: 'text-amber-400',
  hard: 'text-red-400',
};

const PacingCoachDashboard = () => {
  const navigate = useNavigate();

  const [stage, setStage] = useState(STAGE.SETUP);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [pacingPlan, setPacingPlan] = useState(null);
  const [livePacing, setLivePacing] = useState(null);
  const [autopsy, setAutopsy] = useState(null);
  const [subjectProfile, setSubjectProfile] = useState(null);

  const runWalkthrough = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // The profile is a personalisation input, not a requirement: a student
      // with no history for this subject still gets a plan at the 1.0
      // baseline, so a 404 here must not abort the walkthrough.
      let profile = null;
      try {
        const profileResponse = await getSubjectPacingProfile(
          '00000000-0000-0000-0000-000000000000'
        );
        profile = profileResponse.data;
      } catch {
        profile = null;
      }
      setSubjectProfile(profile);

      const planResponse = await getPacingPlan({
        totalDurationSeconds: DEMO_DURATION_SECONDS,
        reviewBufferPercent: DEMO_REVIEW_BUFFER_PERCENT,
        questions: DEMO_QUESTIONS,
      });
      const plan = planResponse.data;
      setPacingPlan(plan);

      const liveResponse = await getLivePacing({
        elapsedSeconds: DEMO_LIVE_SNAPSHOT.elapsedSeconds,
        totalDurationSeconds: DEMO_DURATION_SECONDS,
        completedQuestions: DEMO_LIVE_SNAPSHOT.completedQuestions,
        pacingPlan: plan,
        currentQuestionId: 'q2',
        currentQuestionElapsed: DEMO_LIVE_SNAPSHOT.currentQuestionElapsed,
      });
      setLivePacing(liveResponse.data);

      setStage(STAGE.LIVE);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const runAutopsy = useCallback(async () => {
    if (!pacingPlan) return;

    setLoading(true);
    setError('');

    try {
      const response = await getPacingAutopsy({ attemptData: DEMO_ATTEMPT, pacingPlan });
      setAutopsy(response.data);
      setStage(STAGE.AUTOPSY);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setLoading(false);
    }
  }, [pacingPlan]);

  const reset = useCallback(() => {
    setStage(STAGE.SETUP);
    setPacingPlan(null);
    setLivePacing(null);
    setAutopsy(null);
    setError('');
  }, []);

  const currentQuestionBudget =
    pacingPlan?.questionBudgets?.[DEMO_LIVE_SNAPSHOT.currentQuestionOrder - 1]?.budgetSeconds ?? 0;

  return (
    <div className="min-h-screen bg-stone-950 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="mt-1 p-2 rounded-xl bg-stone-900/60 border border-stone-700/40 text-stone-400 hover:text-stone-100 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
              <Gauge className="h-7 w-7 text-amber-400" />
              Pacing Coach
            </h1>
            <p className="text-sm text-stone-400">
              Per-question time budgets, live time-bleed warnings, and a post-attempt autopsy.
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {stage === STAGE.SETUP && (
          <div className="bg-stone-900/60 border border-stone-700/40 rounded-2xl p-8 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 mb-4">
              <Timer className="h-7 w-7 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-stone-100 mb-2">
              See how the coach paces an attempt
            </h2>
            <p className="text-sm text-stone-400 max-w-2xl mx-auto mb-6">
              The coach splits the available time across questions by marks and difficulty, holding
              back a review buffer, then warns you live when a question is eating more than its
              share. Afterwards it tells you which questions paid for the time they took. This
              walkthrough runs a five-question, ten-minute example through the same endpoints an
              attempt uses.
            </p>
            <button
              type="button"
              onClick={runWalkthrough}
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-all shadow-lg shadow-amber-600/20"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {loading ? 'Building the plan…' : 'Run the walkthrough'}
            </button>
          </div>
        )}

        {stage !== STAGE.SETUP && pacingPlan && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-stone-900/60 border border-stone-700/40 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Exam summary
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-stone-400">Total duration</dt>
                  <dd className="text-stone-200 font-mono">
                    {formatDuration(pacingPlan.totalDurationSeconds)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-stone-400">
                    Review buffer ({pacingPlan.reviewBufferPercent}%)
                  </dt>
                  <dd className="text-stone-200 font-mono">
                    {formatDuration(pacingPlan.reviewBufferSeconds)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-stone-400">Usable time</dt>
                  <dd className="text-emerald-300 font-mono">
                    {formatDuration(pacingPlan.usableTimeSeconds)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-stone-400">Allocated across questions</dt>
                  <dd className="text-stone-200 font-mono">
                    {formatDuration(pacingPlan.allocatedTotalSeconds)}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="lg:col-span-2 bg-stone-900/60 border border-stone-700/40 rounded-2xl p-4">
              <h2 className="text-sm font-semibold text-stone-100 mb-1">Question budgets</h2>
              <p className="text-xs text-stone-500 mb-4">
                Allocated by marks weighted for difficulty, then normalised so the total never
                exceeds the usable time.
              </p>
              <div className="flex flex-wrap gap-2">
                {pacingPlan.questionBudgets.map((budget) => (
                  <div
                    key={budget.questionId}
                    className="min-w-[92px] rounded-xl bg-stone-800/60 border border-stone-700/40 px-3 py-2 text-center"
                  >
                    <p className="text-xs font-semibold text-stone-300">Q{budget.order}</p>
                    <p className="text-sm font-mono text-stone-100 my-0.5">
                      {formatDuration(budget.budgetSeconds)}
                    </p>
                    <p
                      className={`text-[11px] capitalize ${
                        DIFFICULTY_TONE[budget.difficulty] || 'text-stone-400'
                      }`}
                    >
                      {budget.difficulty}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {stage === STAGE.LIVE && livePacing && pacingPlan && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-stone-100 mb-3">
              Live view, part-way through question {DEMO_LIVE_SNAPSHOT.currentQuestionOrder}
            </h2>
            <LivePacingStrip
              currentQuestionOrder={DEMO_LIVE_SNAPSHOT.currentQuestionOrder}
              budgetSeconds={currentQuestionBudget}
              elapsedSeconds={DEMO_LIVE_SNAPSHOT.currentQuestionElapsed}
              paceState={livePacing.paceState}
              remainingTime={livePacing.remainingTime}
              projectedUnanswered={livePacing.projectedCompletion?.projectedUnanswered ?? 0}
            />

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={runAutopsy}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                {loading ? 'Analysing…' : 'Finish attempt and view autopsy'}
              </button>
            </div>
          </div>
        )}

        {stage === STAGE.AUTOPSY && autopsy && (
          <div className="mb-6">
            <AutopsyReport autopsy={autopsy} />
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-800 border border-stone-700/50 text-stone-300 hover:text-stone-100 text-sm font-medium transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Run it again
              </button>
            </div>
          </div>
        )}

        {subjectProfile && (
          <div className="bg-stone-900/40 border border-stone-700/30 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-stone-100 mb-1">Subject pacing profile</h2>
            <p className="text-sm text-stone-300">{subjectProfile.message}</p>
            {Number.isFinite(subjectProfile.factor) && (
              <p className="text-xs text-stone-500 mt-1 font-mono">
                Multiplier applied to future budgets: {subjectProfile.factor.toFixed(2)}&times;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PacingCoachDashboard;
