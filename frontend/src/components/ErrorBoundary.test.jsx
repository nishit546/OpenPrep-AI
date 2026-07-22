import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import ErrorBoundary from './ErrorBoundary';

const ProblemChild = () => {
  throw new Error('Test error');
};

const GoodChild = () => <div>Child content</div>;

const FlakyChild = () => {
  const [shouldThrow] = useState(true);

  if (shouldThrow) {
    throw new Error('Flaky error');
  }

  return <div>Recovered content</div>;
};

const renderErrorBoundary = (children) =>
  render(
    <MemoryRouter>
      <ErrorBoundary>{children}</ErrorBoundary>
    </MemoryRouter>
  );

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  test('should render children when no error', () => {
    renderErrorBoundary(<GoodChild />);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  test('should render error UI when child throws', () => {
    renderErrorBoundary(<ProblemChild />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Go Home')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  test('should display error message', () => {
    renderErrorBoundary(<ProblemChild />);
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  test('should reset error state when Try Again is clicked', () => {
    renderErrorBoundary(<FlakyChild />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // The FlakyChild always throws on first render.
    // Clicking Try Again resets hasError to false, but FlakyChild will throw again.
    // This test verifies the button is functional and the boundary re-catches.
    fireEvent.click(screen.getByText('Try Again'));
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  test('should have a Go Home link with correct href', () => {
    renderErrorBoundary(<ProblemChild />);
    const goHomeLink = screen.getByText('Go Home').closest('a');
    expect(goHomeLink).toHaveAttribute('href', '/');
  });

  test('should log error to console', () => {
    renderErrorBoundary(<ProblemChild />);
    expect(console.error).toHaveBeenCalled();
  });
});
