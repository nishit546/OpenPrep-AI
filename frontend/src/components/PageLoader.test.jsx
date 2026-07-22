import { render } from '@testing-library/react';
import PageLoader from './PageLoader';

describe('PageLoader', () => {
  test('should render a full-screen loader', () => {
    const { container } = render(<PageLoader />);
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'h-screen', 'w-screen');
  });

  test('should render a spinner element', () => {
    render(<PageLoader />);
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  test('should render the BookOpen icon', () => {
    render(<PageLoader />);
    const icon = document.querySelector('.lucide-book-open');
    expect(icon).toBeInTheDocument();
  });

  test('should have the themed background', () => {
    const { container } = render(<PageLoader />);
    const wrapper = container.firstChild;
    expect(wrapper.className).toContain('from-amber-900');
    expect(wrapper.className).toContain('via-stone-900');
    expect(wrapper.className).toContain('to-stone-950');
  });
});
