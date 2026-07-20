import { render, screen, fireEvent } from '@testing-library/react';
import FlashcardWidget from './FlashcardWidget';

// Sample flashcard data matching the expected shape
const sampleFlashcard = {
  front: 'What is React?',
  back: 'A JavaScript library for building user interfaces',
};

describe('FlashcardWidget', () => {
  // ---------------------------------------------------------------------------
  // States
  // ---------------------------------------------------------------------------

  test('should display loading shimmer when loading is true', () => {
    render(<FlashcardWidget loading={true} />);
    // Shimmer elements are divs with animate-pulse class
    const shimmers = document.querySelectorAll('.animate-pulse');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  test('should display error state with retry button', () => {
    const handleRetry = vi.fn();
    render(<FlashcardWidget error="Failed to load" onRetry={handleRetry} />);
    expect(screen.getByText('Could not load cards')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  test('should display empty state when no flashcard and no due cards', () => {
    render(<FlashcardWidget flashcard={null} totalDue={0} />);
    expect(screen.getByText(/All caught up/i)).toBeInTheDocument();
  });

  test('should display empty state when flashcard is null but cards are due', () => {
    render(<FlashcardWidget flashcard={null} totalDue={5} />);
    expect(screen.getByText('No due flashcards')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Flip behavior
  // ---------------------------------------------------------------------------

  test('should render the front of the card by default', () => {
    render(<FlashcardWidget flashcard={sampleFlashcard} />);
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('Click to flip')).toBeInTheDocument();
  });

  test('should toggle to back when clicked', () => {
    render(<FlashcardWidget flashcard={sampleFlashcard} />);

    // Click the card container to flip
    const cardContainer = screen.getByText('What is React?').closest('.perspective-1000');
    fireEvent.click(cardContainer);

    // After flip, the answer text appears
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();
  });

  test('should flip back when clicked again', () => {
    render(<FlashcardWidget flashcard={sampleFlashcard} />);

    // Flip to back
    const cardContainer = screen.getByText('What is React?').closest('.perspective-1000');
    fireEvent.click(cardContainer);
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();

    // Click again to flip back
    fireEvent.click(cardContainer);
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  test('should reset flip state when flashcard prop changes', () => {
    const { rerender } = render(<FlashcardWidget flashcard={sampleFlashcard} />);

    // Flip card
    const cardContainer = screen.getByText('What is React?').closest('.perspective-1000');
    fireEvent.click(cardContainer);
    expect(screen.getByText('A JavaScript library for building user interfaces')).toBeInTheDocument();

    // Re-render with a new flashcard (simulating cycling to next card)
    const nextFlashcard = {
      front: 'What is JSX?',
      back: 'A syntax extension for JavaScript',
    };
    rerender(<FlashcardWidget flashcard={nextFlashcard} />);

    // Should show front of new card
    expect(screen.getByText('What is JSX?')).toBeInTheDocument();
    // Back of old card should not be visible
    expect(screen.queryByText('A JavaScript library for building user interfaces')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Total due display
  // ---------------------------------------------------------------------------

  test('should show total due count when multiple cards are due', () => {
    render(<FlashcardWidget flashcard={sampleFlashcard} totalDue={3} />);
    expect(screen.getByText('(3 due)')).toBeInTheDocument();
  });

  test('should not show count when only one card is due', () => {
    render(<FlashcardWidget flashcard={sampleFlashcard} totalDue={1} />);
    expect(screen.queryByText('(1 due)')).not.toBeInTheDocument();
  });
});
