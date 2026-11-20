const { validateGeneratedQuiz } = require('../../services/generatedQuizContract');

const question = (text = 'Which value is prime?') => ({
  questionText: text,
  options: ['Two', 'Four', 'Six', 'Eight'],
  correctAnswer: 0,
  explanation: 'Two has no positive divisors beyond one and itself.',
});

describe('generated quiz contract', () => {
  it('accepts a complete MCQ quiz', () => {
    expect(validateGeneratedQuiz({ title: 'Prime numbers', questions: [question()] }, 1)).toEqual({ valid: true, version: 1 });
  });

  it.each([
    [{ title: 'Prime numbers', questions: [] }, 1],
    [{ title: 'Prime numbers', questions: [question()] }, 2],
    [{ title: 'Prime numbers', questions: [question(), question()] }, 2],
    [{ title: 'Prime numbers', questions: [{ ...question(), correctAnswer: 4 }] }, 1],
    [{ title: 'Prime numbers', questions: [{ ...question(), options: ['Two', 'two', 'Six', 'Eight'] }] }, 1],
    [{ title: 'Prime numbers', questions: [{ ...question(), explanation: '' }] }, 1],
  ])('rejects incomplete or unsafe MCQ content', (quiz, count) => {
    expect(validateGeneratedQuiz(quiz, count).valid).toBe(false);
  });

  it('validates a subjective rubric and score', () => {
    const subjective = {
      questionType: 'SUBJECTIVE', questionText: 'Explain photosynthesis.',
      idealAnswer: 'Plants convert light energy to chemical energy.', maxScore: 10,
      rubricCriteria: [{ category: 'Accuracy', description: 'Correct mechanism', maxPoints: 10 }],
      explanation: 'A complete answer describes light, carbon dioxide, water, and glucose.',
    };
    expect(validateGeneratedQuiz({ title: 'Biology', questions: [subjective] }, 1, 'SUBJECTIVE').valid).toBe(true);
    expect(validateGeneratedQuiz({ title: 'Biology', questions: [{ ...subjective, maxScore: 8 }] }, 1, 'SUBJECTIVE').valid).toBe(false);
  });
});
