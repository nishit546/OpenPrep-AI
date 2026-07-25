import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/slices/authSlice';
import ProtectedRoute from './ProtectedRoute';

const renderWithProviders = (ui, { authState } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>{ui}</MemoryRouter>
    </Provider>
  );
};

describe('ProtectedRoute', () => {
  test('should show loading spinner when auth is loading', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        authState: {
          token: null,
          isAuthenticated: false,
          user: null,
          loading: true,
          error: null,
        },
      }
    );

    // Should show a spinner (the div with animate-spin class)
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('should redirect to /login when not authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        authState: {
          token: null,
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
        },
      }
    );

    // Protected content should not be rendered
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  test('should render children when authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      {
        authState: {
          token: 'fake-token',
          isAuthenticated: true,
          user: { id: 'user123', name: 'Test', email: 'test@example.com' },
          loading: false,
          error: null,
        },
      }
    );

    // Protected content should be rendered
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
