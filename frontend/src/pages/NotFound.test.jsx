import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from './NotFound';

const renderWithRouter = (ui, { initialEntries = ['/unknown'] } = {}) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      {ui}
    </MemoryRouter>
  );
};

describe('NotFound', () => {
  test('should render 404 text', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  test('should render Page Not Found heading', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
  });

  test('should render description', () => {
    renderWithRouter(<NotFound />);
    expect(
      screen.getByText('The page you are looking for does not exist or has been moved.')
    ).toBeInTheDocument();
  });

  test('should have Go Back button', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText('Go Back')).toBeInTheDocument();
  });

  test('should have navigation links', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  test('should have correct link hrefs', () => {
    renderWithRouter(<NotFound />);
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('Sign In').closest('a')).toHaveAttribute('href', '/login');
    expect(screen.getByText('Register').closest('a')).toHaveAttribute('href', '/register');
  });
});
