import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import PacingCoachDashboard from './PacingCoachDashboard';
import AutopsyReport from '../components/pacing-coach/AutopsyReport';
import LivePacingStrip from '../components/pacing-coach/LivePacingStrip';
import {
  getPacingPlan,
  getLivePacing,
  getPacingAutopsy,
  getSubjectPacingProfile,
} from '../services/pacingCoachApi';

/**
 * The pacing coach was broken in three places at once and none of them
 * surfaced here, because this file could not run:
 *
 *   - the page imported '@mui/material', which is not a dependency of this
 *     app, so `npm run build` failed and the whole production bundle was
 *     unbuildable;
 *   - it imported '../../services/pacingCoachApi', one directory too far up;
 *   - this file was written against Jest (`jest.mock`, `jest.fn`,
 *     `jest.requireActual`) inside a Vitest suite, where `jest` is not
 *     defined, so it threw at collection.
 *
 * Rewritten against `vi`, and against the rebuilt Tailwind components.
 */

vi.mock('../services/pacingCoachApi', () => ({
  getPacingPlan: vi.fn(),
  getLivePacing: vi.fn(),
  getPacingAutopsy: vi.fn(),
  getSubjectPacingProfile: vi.fn(),
}));

/**
 * ResponsiveContainer measures its parent, and jsdom reports every element as
 * 0x0, so the chart renders nothing and recharts warns. Give it a fixed box.
 */
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();

  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  };
});

const PLAN = {
  totalDurationSeconds: 600,
  reviewBufferPercent: 10,
  reviewBufferSeconds: 60,
  usableTimeSeconds: 540,
  allocatedTotalSeconds: 540,
  questionBudgets: [
    { questionId: 'q1', budgetSeconds: 60, difficulty: 'easy', order: 1, marks: 1 },
    { questionId: 'q2', budgetSeconds: 120, difficulty: 'medium', order: 2, marks: 2 },
    { questionId: 'q3', budgetSeconds: 240, difficulty: 'hard', order: 3, marks: 4 },
  ],
};

const LIVE = {
  paceState: 'behind',
  elapsedSeconds: 150,
  remainingTime: 450,
  consumedBudget: 60,
  remainingBudget: 480,
  projectedCompletion: {
    estimatedFinishingTime: 700,
    projectedUnanswered: 2,
    projectedCompletionPercentage: 80,
  },
  bleedState: { isBleeding: false, threshold: 210 },
};

const AUTOPSY = {
  totalTimeSpent: 580,
  totalBudget: 540,
  totalTimeSaved: 40,
  totalTimeLost: 180,
  estimatedOpportunityCostMarks: 4,
  classifications: { efficient: 1, slow_win: 1, time_sink: 1, rushed_loss: 0 },
  analyzedQuestions: [
    { questionId: 'q1', ratio: '0.67', marksEarned: 1, marksLost: 0, classification: 'efficient' },
    { questionId: 'q2', ratio: '2.00', marksEarned: 2, marksLost: 0, classification: 'slow_win' },
    { questionId: 'q3', ratio: '3.10', marksEarned: 0, marksLost: 4, classification: 'time_sink' },
  ],
  skipRecommendations: [
    {
      questionId: 'q3',
      message:
        'Consider skipping earlier next time. This consumed 3.1x its budget and earned 0 marks.',
      spent: 744,
      budget: 240,
    },
  ],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <PacingCoachDashboard />
    </MemoryRouter>
  );

