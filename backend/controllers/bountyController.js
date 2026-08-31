const { BountyQuestion, BountyAnswer, User, Subject } = require('../models');
const bountyEscrowService = require('../services/bountyEscrowService');
const { Op } = require('sequelize');

/**
 * GET /api/bounties
 * Retrieve a list of active bounties with optional subject filtering.
 */
async function getBounties(req, res, next) {
  try {
    const { subjectId, filter } = req.query;
    const whereClause = {
      status: 'OPEN',
      expirationDate: { [Op.gt]: new Date() },
    };

    if (subjectId) {
      whereClause.subjectId = subjectId;
    }

    let order = [['createdAt', 'DESC']];

    if (filter === 'highest_bounty') {
      order = [['bountyXp', 'DESC']];
    } else if (filter === 'expiring_soon') {
      order = [['expirationDate', 'ASC']];
    }

    // Unanswered filter condition (we will fetch all open bounties first, then filter if requested)
    const questions = await BountyQuestion.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'avatar'] },
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        { model: BountyAnswer, as: 'answers', attributes: ['id'] },
      ],
      order,
    });

    let result = questions;
    if (filter === 'unanswered') {
      result = questions.filter((q) => !q.answers || q.answers.length === 0);
    }

    res.status(200).json({ success: true, bounties: result });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bounties/:id
 * Retrieve details of a specific bounty, including all solutions (sorted).
 */
async function getBountyDetails(req, res, next) {
  try {
    const { id } = req.params;

    const question = await BountyQuestion.findByPk(id, {
      include: [
        { model: User, as: 'creator', attributes: ['id', 'name', 'avatar'] },
        { model: Subject, as: 'subjectRef', attributes: ['id', 'name'] },
        {
          model: BountyAnswer,
          as: 'answers',
          include: [{ model: User, as: 'author', attributes: ['id', 'name', 'avatar'] }],
        },
      ],
    });

    if (!question) {
      return res.status(404).json({ success: false, error: 'Bounty question not found' });
    }

    // Sort solutions: Accepted first, then highest upvotes, then oldest
    if (question.answers) {
      question.answers.sort((a, b) => {
        if (a.isAccepted && !b.isAccepted) return -1;
        if (!a.isAccepted && b.isAccepted) return 1;
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    }

    res.status(200).json({ success: true, bounty: question });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bounties
 * Create a new bounty question and deduct offering XP to escrow.
 */
async function createBounty(req, res, next) {
  try {
    const { title, problemText, diagramUrl, bountyXp, expirationDate, subjectId } = req.body;

    if (!title || !problemText || !bountyXp || !expirationDate) {
      return res.status(400).json({ success: false, error: 'Title, problem text, bounty XP, and expiration date are required' });
    }

    const question = await bountyEscrowService.createBountyQuestion(req.user.id, {
      title,
      problemText,
      diagramUrl,
      bountyXp,
      expirationDate,
      subjectId,
    });

    res.status(201).json({ success: true, bounty: question });
  } catch (err) {
    if (err.message.includes('Insufficient XP')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/bounties/:id/answers
 * Submit a peer solution for an active bounty.
 */
async function submitSolution(req, res, next) {
  try {
    const { id } = req.params;
    const { answerText } = req.body;

    if (!answerText) {
      return res.status(400).json({ success: false, error: 'Answer text is required' });
    }

    const question = await BountyQuestion.findByPk(id);
    if (!question) {
      return res.status(404).json({ success: false, error: 'Bounty question not found' });
    }

    if (question.status !== 'OPEN') {
      return res.status(400).json({ success: false, error: 'This bounty is no longer open for solutions' });
    }

    const answer = await BountyAnswer.create({
      answerText,
      questionId: id,
      userId: req.user.id,
    });

    res.status(201).json({ success: true, answer });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/bounties/:id/accept/:answerId
 * Accept solution, close bounty, and award escrowed XP.
 */
async function acceptSolution(req, res, next) {
  try {
    const { id, answerId } = req.params;

    const result = await bountyEscrowService.acceptBountyAnswer(req.user.id, id, answerId);
    res.status(200).json({ success: true, message: 'Solution accepted successfully', ...result });
  } catch (err) {
    if (err.message.includes('Only the author') || err.message.includes('You cannot accept your own')) {
      return res.status(403).json({ success: false, error: err.message });
    }
    if (err.message.includes('not found') || err.message.includes('already solved')) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/bounties/answers/:answerId/vote
 * Upvote or downvote a solution.
 */
async function voteSolution(req, res, next) {
  try {
    const { answerId } = req.params;
    const { voteType } = req.body; // 'upvote' or 'downvote'

    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ success: false, error: 'Invalid vote type' });
    }

    const answer = await bountyEscrowService.voteAnswer(req.user.id, answerId, voteType);
    res.status(200).json({ success: true, answer });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getBounties,
  getBountyDetails,
  createBounty,
  submitSolution,
  acceptSolution,
  voteSolution,
};
