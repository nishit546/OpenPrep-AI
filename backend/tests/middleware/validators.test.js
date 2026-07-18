const { v4: uuidv4 } = require('uuid');
const {
  validateCreateSubject,
  validateCreateTopic,
  validateGenerateAIFlashcards,
  validateCreateFlashcard,
  validateGenerateAIQuiz,
  validateUploadNote,
  validateUploadPYQ,
  validateGenerateAIPlan,
} = require('../../middleware/validators');

const VALID_UUID = uuidv4();
const INVALID_MONGO_ID = '507f1f77bcf86cd799439011';
const INVALID_STRING = 'not-a-uuid';

const runValidators = async (validators, body) => {
  const req = { body };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  const next = vi.fn();

  for (const middleware of validators) {
    await middleware(req, res, next);
    if (res.statusCode) break;
  }

  return { req, res, next };
};

describe('Validators - validateCreateSubject', () => {
  it('should pass with valid name and examId (UUID)', async () => {
    const { next, res } = await runValidators(validateCreateSubject, {
      name: 'Mathematics',
      examId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject missing name', async () => {
    const { res } = await runValidators(validateCreateSubject, {
      examId: VALID_UUID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject name');
  });

  it('should reject invalid examId (MongoDB ObjectId)', async () => {
    const { res } = await runValidators(validateCreateSubject, {
      name: 'Mathematics',
      examId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('exam ID');
  });

  it('should reject non-UUID examId', async () => {
    const { res } = await runValidators(validateCreateSubject, {
      name: 'Mathematics',
      examId: INVALID_STRING,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('exam ID');
  });
});

describe('Validators - validateCreateTopic', () => {
  it('should pass with valid name and subjectId (UUID)', async () => {
    const { next, res } = await runValidators(validateCreateTopic, {
      name: 'Algebra',
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject missing subjectId', async () => {
    const { res } = await runValidators(validateCreateTopic, {
      name: 'Algebra',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });

  it('should reject MongoDB ObjectId as subjectId', async () => {
    const { res } = await runValidators(validateCreateTopic, {
      name: 'Algebra',
      subjectId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });
});

describe('Validators - validateGenerateAIFlashcards', () => {
  it('should pass with valid subjectId', async () => {
    const { next, res } = await runValidators(validateGenerateAIFlashcards, {
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should pass with valid subjectId and count', async () => {
    const { next, res } = await runValidators(validateGenerateAIFlashcards, {
      subjectId: VALID_UUID,
      count: 10,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject missing subjectId', async () => {
    const { res } = await runValidators(validateGenerateAIFlashcards, {});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });

  it('should reject count out of range', async () => {
    const { res } = await runValidators(validateGenerateAIFlashcards, {
      subjectId: VALID_UUID,
      count: 100,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('between 1 and 50');
  });
});

describe('Validators - validateCreateFlashcard', () => {
  it('should pass with valid front, back, and subjectId', async () => {
    const { next, res } = await runValidators(validateCreateFlashcard, {
      front: 'What is 2+2?',
      back: '4',
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject missing front', async () => {
    const { res } = await runValidators(validateCreateFlashcard, {
      back: '4',
      subjectId: VALID_UUID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('front text');
  });

  it('should reject missing back', async () => {
    const { res } = await runValidators(validateCreateFlashcard, {
      front: 'What is 2+2?',
      subjectId: VALID_UUID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('back text');
  });

  it('should reject MongoDB ObjectId as subjectId', async () => {
    const { res } = await runValidators(validateCreateFlashcard, {
      front: 'What is 2+2?',
      back: '4',
      subjectId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });
});

describe('Validators - validateGenerateAIQuiz', () => {
  it('should pass with valid subjectId', async () => {
    const { next, res } = await runValidators(validateGenerateAIQuiz, {
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject invalid subjectId', async () => {
    const { res } = await runValidators(validateGenerateAIQuiz, {
      subjectId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });
});

describe('Validators - validateUploadNote', () => {
  it('should pass with valid title and subjectId', async () => {
    const { next, res } = await runValidators(validateUploadNote, {
      title: 'My Notes',
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject missing title', async () => {
    const { res } = await runValidators(validateUploadNote, {
      subjectId: VALID_UUID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('note title');
  });

  it('should reject MongoDB ObjectId as subjectId', async () => {
    const { res } = await runValidators(validateUploadNote, {
      title: 'My Notes',
      subjectId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });
});

describe('Validators - validateUploadPYQ', () => {
  it('should pass with valid subjectId', async () => {
    const { next, res } = await runValidators(validateUploadPYQ, {
      subjectId: VALID_UUID,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should pass with valid subjectId and year', async () => {
    const { next, res } = await runValidators(validateUploadPYQ, {
      subjectId: VALID_UUID,
      year: 2024,
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject MongoDB ObjectId as subjectId', async () => {
    const { res } = await runValidators(validateUploadPYQ, {
      subjectId: INVALID_MONGO_ID,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('subject ID');
  });

  it('should reject invalid year', async () => {
    const { res } = await runValidators(validateUploadPYQ, {
      subjectId: VALID_UUID,
      year: 1800,
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('year');
  });
});

describe('Validators - validateGenerateAIPlan', () => {
  it('should pass with valid examId and dates', async () => {
    const { next, res } = await runValidators(validateGenerateAIPlan, {
      examId: VALID_UUID,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    });
    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('should reject MongoDB ObjectId as examId', async () => {
    const { res } = await runValidators(validateGenerateAIPlan, {
      examId: INVALID_MONGO_ID,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('exam ID');
  });

  it('should reject missing startDate', async () => {
    const { res } = await runValidators(validateGenerateAIPlan, {
      examId: VALID_UUID,
      endDate: '2025-06-30',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Start date');
  });

  it('should reject missing endDate', async () => {
    const { res } = await runValidators(validateGenerateAIPlan, {
      examId: VALID_UUID,
      startDate: '2025-01-01',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('End date');
  });
});