/** Walks the page from setup to the live stage with the fixtures above. */
async function advanceToLive() {
  getSubjectPacingProfile.mockResolvedValueOnce({
    data: { factor: 1.12, message: 'Your recent pace is ~12% slower than baseline.' },
  });
  getPacingPlan.mockResolvedValueOnce({ data: PLAN });
  getLivePacing.mockResolvedValueOnce({ data: LIVE });

  renderPage();
  fireEvent.click(screen.getByRole('button', { name: /run the walkthrough/i }));

  await screen.findByText(/exam summary/i);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PacingCoachDashboard', () => {
  it('renders the setup stage', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: /pacing coach/i, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /run the walkthrough/i })).toBeInTheDocument();
  });

  it('calls no endpoint until the walkthrough is started', () => {
    renderPage();

    expect(getPacingPlan).not.toHaveBeenCalled();
    expect(getLivePacing).not.toHaveBeenCalled();
    expect(getSubjectPacingProfile).not.toHaveBeenCalled();
  });

  it('requests a plan and a live snapshot, then shows both', async () => {
    await advanceToLive();

    expect(getPacingPlan).toHaveBeenCalledTimes(1);
    expect(getLivePacing).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('live-pacing-strip')).toBeInTheDocument();
    expect(screen.getByText(/question budgets/i)).toBeInTheDocument();
  });

  it('sends the plan it received back with the live request', async () => {
    // The live endpoint 400s without a plan carrying questionBudgets, so this
    // is the contract between the two calls.
    await advanceToLive();

    expect(getLivePacing).toHaveBeenCalledWith(expect.objectContaining({ pacingPlan: PLAN }));
  });

  it('renders one budget tile per question, with its difficulty', async () => {
    await advanceToLive();

    expect(screen.getByText('Q1')).toBeInTheDocument();
    expect(screen.getByText('Q2')).toBeInTheDocument();
    expect(screen.getByText('Q3')).toBeInTheDocument();
    expect(screen.getByText('easy')).toBeInTheDocument();
    expect(screen.getByText('hard')).toBeInTheDocument();
  });

  it('shows the exam summary figures', async () => {
    await advanceToLive();

    expect(screen.getByText(/review buffer \(10%\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('9m').length).toBeGreaterThan(0); // 540s usable
  });

  it('shows the subject pacing profile when there is one', async () => {
    await advanceToLive();

    expect(screen.getByText(/~12% slower than baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/1\.12/)).toBeInTheDocument();
  });

  it('still builds the plan when the student has no profile for the subject', async () => {
    // A 404 on the profile is the normal case for a first attempt. It is a
    // personalisation input, not a requirement, and must not abort the run.
    getSubjectPacingProfile.mockRejectedValueOnce(new Error('Not found'));
    getPacingPlan.mockResolvedValueOnce({ data: PLAN });
    getLivePacing.mockResolvedValueOnce({ data: LIVE });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /run the walkthrough/i }));

    await screen.findByText(/exam summary/i);
    expect(screen.queryByText(/subject pacing profile/i)).not.toBeInTheDocument();
  });

  it('surfaces the API error message when the plan request fails', async () => {
    getSubjectPacingProfile.mockRejectedValueOnce(new Error('no profile'));
    getPacingPlan.mockRejectedValueOnce({
      response: { data: { error: 'Invalid duration or question count' } },
    });

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /run the walkthrough/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /invalid duration or question count/i
    );
  });

  it('falls back to the thrown message when the API sends no error body', async () => {
    getSubjectPacingProfile.mockRejectedValueOnce(new Error('no profile'));
    getPacingPlan.mockRejectedValueOnce(new Error('Network Error'));

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /run the walkthrough/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i);
  });

  it('runs the autopsy and renders it', async () => {
    await advanceToLive();
    getPacingAutopsy.mockResolvedValueOnce({ data: AUTOPSY });

    fireEvent.click(screen.getByRole('button', { name: /finish attempt/i }));

    expect(await screen.findByTestId('autopsy-report')).toBeInTheDocument();
    expect(screen.getByText(/consider skipping earlier next time/i)).toBeInTheDocument();
  });

  it('sends the plan with the autopsy request', async () => {
    await advanceToLive();
    getPacingAutopsy.mockResolvedValueOnce({ data: AUTOPSY });

    fireEvent.click(screen.getByRole('button', { name: /finish attempt/i }));
    await screen.findByTestId('autopsy-report');

    expect(getPacingAutopsy).toHaveBeenCalledWith(
      expect.objectContaining({
        pacingPlan: PLAN,
        attemptData: expect.objectContaining({ answers: expect.any(Array) }),
      })
    );
  });

  it('returns to setup when the walkthrough is reset', async () => {
    await advanceToLive();
    getPacingAutopsy.mockResolvedValueOnce({ data: AUTOPSY });

    fireEvent.click(screen.getByRole('button', { name: /finish attempt/i }));
    await screen.findByTestId('autopsy-report');

    fireEvent.click(screen.getByRole('button', { name: /run it again/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('autopsy-report')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /run the walkthrough/i })).toBeInTheDocument();
  });
});

