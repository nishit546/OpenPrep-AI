import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FlashcardReview from './FlashcardReview';
import API from '../services/api';
import offlineSyncService from '../services/offlineSyncService';

vi.mock('../services/db.js', () => ({
  db: {
    cachedFlashcards: {
      clear: vi.fn().mockResolvedValue(),
      bulkPut: vi.fn().mockResolvedValue(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    offlineReviews: {
      add: vi.fn().mockResolvedValue(),
    }
  }
}));

vi.mock('../services/api.js', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

// Ratings no longer go straight to the API. They are handed to
// offlineSyncService.queueReview, which writes the review to IndexedDB first
// and only then pushes it upstream, so that a rating survives a dropped
// connection. Assert against that boundary rather than against API.put.
vi.mock('../services/offlineSyncService', () => {
  const queueReview = vi.fn();
  return {
    default: { queueReview },
    offlineSyncService: { queueReview },
  };
});

const queuedReview = () => offlineSyncService.queueReview;

const sampleCards = [
  { id: 'c1', front: 'What is React?', back: 'A UI library', interval: 1, repetitions: 0, efactor: 2.5 },
  { id: 'c2', front: 'What is Redux?', back: 'A state container', interval: 1, repetitions: 0, efactor: 2.5 },
  { id: 'c3', front: 'What is JSX?', back: 'HTML-like syntax', interval: 1, repetitions: 0, efactor: 2.5 },
];

const renderReview = () =>
  render(
    <MemoryRouter initialEntries={['/flashcards/review']}>
      <FlashcardReview />
    </MemoryRouter>
  );

const flipCurrentCard = async (frontText) => {
  fireEvent.click(await screen.findByText(frontText));
};

describe('FlashcardReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();

    // jsdom ships neither Web Speech API, so the hands-free controls stay
    // hidden unless both are stubbed before the component mounts —
    // useVoiceControl captures window.speechSynthesis in a ref on first render.
    window.SpeechRecognition = function SpeechRecognitionStub() {
      this.start = vi.fn();
      this.stop = vi.fn();
      this.abort = vi.fn();
      this.continuous = false;
      this.interimResults = false;
      this.lang = '';
    };
    window.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };
    window.SpeechSynthesisUtterance = function SpeechSynthesisUtteranceStub(text) {
      this.text = text;
      this.rate = 1;
      this.lang = '';
    };

    API.get.mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          data: {
            success: true,
            user: {
              sm2EasyFactorModifier: 1.0,
              sm2IntervalModifier: 1.0,
              sm2Step1Interval: 1,
              sm2Step2Interval: 6,
            }
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
  });

  test('shows hands-free voice controls when browser speech APIs are supported', async () => {
  API.get.mockResolvedValue({ data: { data: sampleCards } });

  renderReview();

  expect(
    await screen.findByRole('button', {
      name: /enable hands-free mode/i,
    })
  ).toBeInTheDocument();
});

test('allows speech speed and language controls when hands-free mode is enabled', async () => {
  API.get.mockResolvedValue({ data: { data: sampleCards } });

  renderReview();

  const toggle = await screen.findByRole('button', {
    name: /enable hands-free mode/i,
  });

  fireEvent.click(toggle);

  expect(
    await screen.findByLabelText(/speech speed/i)
  ).toBeInTheDocument();

  expect(
    screen.getByLabelText(/speech language/i)
  ).toBeInTheDocument();
});
  test('shows loading state while fetching due cards', () => {
    API.get.mockReturnValue(new Promise(() => {}));
    renderReview();
    expect(screen.getByText(/Loading your review queue/)).toBeInTheDocument();
  });

  test('shows error message when fetching due cards fails', async () => {
    API.get.mockRejectedValue(new Error('network error'));
    renderReview();
    expect(
      await screen.findByText('Failed to fetch due flashcards and no offline cache available.')
    ).toBeInTheDocument();
  });

  test('renders the first due card after loading', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    expect(await screen.findByText('What is React?')).toBeInTheDocument();
  });

  test('queues each rating for sync and advances to the next card', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockResolvedValue({ synced: 1, failed: 0 });

    renderReview();
    await flipCurrentCard('What is React?');
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    await waitFor(() => {
      expect(queuedReview()).toHaveBeenCalledWith('c1', 4);
    });
    expect(await screen.findByText('What is Redux?')).toBeInTheDocument();
  });

  test('does not advance to the next card when the rating fails to save', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockRejectedValue(new Error('network error'));

    renderReview();
    await flipCurrentCard('What is React?');
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    expect(await screen.findByText(/Could not save this rating/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    // Retry and backoff moved into offlineSyncService, so the page makes a
    // single call and lets the service decide how hard to try.
    expect(queuedReview()).toHaveBeenCalledTimes(1);
  });

  test('keeps a dismissed save error but stays on the current card', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockRejectedValue(new Error('network error'));

    renderReview();
    await flipCurrentCard('What is React?');
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    const dismissBtn = await screen.findByRole('button', { name: /dismiss/i }, { timeout: 4000 });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Could not save this rating/)).not.toBeInTheDocument();
    });
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });

  test('persists a session checkpoint after each rating', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockResolvedValue({ synced: 1, failed: 0 });

    renderReview();
    await flipCurrentCard('What is React?');
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    await waitFor(() => {
      const parsed = JSON.parse(sessionStorage.getItem('flashcardReviewSession'));
      expect(parsed.currentIndex).toBe(1);
      expect(parsed.cards).toHaveLength(3);
      expect(parsed.sessionStats.reviewed).toBe(1);
      expect(parsed.sessionStats.mastered).toBe(1);
    });
  });

  test('restores an in-progress session on mount without refetching', async () => {
    sessionStorage.setItem(
      'flashcardReviewSession',
      JSON.stringify({
        cards: sampleCards,
        currentIndex: 1,
        sessionStats: { reviewed: 1, mastered: 1, hard: 0 },
        savedAt: Date.now(),
      })
    );

    renderReview();
    expect(await screen.findByText('What is Redux?')).toBeInTheDocument();
    expect(API.get).not.toHaveBeenCalledWith(expect.stringContaining('/flashcards'));
  });

  test('clears the saved session once the queue is complete', async () => {
    sessionStorage.setItem(
      'flashcardReviewSession',
      JSON.stringify({
        cards: sampleCards,
        currentIndex: 2,
        sessionStats: { reviewed: 2, mastered: 2, hard: 0 },
        savedAt: Date.now(),
      })
    );
    queuedReview().mockResolvedValue({ synced: 1, failed: 0 });

    renderReview();
    await flipCurrentCard('What is JSX?');
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    expect(await screen.findByText('Session Complete')).toBeInTheDocument();
    expect(sessionStorage.getItem('flashcardReviewSession')).toBeNull();
  });

  test('Exit Session clears the saved checkpoint before navigating away', async () => {
    sessionStorage.setItem(
      'flashcardReviewSession',
      JSON.stringify({
        cards: sampleCards,
        currentIndex: 1,
        sessionStats: { reviewed: 1, mastered: 0, hard: 0 },
        savedAt: Date.now(),
      })
    );

    renderReview();
    await screen.findByText('What is Redux?');
    fireEvent.click(screen.getByRole('button', { name: /Exit Session/i }));

    expect(sessionStorage.getItem('flashcardReviewSession')).toBeNull();
  });

  test('supports flipping and rating via keyboard', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockResolvedValue({ synced: 1, failed: 0 });

    renderReview();
    await screen.findByText('What is React?');

    fireEvent.keyDown(window, { key: ' ' });
    fireEvent.keyDown(window, { key: '3' });

    await waitFor(() => {
      expect(queuedReview()).toHaveBeenCalledWith('c1', 4);
    });
    expect(await screen.findByText('What is Redux?')).toBeInTheDocument();
  });

  test('disables rating buttons and ignores rapid clicks while a review is pending', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });

    // Keep the queued review pending so we can observe the in-flight state.
    let resolvePut;
    queuedReview().mockImplementationOnce(() => new Promise((resolve) => { resolvePut = resolve; }));

    renderReview();
    await screen.findByText('What is React?');

    // Flip the card and start a review that stays pending.
    fireEvent.keyDown(window, { key: ' ' });
    const goodButton = screen.getByRole('button', { name: /^Good / });
    fireEvent.click(goodButton);

    // Rating buttons are disabled while the request is pending...
    await waitFor(() => expect(goodButton).toBeDisabled());

    // ...so rapid keyboard input is debounced and only one request fires.
    fireEvent.keyDown(window, { key: '4' });
    fireEvent.keyDown(window, { key: '5' });
    await waitFor(() => expect(queuedReview()).toHaveBeenCalledTimes(1));
    expect(queuedReview()).toHaveBeenCalledWith('c1', 4);

    // Resolving the request advances to the next card and re-enables buttons.
    resolvePut({ synced: 1, failed: 0 });
    expect(await screen.findByText('What is Redux?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Good / })).toBeEnabled();
  });

  test('toggles Keyboard Shortcuts Guide modal on ? keypress', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    await screen.findByText('What is React?');

    fireEvent.keyDown(window, { key: '?' });

    expect(await screen.findByText('Keyboard Shortcuts Guide')).toBeInTheDocument();
    expect(screen.getByText('Flip the flashcard')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByText('Keyboard Shortcuts Guide')).not.toBeInTheDocument();
    });
  });

  test('navigates next and previous cards using ArrowRight/N and ArrowLeft/P', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    await screen.findByText('What is React?');

    // ArrowRight / N to go to next card
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(await screen.findByText('What is Redux?')).toBeInTheDocument();

    // ArrowLeft / P to go back to previous card
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(await screen.findByText('What is React?')).toBeInTheDocument();
  });

  test('ignores keyboard shortcuts when user is typing inside an input element', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    await screen.findByText('What is React?');

    // The card itself renders both faces at all times and only rotates in CSS,
    // so flip state is not observable from the DOM. The shortcuts modal is —
    // it returns null while closed — which makes it the reliable probe for
    // whether a shortcut was handled or correctly suppressed.
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: '?' });
    expect(screen.queryByText('Flip the flashcard')).not.toBeInTheDocument();

    // With focus back outside the input the same key must take effect, so the
    // assertion above cannot pass just because the shortcut is broken.
    input.blur();
    document.body.removeChild(input);

    fireEvent.keyDown(window, { key: '?' });
    expect(await screen.findByText('Flip the flashcard')).toBeInTheDocument();
  });

  test('reverse mode shows the back as the prompt and ratings still work', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    queuedReview().mockResolvedValue({ synced: 1, failed: 0 });

    renderReview();
    expect(await screen.findByText('What is React?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Reverse' }));

    const prompt = await screen.findByText('A UI library');
    expect(prompt.closest('.backface-hidden')).toHaveTextContent('Question');
    fireEvent.click(prompt);
    fireEvent.click(screen.getByRole('button', { name: /^Good / }));

    await waitFor(() => {
      expect(queuedReview()).toHaveBeenCalledWith('c1', 4);
    });
  });

  test('R key toggles reverse mode', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    await screen.findByText('What is React?');

    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('radio', { name: 'Reverse' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.keyDown(window, { key: 'r' });
    expect(screen.getByRole('radio', { name: 'Standard' })).toHaveAttribute('aria-checked', 'true');
  });

  test('shuffle keeps the current card and all cards', async () => {
    API.get.mockResolvedValue({ data: { data: sampleCards } });
    renderReview();
    await screen.findByText('What is React?');

    fireEvent.click(screen.getByRole('button', { name: /shuffle/i }));
    expect(screen.getByText('What is React?')).toBeInTheDocument();
  });
});
