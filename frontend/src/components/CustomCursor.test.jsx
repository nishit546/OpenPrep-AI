import { render, fireEvent, cleanup } from '@testing-library/react';
import CustomCursor from './CustomCursor';

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query === '(pointer: coarse)' ? false : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('CustomCursor', () => {
  test('renders dot and ring elements', () => {
    render(<CustomCursor />);
    expect(document.querySelector('.custom-cursor-dot')).toBeInTheDocument();
    expect(document.querySelector('.custom-cursor-ring')).toBeInTheDocument();
  });

  test('does not render on touch devices', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(pointer: coarse)',
      media: query,
    }));
    render(<CustomCursor />);
    expect(document.querySelector('.custom-cursor-dot')).not.toBeInTheDocument();
  });

  test('dot follows mouse movement', () => {
    render(<CustomCursor />);
    const dot = document.querySelector('.custom-cursor-dot');

    fireEvent.mouseMove(window, { clientX: 100, clientY: 200 });
    expect(dot.style.transform).toContain('100');
    expect(dot.style.transform).toContain('200');
  });

  test('hover effect activates on dynamically added button via event delegation', () => {
    render(<CustomCursor />);
    const ring = document.querySelector('.custom-cursor-ring');

    // Add a button AFTER render (simulating React Router navigation)
    const btn = document.createElement('button');
    btn.textContent = 'Dynamic';
    document.body.appendChild(btn);

    fireEvent.mouseEnter(btn);
    expect(ring.classList.contains('cursor-hover')).toBe(true);

    fireEvent.mouseLeave(btn);
    expect(ring.classList.contains('cursor-hover')).toBe(false);
  });

  test('hover effect activates on dynamically added link', () => {
    render(<CustomCursor />);
    const ring = document.querySelector('.custom-cursor-ring');

    const link = document.createElement('a');
    link.href = '/dashboard';
    link.textContent = 'Go';
    document.body.appendChild(link);

    fireEvent.mouseEnter(link);
    expect(ring.classList.contains('cursor-hover')).toBe(true);

    fireEvent.mouseLeave(link);
    expect(ring.classList.contains('cursor-hover')).toBe(false);
  });

  test('hover effect activates on element with role=button', () => {
    render(<CustomCursor />);
    const ring = document.querySelector('.custom-cursor-ring');

    const div = document.createElement('div');
    div.setAttribute('role', 'button');
    div.textContent = 'Role button';
    document.body.appendChild(div);

    fireEvent.mouseEnter(div);
    expect(ring.classList.contains('cursor-hover')).toBe(true);
  });

  test('hover effect activates on .cursor-pointer element', () => {
    render(<CustomCursor />);
    const ring = document.querySelector('.custom-cursor-ring');

    const div = document.createElement('div');
    div.className = 'cursor-pointer';
    div.textContent = 'Clickable';
    document.body.appendChild(div);

    fireEvent.mouseEnter(div);
    expect(ring.classList.contains('cursor-hover')).toBe(true);
  });

  test('hover effect does NOT activate on non-interactive elements', () => {
    render(<CustomCursor />);
    const ring = document.querySelector('.custom-cursor-ring');

    const p = document.createElement('p');
    p.textContent = 'Just text';
    document.body.appendChild(p);

    fireEvent.mouseEnter(p);
    expect(ring.classList.contains('cursor-hover')).toBe(false);
  });

  test('click effect activates on mousedown', () => {
    render(<CustomCursor />);
    const dot = document.querySelector('.custom-cursor-dot');
    const ring = document.querySelector('.custom-cursor-ring');

    fireEvent.mouseDown(window);
    expect(dot.classList.contains('cursor-click')).toBe(true);
    expect(ring.classList.contains('cursor-click')).toBe(true);
  });

  test('click effect deactivates on mouseup', () => {
    render(<CustomCursor />);
    const dot = document.querySelector('.custom-cursor-dot');
    const ring = document.querySelector('.custom-cursor-ring');

    fireEvent.mouseDown(window);
    fireEvent.mouseUp(window);
    expect(dot.classList.contains('cursor-click')).toBe(false);
    expect(ring.classList.contains('cursor-click')).toBe(false);
  });

  test('event listeners are cleaned up on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<CustomCursor />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
