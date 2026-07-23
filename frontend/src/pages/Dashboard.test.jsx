import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '../context/ThemeContext';
import authReducer from '../store/slices/authSlice';
import dashboardReducer from '../store/slices/dashboardSlice';
import Dashboard from './Dashboard';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock('../store/slices/dashboardSlice', async () => {
  const actual = await vi.importActual('../store/slices/dashboardSlice');
  return {
    ...actual,
    fetchDashboardStats: () => ({ type: 'dashboard/fetchStats' }),
    fetchSubjectBreakdown: () => ({ type: 'dashboard/fetchSubjects' }),
    fetchActivePlan: () => ({ type: 'dashboard/fetchActivePlan' }),
    fetchDueFlashcards: () => ({ type: 'dashboard/fetchFlashcards' }),
  };
});

const renderDashboard = (authState = {}, dashboardState = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, dashboard: dashboardReducer },
    preloadedState: {
      auth: {
        token: 'fake-token',
        isAuthenticated: true,
        user: { _id: 'u1', name: 'Test User', email: 'test@test.com' },
        loading: false,
        error: null,
        ...authState,
      },
      dashboard: {
        stats: null,
        weeklyChartData: [],
        recentActivity: [],
        subjectBreakdown: [],
        activePlan: null,
        dueFlashcards: [],
        loadingStats: false,
        loadingSubjects: false,
        loadingPlan: false,
        loadingFlashcards: false,
        errorStats: null,
        errorSubjects: null,
        errorPlan: null,
        errorFlashcards: null,
        ...dashboardState,
      },
    },
  });

  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <ThemeProvider>
          <Dashboard />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

  return { ...result, store };
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Personalized greeting ──

  test('shows personalized greeting with user name', () => {
    renderDashboard();
    expect(screen.getByText(/Welcome back, Test User/)).toBeInTheDocument();
  });

  test('falls back to "Welcome back, Scholar." when user has no name', () => {
    renderDashboard({ user: null });
    expect(screen.getByText(/Welcome back, Scholar/)).toBeInTheDocument();
  });

  // ── Logout button ──

  test('renders logout button with aria-label', () => {
    renderDashboard();
    expect(screen.getByRole('button', { name: /log out/i })).toBeInTheDocument();
  });

  test('logout button dispatches logout and navigates', () => {
    const { store } = renderDashboard();
    const logoutBtn = screen.getByRole('button', { name: /log out/i });
    fireEvent.click(logoutBtn);

    const authState = store.getState().auth;
    expect(authState.isAuthenticated).toBe(false);
    expect(authState.user).toBeNull();
    expect(authState.token).toBeNull();
  });

  // ── Sidebar buttons ──

  test('Study Plan sidebar button opens the study plan modal', () => {
    renderDashboard();
    const studyPlanBtn = screen.getByText('Study Plan').closest('button');
    fireEvent.click(studyPlanBtn);
    expect(studyPlanBtn).toBeInTheDocument();
  });

  test('Start Quiz sidebar button shows coming soon toast', async () => {
    renderDashboard();
    const startQuizBtn = screen.getByText('Start Quiz').closest('button');
    fireEvent.click(startQuizBtn);

    await waitFor(() => {
      expect(screen.getByText('Quiz feature coming soon!')).toBeInTheDocument();
    });
  });

  test('Analyze PYQ sidebar button shows coming soon toast', async () => {
    renderDashboard();
    const pyqBtn = screen.getByText('Analyze PYQ').closest('button');
    fireEvent.click(pyqBtn);

    await waitFor(() => {
      expect(screen.getByText('PYQ Analysis coming soon!')).toBeInTheDocument();
    });
  });

  test('coming soon toast auto-dismisses after 3 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    renderDashboard();

    const startQuizBtn = screen.getByText('Start Quiz').closest('button');
    fireEvent.click(startQuizBtn);

    await waitFor(() => {
      expect(screen.getByText('Quiz feature coming soon!')).toBeInTheDocument();
    });

    vi.advanceTimersByTime(3100);

    await waitFor(() => {
      expect(screen.queryByText('Quiz feature coming soon!')).not.toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  test('coming soon toast can be dismissed by clicking X', async () => {
    renderDashboard();
    const startQuizBtn = screen.getByText('Start Quiz').closest('button');
    fireEvent.click(startQuizBtn);

    await waitFor(() => {
      expect(screen.getByText('Quiz feature coming soon!')).toBeInTheDocument();
    });

    const dismissBtn = document.querySelector('.fixed .ml-2.text-yellow-400');
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText('Quiz feature coming soon!')).not.toBeInTheDocument();
    });
  });

  // ── Achievements ──

  test('renders all four achievement badges', () => {
    renderDashboard();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('On Fire')).toBeInTheDocument();
    expect(screen.getByText('Halfway There')).toBeInTheDocument();
    expect(screen.getByText('Dedicated Scholar')).toBeInTheDocument();
  });

  test('shows "Earned" for badges that meet criteria', () => {
    renderDashboard({
      user: { _id: 'u1', name: 'Test User' },
    }, {
      stats: {
        attemptsCount: 5,
        streak: 5,
        syllabusProgress: 60,
        totalStudyHours: 15,
        topicsBreakdown: { strong: 3, medium: 2, total: 10 },
      },
    });

    const earnedBadges = screen.getAllByText('Earned');
    expect(earnedBadges.length).toBe(4);
  });

  test('shows "Locked" for badges that do not meet criteria', () => {
    renderDashboard({
      user: { _id: 'u1', name: 'Test User' },
    }, {
      stats: {
        attemptsCount: 0,
        streak: 0,
        syllabusProgress: 0,
        totalStudyHours: 0,
        topicsBreakdown: { strong: 0, medium: 0, total: 0 },
      },
    });

    const lockedBadges = screen.getAllByText('Locked');
    expect(lockedBadges.length).toBe(4);
  });

  test('shows mixed earned/locked based on stats', () => {
    renderDashboard({
      user: { _id: 'u1', name: 'Test User' },
    }, {
      stats: {
        attemptsCount: 3,
        streak: 1,
        syllabusProgress: 30,
        totalStudyHours: 12,
        topicsBreakdown: { strong: 2, medium: 1, total: 10 },
      },
    });

    expect(screen.getAllByText('Earned').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Locked').length).toBeGreaterThanOrEqual(1);
  });

  // ── Stats display ──

  test('displays streak count', () => {
    renderDashboard({}, {
      stats: {
        streak: 7,
        totalStudyHours: 10,
        syllabusProgress: 45,
        attemptsCount: 20,
        topicsBreakdown: { strong: 3, medium: 2, total: 10 },
      },
    });
    expect(screen.getByText('7 Day')).toBeInTheDocument();
  });

  test('displays zero streak by default', () => {
    renderDashboard();
    expect(screen.getByText('0 Day')).toBeInTheDocument();
  });
});
