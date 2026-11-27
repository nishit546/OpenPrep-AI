import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ExamReadinessCard from './ExamReadinessCard';

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
  LineChart: ({ children }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe('ExamReadinessCard forecast status', () => {
  it('explains why an estimate is unavailable', () => {
    render(<ExamReadinessCard data={{
      overallReadiness: 46,
      trajectory: [],
      forecast: { mode: 'insufficient-data', reason: 'Complete more quizzes.' },
    }} onRecalculate={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toContain('Complete more quizzes.');
  });

  it('labels a trend as an uncertain estimate', () => {
    render(<ExamReadinessCard data={{
      overallReadiness: 46,
      trajectory: [{ day: 'Day 0', date: '2026-11-27', score: 46 }],
      forecast: { mode: 'observed-trend', confidence: 'low', basis: 'Recent quiz trend.' },
    }} onRecalculate={vi.fn()} />);

    expect(screen.getByText('Estimated Readiness Trajectory')).toBeTruthy();
    expect(screen.getByText(/not a guaranteed exam score/i)).toBeTruthy();
  });
});
