const { sequelize, User, BountyQuestion, BountyAnswer } = require('../models');

/**
 * Handle XP escrow and creation of a new bounty question.
 */
async function createBountyQuestion(userId, { title, problemText, diagramUrl, bountyXp, expirationDate, subjectId }) {
  return await sequelize.transaction(async (transaction) => {
    // 1. Fetch user with update lock to avoid race conditions
    const user = await User.findByPk(userId, { 
      transaction, 
      lock: transaction.LOCK.UPDATE 
    });

    if (!user) {
      throw new Error('User not found');
    }

    const xpAmount = parseInt(bountyXp, 10);
    if (isNaN(xpAmount) || xpAmount <= 0) {
      throw new Error('Invalid bounty XP amount');
    }

    // 2. Validate user has enough XP
    if (user.xp < xpAmount) {
      throw new Error(`Insufficient XP. You need ${xpAmount} XP, but only have ${user.xp} XP.`);
    }

    // 3. Deduct XP from user balance (escrow)
    user.xp -= xpAmount;
    await user.save({ transaction });

    // 4. Create the bounty question
    const question = await BountyQuestion.create({
      title,
      problemText,
      diagramUrl,
      bountyXp: xpAmount,
      expirationDate: new Date(expirationDate),
      status: 'OPEN',
      userId,
      subjectId,
    }, { transaction });

    return question;
  });
}

/**
 * Accept a peer solution, mark the question solved, and disburse escrowed XP.
 */
async function acceptBountyAnswer(userId, questionId, answerId) {
  return await sequelize.transaction(async (transaction) => {
    // 1. Fetch question with update lock
    const question = await BountyQuestion.findByPk(questionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!question) {
      throw new Error('Bounty question not found');
    }

    // Verify ownership
    if (question.userId !== userId) {
      throw new Error('Only the author of the question can accept a solution');
    }

    // Verify status
    if (question.status !== 'OPEN') {
      throw new Error(`This bounty is already ${question.status.toLowerCase()}`);
    }

    // 2. Fetch answer
    const answer = await BountyAnswer.findByPk(answerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!answer || answer.questionId !== questionId) {
      throw new Error('Peer solution not found for this question');
    }

    // Prevent cheating / self-payouts
    if (answer.userId === userId) {
      throw new Error('You cannot accept your own solution');
    }

    // 3. Update status of question and answer
    question.status = 'SOLVED';
    await question.save({ transaction });

    answer.isAccepted = true;
    await answer.save({ transaction });

    // 4. Award escrowed XP to solution author
    const recipient = await User.findByPk(answer.userId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (recipient) {
      recipient.xp += question.bountyXp;
      await recipient.save({ transaction });
    }

    return { question, answer };
  });
}

/**
 * Handle upvoting reputation algorithm:
 * - Toggles upvotes and downvotes.
 * - Flags downvoted spam (if downvotes > upvotes + 3, or downvotes exceeds 5).
 */
async function voteAnswer(userId, answerId, voteType) {
  return await sequelize.transaction(async (transaction) => {
    const answer = await BountyAnswer.findByPk(answerId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!answer) {
      throw new Error('Answer not found');
    }

    let upvoted = Array.isArray(answer.upvotedUserIds) ? [...answer.upvotedUserIds] : [];
    let downvoted = Array.isArray(answer.downvotedUserIds) ? [...answer.downvotedUserIds] : [];

    const hasUpvoted = upvoted.includes(userId);
    const hasDownvoted = downvoted.includes(userId);

    if (voteType === 'upvote') {
      if (hasUpvoted) {
        // Toggle off
        upvoted = upvoted.filter((id) => id !== userId);
      } else {
        upvoted.push(userId);
        if (hasDownvoted) {
          downvoted = downvoted.filter((id) => id !== userId);
        }
      }
    } else if (voteType === 'downvote') {
      if (hasDownvoted) {
        // Toggle off
        downvoted = downvoted.filter((id) => id !== userId);
      } else {
        downvoted.push(userId);
        if (hasUpvoted) {
          upvoted = upvoted.filter((id) => id !== userId);
        }
      }
    }

    answer.upvotedUserIds = upvoted;
    answer.downvotedUserIds = downvoted;
    answer.upvotes = upvoted.length;
    answer.downvotes = downvoted.length;

    // Automated spam flagging algorithm
    if (answer.downvotes > answer.upvotes + 3 || answer.downvotes >= 5) {
      answer.isFlagged = true;
    } else {
      answer.isFlagged = false;
    }

    await answer.save({ transaction });
    return answer;
  });
}

module.exports = {
  createBountyQuestion,
  acceptBountyAnswer,
  voteAnswer,
};
