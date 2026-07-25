const { v4: uuidv4 } = require('uuid');
const { validateSubmitQuizAttempt } = require('../../middleware/validators');

const VALID_UUID = uuidv4();

function runValidators(validators, body) {
  return new Promise((resolve) => {
    const req = { body };
    const res = {
      code: null,
      data: null,
      status(c) { this.code = c; return this; },
      json(d) { this.data = d; },
    };

    let idx = 0;
    function next() {
      if (idx >= validators.length || res.code !== null) {
        resolve(res);
        return;
      }
      validators[idx++](req, res, next);
    }

    next();

    setTimeout(() => resolve(res), 1000);
  });
}

const validBody = {
  answers: [{ questionId: VALID_UUID, selectedAnswer: 'A' }],
};

describe('validateSubmitQuizAttempt - timeSpent', () => {
  it('should pass with valid timeSpent', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: 120,
    });
    expect(res.code).toBeNull();
  });

  it('should pass without timeSpent (optional)', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, validBody);
    expect(res.code).toBeNull();
  });

  it('should pass with timeSpent of 0', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: 0,
    });
    expect(res.code).toBeNull();
  });

  it('should pass with timeSpent at max (86400)', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: 86400,
    });
    expect(res.code).toBeNull();
  });

  it('should reject negative timeSpent', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: -10,
    });
    expect(res.code).toBe(400);
    expect(res.data.error).toContain('timeSpent');
  });

  it('should reject timeSpent exceeding 86400', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: 999999,
    });
    expect(res.code).toBe(400);
    expect(res.data.error).toContain('timeSpent');
  });

  it('should reject non-numeric timeSpent', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: 'abc',
    });
    expect(res.code).toBe(400);
    expect(res.data.error).toContain('timeSpent');
  });

  it('should reject null timeSpent', async () => {
    const res = await runValidators(validateSubmitQuizAttempt, {
      ...validBody,
      timeSpent: null,
    });
    expect(res.code).toBe(400);
    expect(res.data.error).toContain('timeSpent');
  });
});
