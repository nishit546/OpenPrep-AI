import PropTypes from 'prop-types';
import {
  Cell,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { Clock, Coins, Gauge, Lightbulb, SkipForward, Target } from 'lucide-react';

/**
 * The post-attempt autopsy: where the time went, which questions paid for
 * themselves, and which ones to skip next time.
 *
 * Every number comes from analyzeAttempt in
 * backend/services/pacingCoachService.js — this renders it, it does not
 * recompute it.
 */

/**
 * The four outcomes analyzeAttempt classifies a question into, crossing
 * "did you get it right" with "did it fit its time budget".
 */
const CLASSIFICATIONS = {
  efficient: {
    label: 'Efficient',
    hint: 'Correct, inside budget',
    colour: '#22c55e',
    text: 'text-emerald-300',
  },
  slow_win: {
    label: 'Slow win',
    hint: 'Correct, but well over budget',
    colour: '#f59e0b',
    text: 'text-amber-300',
  },
  time_sink: {
    label: 'Time sink',
    hint: 'Wrong, and well over budget',
    colour: '#ef4444',
    text: 'text-red-300',
  },
  rushed_loss: {
    label: 'Rushed loss',
    hint: 'Wrong, and under budget',
    colour: '#38bdf8',
    text: 'text-sky-300',
  },
};

const UNKNOWN = { label: 'Unclassified', hint: '', colour: '#78716c', text: 'text-stone-400' };

const classificationOf = (key) => CLASSIFICATIONS[key] || UNKNOWN;

/** "12m 04s", or "48s" when there is no whole minute to show. */
function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';

  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);

  return minutes > 0 ? `${minutes}m ${String(rest).padStart(2, '0')}s` : `${rest}s`;
}

const StatTile = ({ icon: Icon, label, value, sublabel = null, tone = null }) => (
  <div className="bg-stone-900/60 border border-stone-700/40 rounded-xl p-4">
    <div className="flex items-center gap-2 mb-2">
      <div className="p-1.5 rounded-lg bg-stone-800/80">
        <Icon className="h-4 w-4 text-amber-400" />
      </div>
      <span className="text-xs text-stone-400">{label}</span>
    </div>
    <p className={`text-xl font-bold ${tone || 'text-stone-100'}`}>{value}</p>
    {sublabel && <p className="text-xs text-stone-500 mt-0.5">{sublabel}</p>}
  </div>
);

StatTile.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  sublabel: PropTypes.string,
  tone: PropTypes.string,
};

const ScatterTooltip = ({ active = false, payload = null }) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0].payload;
  const classification = classificationOf(point.classification);

  return (
    <div className="bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-stone-200 font-semibold mb-1">Question {point.questionId}</p>
      <p className="text-stone-400">
        Used <span className="text-stone-200 font-mono">{point.x.toFixed(2)}&times;</span> its budget
      </p>
      <p className="text-stone-400">
        Earned <span className="text-stone-200 font-mono">{point.y}</span>{' '}
        {point.y === 1 ? 'mark' : 'marks'}
      </p>
      <p className={`${classification.text} font-medium mt-1`}>{classification.label}</p>
    </div>
  );
};

ScatterTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
};