describe('LivePacingStrip', () => {
  const baseProps = {
    currentQuestionOrder: 2,
    budgetSeconds: 120,
    elapsedSeconds: 60,
    paceState: 'on_track',
    remainingTime: 300,
    projectedUnanswered: 0,
  };

  it('shows the pace state the backend reported', () => {
    render(<LivePacingStrip {...baseProps} paceState="behind" />);

    expect(screen.getByTestId('pace-state-chip')).toHaveTextContent(/behind/i);
  });

  it('falls back to on track for an unrecognised pace state', () => {
    render(<LivePacingStrip {...baseProps} paceState="something_new" />);

    expect(screen.getByTestId('pace-state-chip')).toHaveTextContent(/on track/i);
  });

  it('does not warn at the bleed threshold itself', () => {
    // 120 * 1.75 = 210. detectTimeBleed uses a strict >, so 210 is not bleeding.
    render(<LivePacingStrip {...baseProps} elapsedSeconds={210} />);

    expect(screen.getByTestId('pace-state-chip')).not.toHaveTextContent(/time bleed/i);
  });

  it('warns one second past the threshold', () => {
    render(<LivePacingStrip {...baseProps} elapsedSeconds={211} />);

    expect(screen.getByTestId('pace-state-chip')).toHaveTextContent(/time bleed/i);
    expect(screen.getByTestId('bleed-warning')).toHaveTextContent(/consider flagging it and moving on/i);
  });

  it('caps the progress bar at 100% once the budget is blown', () => {
    render(<LivePacingStrip {...baseProps} elapsedSeconds={600} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('reports the budget used as a percentage for screen readers', () => {
    render(<LivePacingStrip {...baseProps} elapsedSeconds={60} budgetSeconds={120} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('does not divide by a zero budget', () => {
    render(<LivePacingStrip {...baseProps} budgetSeconds={0} elapsedSeconds={30} />);

    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('pace-state-chip')).not.toHaveTextContent(/time bleed/i);
  });

  it('clamps a negative remaining time to zero rather than showing -0:12', () => {
    render(<LivePacingStrip {...baseProps} remainingTime={-12} />);

    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('pads the seconds in the clock', () => {
    render(<LivePacingStrip {...baseProps} elapsedSeconds={65} budgetSeconds={125} />);

    expect(screen.getByText(/1:05 \/ 2:05/)).toBeInTheDocument();
  });

  it('warns about projected unanswered questions, in the plural', () => {
    render(<LivePacingStrip {...baseProps} projectedUnanswered={3} />);

    expect(screen.getByTestId('projected-unanswered')).toHaveTextContent(
      'At this rate you will leave 3 questions unanswered.'
    );
  });

  it('uses the singular for one projected unanswered question', () => {
    render(<LivePacingStrip {...baseProps} projectedUnanswered={1} />);

    expect(screen.getByTestId('projected-unanswered')).toHaveTextContent(
      'At this rate you will leave 1 question unanswered.'
    );
  });

  it('stays quiet when nothing is projected to go unanswered', () => {
    render(<LivePacingStrip {...baseProps} projectedUnanswered={0} />);

    expect(screen.queryByTestId('projected-unanswered')).not.toBeInTheDocument();
  });
});

describe('AutopsyReport', () => {
  it('renders nothing without an autopsy', () => {
    const { container } = render(<AutopsyReport autopsy={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the four classification counts', () => {
    render(<AutopsyReport autopsy={AUTOPSY} />);

    expect(screen.getByText('1 / 1')).toBeInTheDocument(); // efficient / slow_win
    expect(screen.getByText('1 / 0')).toBeInTheDocument(); // time_sink / rushed_loss
  });

  it('shows the opportunity cost in marks', () => {
    render(<AutopsyReport autopsy={AUTOPSY} />);

    expect(screen.getByText('4 marks')).toBeInTheDocument();
  });

  it('flags an attempt that ran over its budget', () => {
    render(<AutopsyReport autopsy={AUTOPSY} />);

    expect(screen.getByText(/over the allocated budget/i)).toBeInTheDocument();
  });

  it('flags an attempt that stayed inside its budget', () => {
    render(<AutopsyReport autopsy={{ ...AUTOPSY, totalTimeSpent: 400, totalBudget: 540 }} />);

    expect(screen.getByText(/within the allocated budget/i)).toBeInTheDocument();
  });

  it('lists every skip recommendation with its timings', () => {
    render(<AutopsyReport autopsy={AUTOPSY} />);

    const recommendation = screen.getByText(/consider skipping earlier/i).closest('li');

    expect(within(recommendation).getByText(/question q3/i)).toBeInTheDocument();
    expect(
      within(recommendation).getByText(/12m 24s spent against a 4m 00s budget/i)
    ).toBeInTheDocument();
  });

  it('omits the recommendations block when there are none', () => {
    render(<AutopsyReport autopsy={{ ...AUTOPSY, skipRecommendations: [] }} />);

    expect(screen.queryByText(/skip recommendations/i)).not.toBeInTheDocument();
  });

  it('explains itself when no per-question timings were recorded', () => {
    render(<AutopsyReport autopsy={{ ...AUTOPSY, analyzedQuestions: [] }} />);

    expect(screen.getByText(/no per-question timings were recorded/i)).toBeInTheDocument();
  });

  it('labels every classification in the legend', () => {
    render(<AutopsyReport autopsy={AUTOPSY} />);

    for (const label of ['Efficient', 'Slow win', 'Time sink', 'Rushed loss']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('reads the ratio as a number whether the service sends a string or a number', () => {
    // analyzeAttempt returns `ratio` as a toFixed(2) string; older fixtures
    // and any future numeric change both have to plot.
    const numeric = {
      ...AUTOPSY,
      analyzedQuestions: AUTOPSY.analyzedQuestions.map((q) => ({
        ...q,
        ratio: Number.parseFloat(q.ratio),
      })),
    };

    expect(() => render(<AutopsyReport autopsy={numeric} />)).not.toThrow();
  });
});
