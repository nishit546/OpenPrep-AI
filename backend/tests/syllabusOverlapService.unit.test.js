const {
  compareSyllabi,
  topicSimilarity,
  prepareTopics,
  tokenize,
  normalizeText,
  jaccard,
  cosine,
} = require('../services/syllabusOverlapService');

const topic = (title, subtopics = [], weightage = 0, moduleName = '') => ({
  title,
  subtopics,
  weightage,
  moduleName,
});

describe('syllabusOverlapService normalization', () => {
  it('lowercases, strips punctuation and stop words, stems plurals', () => {
    expect([...tokenize('Introduction to Quadratic Equations!')].sort()).toEqual([
      'equation',
      'quadratic',
    ]);
    expect(normalizeText('Laws of Motion')).toBe(normalizeText('motion, LAW'));
  });

  it('handles null and empty input', () => {
    expect(tokenize(null).size).toBe(0);
    expect(tokenize('').size).toBe(0);
    expect(jaccard(new Set(), new Set())).toBe(0);
  });
});

describe('topicSimilarity', () => {
  const prep = (t) => prepareTopics([t])[0];

  it('is 1 for the same title after normalization', () => {
    expect(topicSimilarity(prep(topic('Laws of Motion')), prep(topic('motion laws')))).toBe(1);
  });

  it('scores unrelated titles low', () => {
    expect(
      topicSimilarity(prep(topic('Organic Chemistry')), prep(topic('Coordinate Geometry')))
    ).toBe(0);
  });

  it('uses subtopic overlap when both sides list subtopics', () => {
    const a = prep(topic('Mechanics', ['Newton laws', 'Friction', 'Work energy']));
    const b = prep(topic('Dynamics', ['Newton laws', 'Friction', 'Work energy']));
    expect(topicSimilarity(a, b)).toBeGreaterThanOrEqual(0.4);
  });
});

describe('prepareTopics', () => {
  it('drops blank titles and merges duplicates, keeping max weightage', () => {
    const out = prepareTopics([
      topic('Thermodynamics', ['Heat'], 4),
      topic('thermodynamics', ['Heat', 'Entropy'], 7),
      topic('   ', [], 3),
      null,
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].weightage).toBe(7);
    expect(out[0].subtopics).toEqual(['Heat', 'Entropy']);
  });

  it('accepts object subtopics and bad weightage', () => {
    const out = prepareTopics([topic('Optics', [{ name: 'Lenses' }, 5, ''], 'abc')]);
    expect(out[0].subtopics).toEqual(['Lenses']);
    expect(out[0].weightage).toBe(0);
  });

  it('returns [] for non arrays', () => {
    expect(prepareTopics(undefined)).toEqual([]);
  });
});

