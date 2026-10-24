const { createCompareHandler } = require('../../controllers/syllabusController');

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '33333333-3333-4333-8333-333333333333';

function makeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

const owned = [
  { id: A, name: 'JEE Main' },
  { id: B, name: 'BITSAT' },
];
const topics = [
  { syllabusId: A, title: 'Laws of Motion', subtopics: [], weightage: 5 },
  { syllabusId: B, title: 'Laws of Motion', subtopics: [], weightage: 5 },
];

const run = async (body, deps = {}) => {
  const handler = createCompareHandler({
    findSyllabi: async (ids) => owned.filter((s) => ids.includes(s.id)),
    findTopics: async () => topics,
    ...deps,
  });
  const res = makeRes();
  const next = vi.fn();
  await handler({ body, user: { id: 'user-1' } }, res, next);
  return { res, next };
};

describe('POST /compare handler', () => {
  it('returns 200 with the comparison', async () => {
    const { res } = await run({ syllabusIds: [A, B] });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.shared).toHaveLength(1);
    expect(res.body.data.syllabi.map((s) => s.name)).toEqual(['JEE Main', 'BITSAT']);
  });

  it('passes the logged in user id to the ownership loader', async () => {
    const findSyllabi = vi.fn(async () => owned);
    await run({ syllabusIds: [A, B] }, { findSyllabi });
    expect(findSyllabi).toHaveBeenCalledWith([A, B], 'user-1');
  });

  it.each([
    ['missing body', undefined],
    ['not an array', { syllabusIds: A }],
    ['one id', { syllabusIds: [A] }],
    ['same id twice', { syllabusIds: [A, A] }],
    ['non uuid id', { syllabusIds: [A, 'nope'] }],
    ['non string id', { syllabusIds: [A, 5] }],
    [
      'too many',
      {
        syllabusIds: [
          A,
          B,
          C,
          '44444444-4444-4444-8444-444444444444',
          '55555555-5555-4555-8555-555555555555',
          '66666666-6666-4666-8666-666666666666',
        ],
      },
    ],
  ])('returns 400 for %s', async (_label, body) => {
    const findSyllabi = vi.fn();
    const { res } = await run(body, { findSyllabi });
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(findSyllabi).not.toHaveBeenCalled();
  });

  it('returns 404 when an id is not owned by the user', async () => {
    const { res } = await run({ syllabusIds: [A, C] });
    expect(res.statusCode).toBe(404);
  });

  it('forwards unexpected errors to next', async () => {
    const { res, next } = await run(
      { syllabusIds: [A, B] },
      {
        findSyllabi: async () => {
          throw new Error('db down');
        },
      }
    );
    expect(res.statusCode).toBeNull();
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
