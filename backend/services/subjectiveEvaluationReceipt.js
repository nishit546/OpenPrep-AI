const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AUDIENCE = 'subjective-quiz-attempt';

function answerHash(answerText) {
  return crypto.createHash('sha256').update(answerText, 'utf8').digest('hex');
}

function validateEvaluation(evaluation, maxScore) {
  const score = Number(evaluation?.score);
  if (!Number.isFinite(maxScore) || maxScore <= 0 || !Number.isFinite(score) || score < 0 || score > maxScore) {
    throw new Error('Invalid subjective evaluation score');
  }
  return { ...evaluation, score, maxScore };
}

function issueReceipt({ userId, quizId, questionId, answerText, evaluation, maxScore }) {
  const trustedEvaluation = validateEvaluation(evaluation, maxScore);
  return jwt.sign(
    {
      quizId,
      questionId,
      answerHash: answerHash(answerText),
      evaluation: trustedEvaluation,
    },
    process.env.JWT_SECRET,
    { subject: String(userId), audience: AUDIENCE, expiresIn: '2h' }
  );
}

function verifyReceipt({ token, userId, quizId, questionId, answerText, maxScore }) {
  const payload = jwt.verify(token, process.env.JWT_SECRET, { audience: AUDIENCE });
  if (
    payload.sub !== String(userId) ||
    payload.quizId !== String(quizId) ||
    payload.questionId !== String(questionId) ||
    payload.answerHash !== answerHash(answerText) ||
    Number(payload.evaluation?.maxScore) !== maxScore
  ) {
    throw new Error('Subjective evaluation does not match the submitted answer');
  }
  return validateEvaluation(payload.evaluation, maxScore);
}

module.exports = { issueReceipt, verifyReceipt };
