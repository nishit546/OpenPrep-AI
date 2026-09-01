/**
 * @fileoverview Marketplace Controller for handling flashcard deck browsing,
 * searching, forking/cloning with lineage tracking, and Bayesian rating/reviews.
 */

const { Op } = require('sequelize');
const { DeckMarketplace, DeckReview } = require('../models/DeckMarketplace');
const { Flashcard, User } = require('../models');

// Bayesian Average Constants (Prior Weight & Prior Mean)
const BAYESIAN_PRIOR_COUNT = 5;
const BAYESIAN_PRIOR_MEAN = 3.5;

/**
 * Calculates updated Bayesian average rating.
 * Formula: ( (C * m) + sum(ratings) ) / (C + n)
 * Where C = BAYESIAN_PRIOR_COUNT, m = BAYESIAN_PRIOR_MEAN, n = total ratings count.
 */
function calculateBayesianRating(totalRatings, sumRatings) {
  return (BAYESIAN_PRIOR_COUNT * BAYESIAN_PRIOR_MEAN + sumRatings) / (BAYESIAN_PRIOR_COUNT + totalRatings);
}

/**
 * GET /api/marketplace/decks
 * Search, filter, and paginate public community decks.
 */
const getPublicDecks = async (req, res) => {
  try {
    const {
      search,
      examTag,
      subject,
      sortBy = 'popular',
      page = 1,
      limit = 12,
    } = req.query;

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const whereConditions = { is_public: true };

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (subject) {
      whereConditions.subject = { [Op.iLike]: subject };
    }

    if (examTag) {
      whereConditions.exam_tags = { [Op.contains]: [examTag] };
    }

    let order = [['createdAt', 'DESC']];
    if (sortBy === 'popular') {
      order = [['downloads_count', 'DESC'], ['fork_count', 'DESC']];
    } else if (sortBy === 'rating') {
      order = [['average_rating', 'DESC']];
    } else if (sortBy === 'trending') {
      order = [['fork_count', 'DESC'], ['createdAt', 'DESC']];
    }

    const { count, rows: decks } = await DeckMarketplace.findAndCountAll({
      where: whereConditions,
      order,
      limit: parseInt(limit, 10),
      offset,
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar_url', 'is_verified_educator'],
        },
      ],
    });

    return res.status(200).json({
      success: true,
      total: count,
      page: parseInt(page, 10),
      totalPages: Math.ceil(count / limit),
      decks,
    });
  } catch (error) {
    console.error('[MarketplaceController] Error fetching decks:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve marketplace decks.' });
  }
};

/**
 * POST /api/marketplace/decks/:id/fork
 * Clones a public marketplace deck and its flashcards into the requester's library
 * while preserving lineage tracking to the original author.
 */
const forkDeck = async (req, res) => {
  try {
    const { id: deckId } = req.params;
    const userId = req.user.id;

    const sourceDeck = await DeckMarketplace.findByPk(deckId);
    if (!sourceDeck || !sourceDeck.is_public) {
      return res.status(404).json({ success: false, message: 'Marketplace deck not found or is private.' });
    }

    // Duplicate deck model for target user with lineage tracking
    const clonedDeck = await DeckMarketplace.create({
      title: `${sourceDeck.title} (Forked)`,
      description: sourceDeck.description,
      author_id: userId,
      is_public: false,
      forked_from_deck_id: sourceDeck.id,
      exam_tags: sourceDeck.exam_tags,
      subject: sourceDeck.subject,
      card_count: sourceDeck.card_count,
    });

    // Copy flashcards associated with source deck
    const originalCards = await Flashcard.findAll({ where: { deck_id: sourceDeck.id } });
    if (originalCards.length > 0) {
      const clonedCards = originalCards.map((card) => ({
        user_id: userId,
        deck_id: clonedDeck.id,
        front: card.front,
        back: card.back,
        tags: card.tags,
      }));
      await Flashcard.bulkCreate(clonedCards);
    }

    // Increment fork and download counters on original deck
    await sourceDeck.increment(['fork_count', 'downloads_count'], { by: 1 });

    return res.status(201).json({
      success: true,
      message: 'Deck successfully forked to your personal library.',
      deck: clonedDeck,
    });
  } catch (error) {
    console.error('[MarketplaceController] Error forking deck:', error);
    return res.status(500).json({ success: false, message: 'Failed to fork deck.' });
  }
};

/**
 * POST /api/marketplace/decks/:id/review
 * Submits or updates a 1-5 star rating & review, recalculating the Bayesian score.
 */
const reviewDeck = async (req, res) => {
  try {
    const { id: deckId } = req.params;
    const userId = req.user.id;
    const { rating, review_text } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const deck = await DeckMarketplace.findByPk(deckId);
    if (!deck) {
      return res.status(404).json({ success: false, message: 'Deck not found.' });
    }

    // Upsert review record
    const [review, created] = await DeckReview.findOrCreate({
      where: { deck_id: deckId, user_id: userId },
      defaults: { rating, review_text },
    });

    if (!created) {
      review.rating = rating;
      review.review_text = review_text;
      await review.save();
    }

    // Recalculate Bayesian Average Score
    const allReviews = await DeckReview.findAll({ where: { deck_id: deckId } });
    const ratingCount = allReviews.length;
    const ratingSum = allReviews.reduce((acc, r) => acc + r.rating, 0);
    const newAverageRating = calculateBayesianRating(ratingCount, ratingSum);

    deck.rating_count = ratingCount;
    deck.average_rating = parseFloat(newAverageRating.toFixed(2));
    await deck.save();

    return res.status(200).json({
      success: true,
      message: 'Review submitted successfully.',
      review,
      average_rating: deck.average_rating,
    });
  } catch (error) {
    console.error('[MarketplaceController] Error reviewing deck:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
};

module.exports = {
  getPublicDecks,
  forkDeck,
  reviewDeck,
};