const AutopsyReport = ({ autopsy = null }) => {
  if (!autopsy) return null;

  const {
    classifications,
    totalTimeSpent,
    totalBudget,
    totalTimeSaved,
    totalTimeLost,
    estimatedOpportunityCostMarks,
    analyzedQuestions = [],
    skipRecommendations = [],
  } = autopsy;

  const chartData = analyzedQuestions.map((question) => ({
    // `ratio` arrives as a fixed-2 string from the service.
    x: Number.parseFloat(question.ratio),
    y: question.marksEarned,
    classification: question.classification,
    questionId: question.questionId,
  }));

  const overBudget = totalTimeSpent > totalBudget;

  return (
    <section className="space-y-6" data-testid="autopsy-report">
      <div>
        <h2 className="text-xl font-bold text-stone-100 flex items-center gap-2">
          <Gauge className="h-5 w-5 text-amber-400" />
          Post-attempt time autopsy
        </h2>
        <p className="text-sm text-stone-400 mt-1">
          Where the time went, and which questions paid for the time they took.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          icon={Clock}
          label="Time spent vs budget"
          value={`${formatDuration(totalTimeSpent)} / ${formatDuration(totalBudget)}`}
          sublabel={overBudget ? 'Over the allocated budget' : 'Within the allocated budget'}
          tone={overBudget ? 'text-amber-300' : 'text-emerald-300'}
        />
        <StatTile
          icon={Target}
          label="Efficient / slow wins"
          value={`${classifications.efficient} / ${classifications.slow_win}`}
          sublabel="Correct, in budget / over budget"
          tone="text-emerald-300"
        />
        <StatTile
          icon={SkipForward}
          label="Time sinks / rushed losses"
          value={`${classifications.time_sink} / ${classifications.rushed_loss}`}
          sublabel="Wrong, over budget / under budget"
          tone="text-red-300"
        />
        <StatTile
          icon={Coins}
          label="Opportunity cost"
          value={`${estimatedOpportunityCostMarks} marks`}
          sublabel="Carried by questions that earned nothing"
          tone="text-amber-300"
        />
      </div>

      {(Number.isFinite(totalTimeSaved) || Number.isFinite(totalTimeLost)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-stone-900/40 border border-stone-700/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-stone-400">Time banked under budget</span>
            <span className="text-sm font-semibold text-emerald-300 font-mono">
              {formatDuration(totalTimeSaved)}
            </span>
          </div>
          <div className="bg-stone-900/40 border border-stone-700/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-stone-400">Time spent over budget</span>
            <span className="text-sm font-semibold text-red-300 font-mono">
              {formatDuration(totalTimeLost)}
            </span>
          </div>
        </div>
      )}

      <div className="bg-stone-900/60 border border-stone-700/40 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-4 mb-1">
          <h3 className="text-sm font-semibold text-stone-100">Time spent against marks earned</h3>
          <span className="text-xs text-stone-500">Dashed line = the question&apos;s budget</span>
        </div>
        <p className="text-xs text-stone-500 mb-4">
          Anything right of the line took longer than it was budgeted. Anything right of the line
          and on zero marks cost you time and returned nothing.
        </p>

        {chartData.length === 0 ? (
          <p className="text-sm text-stone-500 py-12 text-center">
            No per-question timings were recorded for this attempt.
          </p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
                <CartesianGrid stroke="#44403c" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Time used against budget"
                  unit="x"
                  stroke="#a8a29e"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: 'Time used ÷ budget',
                    position: 'insideBottom',
                    offset: -12,
                    fill: '#a8a29e',
                    fontSize: 12,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Marks earned"
                  stroke="#a8a29e"
                  tick={{ fontSize: 12 }}
                  allowDecimals={false}
                />
                <ZAxis type="number" range={[110, 110]} />
                <RechartsTooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <ReferenceLine x={1} stroke="#f59e0b" strokeDasharray="4 4" />
                <Scatter name="Questions" data={chartData}>
                  {chartData.map((point) => (
                    <Cell
                      key={point.questionId}
                      fill={classificationOf(point.classification).colour}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 pt-4 border-t border-stone-700/30">
          {Object.entries(CLASSIFICATIONS).map(([key, entry]) => (
            <span key={key} className="flex items-center gap-2 text-xs text-stone-400">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.colour }}
                aria-hidden="true"
              />
              <span className="text-stone-300 font-medium">{entry.label}</span>
              <span className="text-stone-500">{entry.hint}</span>
            </span>
          ))}
        </div>
      </div>

      {skipRecommendations.length > 0 && (
        <div className="bg-stone-900/60 border border-stone-700/40 rounded-2xl p-4">
          <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            Skip recommendations
          </h3>
          <ul className="divide-y divide-stone-700/30">
            {skipRecommendations.map((recommendation) => (
              <li key={recommendation.questionId} className="py-3 first:pt-0 last:pb-0">
                <p className="text-sm font-medium text-stone-200">
                  Question {recommendation.questionId}
                </p>
                <p className="text-xs text-stone-400 mt-1">{recommendation.message}</p>
                <p className="text-xs text-stone-500 mt-1 font-mono">
                  {formatDuration(recommendation.spent)} spent against a{' '}
                  {formatDuration(recommendation.budget)} budget
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

AutopsyReport.propTypes = {
  autopsy: PropTypes.shape({
    classifications: PropTypes.shape({
      efficient: PropTypes.number,
      slow_win: PropTypes.number,
      time_sink: PropTypes.number,
      rushed_loss: PropTypes.number,
    }),
    totalTimeSpent: PropTypes.number,
    totalBudget: PropTypes.number,
    totalTimeSaved: PropTypes.number,
    totalTimeLost: PropTypes.number,
    estimatedOpportunityCostMarks: PropTypes.number,
    analyzedQuestions: PropTypes.array,
    skipRecommendations: PropTypes.array,
  }),
};

export default AutopsyReport;