describe('compareSyllabi', () => {
  const jee = {
    id: 'jee',
    name: 'JEE Main',
    topics: [
      topic('Laws of Motion', ['Friction'], 8),
      topic('Organic Chemistry', [], 6),
      topic('Matrices and Determinants', [], 4),
    ],
  };
  const bitsat = {
    id: 'bitsat',
    name: 'BITSAT',
    topics: [
      topic('Laws of Motion', ['Friction'], 8),
      topic('Matrices & Determinants', [], 4),
      topic('English Proficiency', [], 10),
    ],
  };

  it('splits shared and exclusive topics and computes overlap', async () => {
    const out = await compareSyllabi([jee, bitsat]);
    expect(out.shared.map((r) => r.title)).toEqual(['Laws of Motion', 'Matrices and Determinants']);
    expect(out.exclusive.map((r) => r.title).sort()).toEqual([
      'English Proficiency',
      'Organic Chemistry',
    ]);
    expect(out.overlapPercentage).toBe(50);
    expect(out.shared[0].presentIn).toEqual(['jee', 'bitsat']);
    expect(out.shared[0].sharedSubtopics).toEqual(['Friction']);
  });

  it('weights coverage by weightage', async () => {
    const out = await compareSyllabi([jee, bitsat]);
    const j = out.syllabi.find((s) => s.id === 'jee');
    const b = out.syllabi.find((s) => s.id === 'bitsat');
    expect(j.weightedCoverage).toBeCloseTo((12 / 18) * 100, 1);
    expect(b.weightedCoverage).toBeCloseTo((12 / 22) * 100, 1);
    expect(j.sharedCount).toBe(2);
    expect(j.exclusiveCount).toBe(1);
  });

  it('falls back to topic counts when no weightage is set', async () => {
    const a = { id: 'a', topics: [topic('Algebra'), topic('Poetry')] };
    const b = { id: 'b', topics: [topic('Algebra')] };
    const out = await compareSyllabi([a, b]);
    expect(out.syllabi[0].weightedCoverage).toBe(50);
    expect(out.syllabi[1].weightedCoverage).toBe(100);
  });

  it('estimates study hours and the hours saved by sharing', async () => {
    const out = await compareSyllabi([jee, bitsat]);
    // base 2h + 0.5h per weight point: separate counts shared topics twice
    expect(out.studyHours.separate).toBe(2 * 3 + 0.5 * 18 + 2 * 3 + 0.5 * 22);
    expect(out.studyHours.combined).toBe(2 * 4 + 0.5 * (8 + 6 + 4 + 10));
    expect(out.studyHours.saved).toBe(out.studyHours.separate - out.studyHours.combined);
  });

  it('handles empty topic lists and duplicate topics', async () => {
    const empty = await compareSyllabi([
      { id: 'a', topics: [] },
      { id: 'b', topics: [] },
    ]);
    expect(empty.overlapPercentage).toBe(0);
    expect(empty.topics).toEqual([]);

    const dup = await compareSyllabi([
      { id: 'a', topics: [topic('Algebra', [], 2), topic('algebra', [], 5)] },
      { id: 'b', topics: [topic('Algebra', [], 3)] },
    ]);
    expect(dup.topics).toHaveLength(1);
    expect(dup.topics[0].type).toBe('shared');
  });

  it('works with three syllabi', async () => {
    const c = { id: 'c', topics: [topic('Laws of Motion'), topic('Poetry')] };
    const out = await compareSyllabi([jee, bitsat, c]);
    const motion = out.topics.find((r) => r.title === 'Laws of Motion');
    expect(motion.presentIn).toEqual(['jee', 'bitsat', 'c']);
  });

  it('throws with fewer than two syllabi', async () => {
    await expect(compareSyllabi([jee])).rejects.toThrow(/two/);
    await expect(compareSyllabi(null)).rejects.toThrow();
  });

  it('uses an injected embed function only when the token match misses', async () => {
    const vectors = { Kinematics: [1, 0], 'Motion in a Straight Line': [0.99, 0.05] };
    const embed = vi.fn(async (text) => vectors[text] || [0, 1]);
    const a = { id: 'a', topics: [topic('Kinematics')] };
    const b = { id: 'b', topics: [topic('Motion in a Straight Line')] };

    const plain = await compareSyllabi([a, b]);
    expect(plain.shared).toHaveLength(0);

    const semantic = await compareSyllabi([a, b], {}, { embed });
    expect(semantic.shared).toHaveLength(1);
    expect(embed).toHaveBeenCalled();
  });

  it('stays deterministic if embed throws', async () => {
    const embed = async () => {
      throw new Error('no key');
    };
    const out = await compareSyllabi(
      [
        { id: 'a', topics: [topic('Kinematics')] },
        { id: 'b', topics: [topic('Optics')] },
      ],
      {},
      { embed }
    );
    expect(out.shared).toHaveLength(0);
  });
});

describe('cosine', () => {
  it('handles mismatched or empty vectors', () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1], [1, 2])).toBe(0);
    expect(cosine(null, [1])).toBe(0);
  });
});
