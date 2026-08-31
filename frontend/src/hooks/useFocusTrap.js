import { useCallback, useEffect, useRef } from 'react';

/**
 * Selector for elements that can hold keyboard focus.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Whether a layout engine actually ran.
 */
const layoutAvailable = () => {
  if (typeof document === 'undefined' || !document.body) return false;
  if (typeof document.body.getClientRects !== 'function') return false;
  return document.body.getClientRects().length > 0;
};

/** A focusable element still isn't reachable if it or an ancestor is hidden. */
const isVisible = (element) => {
  if (element.hidden) return false;
  if (element.getAttribute('aria-hidden') === 'true') return false;
  if (typeof element.closest === 'function' && element.closest('[aria-hidden="true"]')) return false;

  if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }

  if (!layoutAvailable()) return true;
  return element.getClientRects().length > 0 || element.offsetParent !== null;
};

export const getFocusableElements = (container) => {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisible);
};

/**
 * Lock body scroll without the page jumping.
 */
const lockBodyScroll = () => {
  const { body } = document;
  const previousOverflow = body.style.overflow;
  const previousPaddingRight = body.style.paddingRight;

  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  body.style.overflow = 'hidden';
  if (scrollbarWidth > 0) {
    const currentPadding = parseInt(window.getComputedStyle(body).paddingRight, 10) || 0;
    body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }

  return () => {
    body.style.overflow = previousOverflow;
    body.style.paddingRight = previousPaddingRight;
  };
};

/**
 * Implements the WAI-ARIA dialog keyboard contract for a container element.
 */
const useFocusTrap = (isOpen, onClose, options = {}) => {
  const { closeOnEscape = true, lockScroll = true, initialFocusRef } = options;

  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape' && closeOnEscape) {
        event.stopPropagation();
        if (onCloseRef.current) onCloseRef.current();
        return;
      }

      // Platform Hotkeys Architecture
      if (event.altKey && event.key.toLowerCase() === 'q') {
        event.preventDefault();
        const nextBtn = document.querySelector('[data-a11y-shortcut="next-question"]');
        if (nextBtn) nextBtn.click();
      }

      if (event.altKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        const flipBtn = document.querySelector('[data-a11y-shortcut="flip-flashcard"]');
        if (flipBtn) flipBtn.click();
      }

      if (event.key !== 'Tab') return;

      const container = containerRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !container.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !container.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    },
    [closeOnEscape]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    previouslyFocusedRef.current = document.activeElement;

    const focusTimer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }

      const focusable = getFocusableElements(containerRef.current);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else if (containerRef.current) {
        containerRef.current.setAttribute('tabindex', '-1');
        containerRef.current.focus();
      }
    }, 0);

    document.addEventListener('keydown', handleKeyDown, true);
    const releaseScroll = lockScroll ? lockBodyScroll() : null;

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      if (releaseScroll) releaseScroll();

      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [isOpen, handleKeyDown, lockScroll, initialFocusRef]);

  return containerRef;
};

export default useFocusTrap;
export { FOCUSABLE_SELECTOR, lockBodyScroll };
