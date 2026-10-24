/**
 * @fileoverview Retention forecast endpoints (forgetting curve simulator and
 * deck retention heatmap). Handlers are built by a factory so tests can inject
 * the card loaders instead of hitting the database.
 */
const retentionForecast = require('../services/retentionForecastService');

const CARD_ATTRIBUTES = [
  'id',
  'front',
  'interval',
  'repetitions',
  'efactor',
  'nextReviewDate',
  'deckId',
];

/** Default loaders, required lazily so tests never touch Sequelize. */
function defaultLoaders() {
  const { Flashcard, FlashcardDeck } = require('../models');
  return {
    /** Returns the deck's cards, or null when the deck is not the user's. */
    async loadDeckCards(userId, deckId) {
      const deck = await FlashcardDeck.findOne({ where: { id: deckId, user: userId } });
      if (!deck) return null;
      return Flashcard.findAll({
        where: { user: userId, deckId },
        attributes: CARD_ATTRIBUTES,
        raw: true,
      });
    },
    /** Returns [{ id, name, cards }] for every deck of the user. */
    async loadUserDecks(userId) {
      const [decks, cards] = await Promise.all([
        FlashcardDeck.findAll({ where: { user: userId }, attributes: ['id', 'name'], raw: true }),
        Flashcard.findAll({ where: { user: userId }, attributes: CARD_ATTRIBUTES, raw: true }),
      ]);
      const groups = decks.map((d) => ({ id: d.id, name: d.name, cards: [] }));
      const byId = new Map(groups.map((g) => [g.id, g]));
      const ungrouped = { id: null, name: 'No deck', cards: [] };
      for (const card of cards) {
        (byId.get(card.deckId) || ungrouped).cards.push(card);
      }
      if (ungrouped.cards.length) groups.push(ungrouped);
      return groups.filter((g) => g.cards.length > 0);
    },
  };
}

function createRetentionHandlers(loaders) {
  const resolve = () => loaders || defaultLoaders();

  return {
    /**
     * @route GET /api/flashcards/deck/:id/retention-curve?daysDelay=3
     * @access Protected
     */
    async getDeckRetentionCurve(req, res, next) {
      try {
        const cards = await resolve().loadDeckCards(req.user.id, req.params.id);
        if (cards === null) {
          return res.status(404).json({ success: false, message: 'Deck not found' });
        }
        const daysDelay = req.query.daysDelay === undefined ? 3 : Number(req.query.daysDelay);
        if (!Number.isFinite(daysDelay) || daysDelay < 0 || daysDelay > 30) {
          return res
            .status(400)
            .json({ success: false, message: 'daysDelay must be a number between 0 and 30' });
        }
        return res.status(200).json({
          success: true,
          data: retentionForecast.buildDeckForecast(cards, { daysDelay }),
        });
      } catch (error) {
        return next(error);
      }
    },

    /**
     * @route GET /api/flashcards/analytics/retention-heatmap
     * @access Protected
     */
    async getRetentionHeatmap(req, res, next) {
      try {
        const decks = await resolve().loadUserDecks(req.user.id);
        return res.status(200).json({
          success: true,
          data: retentionForecast.buildRetentionHeatmap(decks),
        });
      } catch (error) {
        return next(error);
      }
    },
  };
}

module.exports = { createRetentionHandlers, ...createRetentionHandlers() };
