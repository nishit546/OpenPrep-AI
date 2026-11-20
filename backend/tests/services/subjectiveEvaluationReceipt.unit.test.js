const { issueReceipt, verifyReceipt } = require('../../services/subjectiveEvaluationReceipt');
const { submitQuizSchema } = require('../../middleware/validate');

describe('subjective quiz submission contract', () => {
  const context = {
    userId: 'student-1',
    quizId: 'quiz-1',
    questionId: 'question-1',
    answerText: 'Gradient descent reduces a loss by stepping opposite its gradient.',
    maxScore: 10,
  };
  const evaluation = { score: 7, maxScore: 10, feedback: 'Good explanation.' };
  let previousSecret;

  beforeEach(() => {
    previousSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'subjective-receipt-test-secret';
  });

  afterEach(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  });

  it('preserves a server-evaluated score through the validated submit payload', async () => {
    const token = issueReceipt({ ...context, evaluation });
    const parsed = await submitQuizSchema.parseAsync({
      answers: [{
        questionId: '00000000-0000-4000-8000-000000000001',
        selectedAnswer: { userAnswerText: context.answerText, evaluationReceipt: token },
      }],
    });

    expect(verifyReceipt({ ...context, token: parsed.answers[0].selectedAnswer.evaluationReceipt }))
      .toMatchObject({ score: 7, maxScore: 10, feedback: 'Good explanation.' });
  });

  it('rejects altered answers, another user, and another question', () => {
    const token = issueReceipt({ ...context, evaluation });

    expect(() => verifyReceipt({ ...context, token, answerText: 'Changed answer' })).toThrow();
    expect(() => verifyReceipt({ ...context, token, userId: 'student-2' })).toThrow();
    expect(() => verifyReceipt({ ...context, token, questionId: 'question-2' })).toThrow();
  });

  it('rejects out-of-range scores while allowing an unevaluated answer to receive zero points', async () => {
    expect(() => issueReceipt({ ...context, evaluation: { score: 11 } })).toThrow();
    const parsed = await submitQuizSchema.parseAsync({
      answers: [{
        questionId: '00000000-0000-4000-8000-000000000001',
        selectedAnswer: { userAnswerText: context.answerText },
      }],
    });
    expect(parsed.answers[0].selectedAnswer.evaluationReceipt).toBeUndefined();
  });
});
