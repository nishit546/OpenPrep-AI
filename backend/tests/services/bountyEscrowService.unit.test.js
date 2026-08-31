const { createBountyQuestion, acceptBountyAnswer, voteAnswer } = require('../../services/bountyEscrowService');
const { User, BountyQuestion, BountyAnswer } = require('../../models');

describe('Bounty Escrow Service Unit Tests', () => {
  let testUser1;
  let testUser2;
  let testSubject;

  beforeAll(async () => {
    // Setup test users with some XP
    testUser1 = await User.create({
      name: 'Bounty Poster',
      email: 'poster@example.com',
      password: 'StrongPass1!',
      xp: 250,
    });

    testUser2 = await User.create({
      name: 'Bounty Solver',
      email: 'solver@example.com',
      password: 'StrongPass1!',
      xp: 10,
    });
  });

  afterAll(async () => {
    await testUser1.destroy();
    await testUser2.destroy();
  });

  describe('createBountyQuestion', () => {
    it('successfully deducts XP from creator and creates bounty question in OPEN status', async () => {
      const question = await createBountyQuestion(testUser1.id, {
        title: 'Quantum Computing Proof',
        problemText: 'Prove that $H^2 = I$',
        bountyXp: 100,
        expirationDate: new Date(Date.now() + 86400000),
      });

      expect(question.id).toBeDefined();
      expect(question.status).toBe('OPEN');
      expect(question.bountyXp).toBe(100);

      // Reload user and verify XP deducted
      await testUser1.reload();
      expect(testUser1.xp).toBe(150); // 250 - 100

      // Cleanup
      await question.destroy();
    });

    it('throws an error if creator has insufficient XP balance', async () => {
      await expect(
        createBountyQuestion(testUser1.id, {
          title: 'Too Expensive Proof',
          problemText: 'Need answer fast',
          bountyXp: 9999,
          expirationDate: new Date(Date.now() + 86400000),
        })
      ).rejects.toThrow(/Insufficient XP/);
    });
  });

  describe('acceptBountyAnswer', () => {
    let question;
    let answer;

    beforeEach(async () => {
      // Refresh XP
      await testUser1.update({ xp: 200 });
      await testUser2.update({ xp: 10 });

      question = await createBountyQuestion(testUser1.id, {
        title: 'Math Question',
        problemText: 'Solve $x+2=4$',
        bountyXp: 80,
        expirationDate: new Date(Date.now() + 86400000),
      });

      answer = await BountyAnswer.create({
        answerText: 'The solution is $x=2$',
        questionId: question.id,
        userId: testUser2.id,
      });
    });

    afterEach(async () => {
      await answer.destroy();
      await question.destroy();
    });

    it('awards bounty XP to answerer and marks bounty solved when accepted', async () => {
      await acceptBountyAnswer(testUser1.id, question.id, answer.id);

      await question.reload();
      await answer.reload();
      await testUser2.reload();

      expect(question.status).toBe('SOLVED');
      expect(answer.isAccepted).toBe(true);
      expect(testUser2.xp).toBe(90); // 10 + 80
    });

    it('prevents non-authors from accepting answers', async () => {
      await expect(
        acceptBountyAnswer(testUser2.id, question.id, answer.id)
      ).rejects.toThrow(/Only the author/);
    });

    it('prevents self-answering payouts', async () => {
      const selfAnswer = await BountyAnswer.create({
        answerText: 'I solved it myself',
        questionId: question.id,
        userId: testUser1.id,
      });

      await expect(
        acceptBountyAnswer(testUser1.id, question.id, selfAnswer.id)
      ).rejects.toThrow(/cannot accept your own/);

      await selfAnswer.destroy();
    });
  });

  describe('voteAnswer', () => {
    let question;
    let answer;

    beforeEach(async () => {
      question = await BountyQuestion.create({
        title: 'Quick Q',
        problemText: 'Solve',
        bountyXp: 10,
        expirationDate: new Date(),
        userId: testUser1.id,
      });

      answer = await BountyAnswer.create({
        answerText: 'Short answer text',
        questionId: question.id,
        userId: testUser2.id,
      });
    });

    afterEach(async () => {
      await answer.destroy();
      await question.destroy();
    });

    it('toggles upvote lists correctly and updates upvotes counter', async () => {
      await voteAnswer('user_A', answer.id, 'upvote');
      await answer.reload();
      expect(answer.upvotes).toBe(1);
      expect(answer.upvotedUserIds).toContain('user_A');

      // Toggle off
      await voteAnswer('user_A', answer.id, 'upvote');
      await answer.reload();
      expect(answer.upvotes).toBe(0);
      expect(answer.upvotedUserIds).not.toContain('user_A');
    });

    it('auto-flags spam answers if downvotes exceed threshold', async () => {
      // Perform 5 downvotes from mock users
      await voteAnswer('user_A', answer.id, 'downvote');
      await voteAnswer('user_B', answer.id, 'downvote');
      await voteAnswer('user_C', answer.id, 'downvote');
      await voteAnswer('user_D', answer.id, 'downvote');
      await voteAnswer('user_E', answer.id, 'downvote');

      await answer.reload();
      expect(answer.downvotes).toBe(5);
      expect(answer.isFlagged).toBe(true);
    });
  });
});
