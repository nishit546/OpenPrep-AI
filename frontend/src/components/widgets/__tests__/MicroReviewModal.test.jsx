import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MicroReviewModal from '../MicroReviewModal';
import * as api from '../../../services/api';

vi.mock('../../../services/api', () => ({
  getNextDueMicroCard: vi.fn(),
  submitMicroAnswer: vi.fn(),
}));

vi.mock('../../../services/microScheduleWorker', () => ({
  getMicroSettings: vi.fn().mockReturnValue({ autoDismissSeconds: 5 }),
  saveMicroSettings: vi.fn(),
  isQuietHour: vi.fn().mockReturnValue(false),
}));

describe('MicroReviewModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnItemAnswered = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <MicroReviewModal isOpen={false} onClose={mockOnClose} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders question and handles multiple choice selection', async () => {
    api.getNextDueMicroCard.mockResolvedValue({
      data: {
        success: true,
        type: 'question',
        item: {
          id: 'q-1',
          question: 'What is the powerhouse of the cell?',
          options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi apparatus'],
          answer: 'Mitochondria',
          subject: 'Biology',
        },
      },
    });

    api.submitMicroAnswer.mockResolvedValue({
      data: {
        success: true,
        xpEarned: 15,
        streak: 3,
      },
    });

    render(
      <MicroReviewModal
        isOpen={true}
        onClose={mockOnClose}
        onItemAnswered={mockOnItemAnswered}
      />
    );

    expect(await screen.findByText('What is the powerhouse of the cell?')).toBeInTheDocument();
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();

    const correctOptionBtn = screen.getByText('Mitochondria');
    fireEvent.click(correctOptionBtn);

    await waitFor(() => {
      expect(api.submitMicroAnswer).toHaveBeenCalledWith({
        itemId: 'q-1',
        itemType: 'question',
        selectedAnswer: 'Mitochondria',
        isCorrect: true,
        quality: 5,
      });
      expect(screen.getByText('Correct! +15 XP')).toBeInTheDocument();
    });
  });

  it('renders flashcard front, flips on click, and handles rating', async () => {
    api.getNextDueMicroCard.mockResolvedValue({
      data: {
        success: true,
        type: 'flashcard',
        item: {
          id: 'card-1',
          front: 'Define Photosynthesis',
          back: 'Process by which plants convert light energy to chemical energy',
          subject: 'Botany',
        },
      },
    });

    api.submitMicroAnswer.mockResolvedValue({
      data: {
        success: true,
        xpEarned: 15,
        streak: 4,
      },
    });

    render(
      <MicroReviewModal
        isOpen={true}
        onClose={mockOnClose}
        onItemAnswered={mockOnItemAnswered}
      />
    );

    expect(await screen.findByText('Define Photosynthesis')).toBeInTheDocument();
    const flipButton = screen.getByRole('button', { name: /flip to reveal answer/i });
    fireEvent.click(flipButton);

    expect(
      screen.getByText('Process by which plants convert light energy to chemical energy')
    ).toBeInTheDocument();

    const goodRatingBtn = screen.getByRole('button', { name: /good \(3\)/i });
    fireEvent.click(goodRatingBtn);

    await waitFor(() => {
      expect(api.submitMicroAnswer).toHaveBeenCalledWith({
        itemId: 'card-1',
        itemType: 'flashcard',
        quality: 3,
        isCorrect: true,
      });
    });
  });
});
