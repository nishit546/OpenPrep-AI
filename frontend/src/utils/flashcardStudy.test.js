import {
  STUDY_MODES,
  shuffleArray,
  shuffleRemaining,
  getCardOrientation,
  buildMixedDirections,
  isClozeCard,
} from './flashcardStudy';

const card = { id: 'a', front: 'Q', back: 'A' };

describe('shuffleArray', () => {
  test('keeps the same items and does not change the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const frozen = Object.freeze([...input]);
    const out = shuffleArray(frozen);
    expect([...out].sort()).toEqual(input);
    expect(out).not.toBe(frozen);
    expect(frozen).toEqual(input);
  });

  test('handles empty and single item arrays', () => {
    expect(shuffleArray([])).toEqual([]);
    expect(shuffleArray([7])).toEqual([7]);
  });

  test('is roughly uniform over all permutations of 3 items', () => {
    const counts = {};
    const runs = 6000;
    for (let i = 0; i < runs; i += 1) {
      const key = shuffleArray([1, 2, 3]).join('');
      counts[key] = (counts[key] || 0) + 1;
    }
    expect(Object.keys(counts)).toHaveLength(6);
    Object.values(counts).forEach((n) => {
      expect(n).toBeGreaterThan(runs / 6 * 0.8);
      expect(n).toBeLessThan(runs / 6 * 1.2);
    });
  });
});

describe('shuffleRemaining', () => {
  test('keeps cards up to the current one in place', () => {
    const cards = [1, 2, 3, 4, 5];
    const out = shuffleRemaining(cards, 1, () => 0);
    expect(out.slice(0, 2)).toEqual([1, 2]);
    expect([...out.slice(2)].sort()).toEqual([3, 4, 5]);
    expect(cards).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('getCardOrientation', () => {
  test('standard shows front then back', () => {
    expect(getCardOrientation(card, STUDY_MODES.STANDARD)).toMatchObject({
      reversed: false, promptText: 'Q', answerText: 'A',
    });
  });

  test('reverse swaps the fields without changing the card', () => {
    const copy = { ...card };
    expect(getCardOrientation(card, STUDY_MODES.REVERSE)).toMatchObject({
      reversed: true, promptText: 'A', answerText: 'Q',
    });
    expect(card).toEqual(copy);
  });

  test('mixed uses the stored direction for the card', () => {
    expect(getCardOrientation(card, STUDY_MODES.MIXED, { a: true }).reversed).toBe(true);
    expect(getCardOrientation(card, STUDY_MODES.MIXED, { a: false }).reversed).toBe(false);
  });

  test('cloze cards are never reversed', () => {
    const cloze = { id: 'c', front: 'The {{c1::sun}} is a star', back: 'extra' };
    expect(isClozeCard(cloze)).toBe(true);
    expect(getCardOrientation(cloze, STUDY_MODES.REVERSE).reversed).toBe(false);
  });

  test('returns empty text when there is no card', () => {
    expect(getCardOrientation(undefined, STUDY_MODES.REVERSE)).toEqual({
      reversed: false, promptText: '', answerText: '',
    });
  });
});

describe('buildMixedDirections', () => {
  test('assigns a direction per card id', () => {
    const dirs = buildMixedDirections([{ id: 1 }, { id: 2 }], () => 0.2);
    expect(dirs).toEqual({ 1: true, 2: true });
    expect(buildMixedDirections([{ id: 1 }], () => 0.8)).toEqual({ 1: false });
  });
});
