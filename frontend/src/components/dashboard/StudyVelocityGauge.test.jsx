import { render, screen, waitFor } from '@testing-library/react';
import StudyVelocityGauge, { StudyVelocityGaugeView } from './StudyVelocityGauge';
import API from '../../services/api';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn() },
}));

const base = {
  currentVelocity: 3,
  requiredVelocity: 4,
  remainingSyllabusHours: 40,
  daysRemaining: 10,
  tips: ['Add a buffer day every 6 days to absorb slips without extending study hours.'],
};

describe('StudyVelocityGaugeView', () => {
  test.each([
    ['low', 10, 'text-emerald-400', 'bg-emerald-500'],
    ['moderate', 50, 'text-amber-400', 'bg-amber-500'],
    ['high', 90, 'text-rose-400', 'bg-rose-500'],
  ])('shows %s risk in the right colour', (level, score, textClass, barClass) => {
    render(<StudyVelocityGaugeView metrics={{ ...base, burnoutLevel: level, burnoutRisk: score }} />);
    expect(screen.getByTestId('burnout-label')).toHaveClass(textClass);
    expect(screen.getByTestId('burnout-bar')).toHaveClass(barClass);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', String(score));
  });

  test('shows the days-remaining chip and tips', () => {
    render(<StudyVelocityGaugeView metrics={{ ...base, burnoutLevel: 'low', burnoutRisk: 0 }} />);
    expect(screen.getByTestId('days-remaining-chip')).toHaveTextContent('10 days left');
    expect(screen.getByText(/buffer day every 6 days/)).toBeInTheDocument();
  });

  test('uses the singular for one day', () => {
    render(<StudyVelocityGaugeView metrics={{ ...base, daysRemaining: 1, burnoutLevel: 'low', burnoutRisk: 0 }} />);
    expect(screen.getByTestId('days-remaining-chip')).toHaveTextContent('1 day left');
  });
});

describe('StudyVelocityGauge', () => {
  beforeEach(() => vi.clearAllMocks());

  test('loads metrics from the endpoint', async () => {
    API.get.mockResolvedValue({ data: { data: { ...base, burnoutLevel: 'high', burnoutRisk: 80 } } });
    render(<StudyVelocityGauge />);
    await waitFor(() => expect(screen.getByTestId('burnout-label')).toBeInTheDocument());
    expect(API.get).toHaveBeenCalledWith('/study-plans/velocity-metrics');
    expect(screen.getByTestId('burnout-label')).toHaveClass('text-rose-400');
  });

  test('shows a prompt when there is no active plan', async () => {
    API.get.mockResolvedValue({ data: { data: null } });
    render(<StudyVelocityGauge />);
    expect(await screen.findByText(/Create an active study plan/)).toBeInTheDocument();
  });

  test('shows an error when the request fails', async () => {
    API.get.mockRejectedValue(new Error('boom'));
    render(<StudyVelocityGauge />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load study velocity');
  });
});
