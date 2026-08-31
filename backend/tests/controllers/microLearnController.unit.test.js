import { describe, it, expect, vi, beforeEach } from 'vitest';
const microLearnController = require('../../controllers/microLearnController');
const { Flashcard, Question, Progress, User } = require('../../models');
const gamificationService = require('../../services/gamificationService');

describe('microLearnController Unit Tests', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: { id: 'user-123', sm2EasyFactorModifier: 1.0, sm2IntervalModifier: 1.0 },
      body: {},
      headers: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    vi.clearAllMocks();
  });

  describe('getNextDueCard', () => {
    it('returns highest-priority due flashcard when one is overdue', async () => {
      const mockCard = {
        id: 'card-1',
        front: 'What is Mitochondria?',
        back: 'Powerhouse of the cell',
        interval: 1,
        repetitions: 2,
        efactor: 2.5,
        difficulty: 'Easy',
        subjectRef: { id: 'subj-1', name: 'Biology' },
        topicRef: { id: 'top-1', name: 'Cell Biology' },
      };

      vi.spyOn(Flashcard, 'findOne').mockResolvedValue(mockCard);

      await microLearnController.getNextDueCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'flashcard',
          item: expect.objectContaining({
            id: 'card-1',
            front: 'What is Mitochondria?',
            subject: 'Biology',
          }),
        })
      );
    });

    it('falls back to a question when no due flashcard exists', async () => {
      vi.spyOn(Flashcard, 'findOne').mockResolvedValue(null);
      vi.spyOn(Question, 'findOne').mockResolvedValue({
        id: 'q-1',
        question: 'What is 2 + 2?',
        answer: '4',
        options: ['1', '2', '3', '4'],
        type: 'multiple_choice',
        difficulty: 'easy',
        sourceTitle: 'Math Notes',
      });

      await microLearnController.getNextDueCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'question',
          item: expect.objectContaining({
            id: 'q-1',
            question: 'What is 2 + 2?',
            answer: '4',
          }),
        })
      );
    });

    it('returns default sample card if no cards or questions exist', async () => {
      vi.spyOn(Flashcard, 'findOne').mockResolvedValue(null);
      vi.spyOn(Question, 'findOne').mockResolvedValue(null);

      await microLearnController.getNextDueCard(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          type: 'sample',
          item: expect.objectContaining({
            id: 'sample-01',
            subject: 'Learning Science',
          }),
        })
      );
    });
  });

  describe('submitAnswer', () => {
    it('processes flashcard review, recalibrates SM-2, awards XP/coins and updates streak', async () => {
      const mockCard = {
        id: 'card-1',
        user: 'user-123',
        subject: 'subj-1',
        topic: 'top-1',
        interval: 1,
        repetitions: 1,
        efactor: 2.5,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Flashcard, 'findOne').mockResolvedValue(mockCard);
      vi.spyOn(Progress, 'findOrCreate').mockResolvedValue([{ flashcardsMastered: 2, save: vi.fn() }, true]);
      vi.spyOn(gamificationService, 'awardXP').mockResolvedValue({ success: true, xpGranted: 15 });
      vi.spyOn(gamificationService, 'awardCoins').mockResolvedValue({ success: true });
      vi.spyOn(gamificationService, 'updateStreak').mockResolvedValue({ streak: 5 });
      vi.spyOn(User, 'findByPk').mockResolvedValue({ id: 'user-123', xp: 500, streak: 5, prepCoins: 120 });

      req.body = {
        itemId: 'card-1',
        itemType: 'flashcard',
        quality: 4,
        isCorrect: true,
      };

      await microLearnController.submitAnswer(req, res, next);

      expect(mockCard.save).toHaveBeenCalled();
      expect(gamificationService.awardXP).toHaveBeenCalledWith('user-123', 15, 'micro_learning_quick_review');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          xpEarned: 15,
          coinsEarned: 5,
          currentXp: 500,
          streak: 5,
        })
      );
    });
  });
});
