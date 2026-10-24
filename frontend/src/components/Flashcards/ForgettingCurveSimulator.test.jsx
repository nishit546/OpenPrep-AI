import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

vi.mock('../../services/api', () => ({
  getDeckRetentionCurve: vi.fn(),
}));

// jsdom has no layout, so ResponsiveContainer would render nothing useful.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="chart">{children}</div>,
  };
});

import { getDeckRetentionCurve } from '../../services/api';
import ForgettingCurveSimulator from './ForgettingCurveSimulator';

const curve = (fn) => Array.from({ length: 31 }, (_, day) => ({ day, retentionPercent: fn(day) }));

const payload = {
  dangerThreshold: 70,
  forecast: curve((d) => 100 - d * 2),
  vulnerability: {
    score: 40,
    atRiskCount: 2,
    totalCards: 5,
    averageRetention: 80,
    atRiskCards: [],
  },
  whatIf: {
    daysDelay: 3,
    reviewToday: curve(() => 90),
    delayed: curve(() => 60),
    averageReviewToday: 90,
    averageDelayed: 75,
    retentionLostByDelaying: 15,
    retentionBeforeDelayedReview: 80,
    cardsBelowDangerBeforeReview: 1,
  },
};

describe('ForgettingCurveSimulator', () => {
  beforeEach(() => {
    getDeckRetentionCurve.mockReset();
  });

  test('loads the forecast for the deck and shows the vulnerability score', async () => {
    getDeckRetentionCurve.mockResolvedValue({ data: { data: payload } });
    render(<ForgettingCurveSimulator deckId="d1" deckName="Biology" />);

    expect(await screen.findByTestId('vulnerability-score')).toHaveTextContent('40%');
    expect(getDeckRetentionCurve).toHaveBeenCalledWith('d1', 3);
    expect(screen.getByTestId('whatif-summary')).toHaveTextContent('Waiting 3 days');
  });

  test('toggle switches the scenario and the slider reads the chosen curve', async () => {
    getDeckRetentionCurve.mockResolvedValue({ data: { data: payload } });
    render(<ForgettingCurveSimulator deckId="d1" />);
    await screen.findByTestId('vulnerability-score');

    fireEvent.change(screen.getByLabelText(/Day 0/), { target: { value: '5' } });
    expect(screen.getByTestId('slider-readout')).toHaveTextContent('90%');

    fireEvent.click(screen.getByRole('button', { name: /Review in 3 days/ }));
    expect(screen.getByTestId('slider-readout')).toHaveTextContent('60%');
    expect(screen.getByText(/below 70%/)).toBeInTheDocument();
  });

  test('shows an error message when the request fails', async () => {
    getDeckRetentionCurve.mockRejectedValue(new Error('nope'));
    render(<ForgettingCurveSimulator deckId="d1" deckName="Biology" />);
    await waitFor(() =>
      expect(screen.getByText(/Could not load the forecast/)).toBeInTheDocument()
    );
  });
});
