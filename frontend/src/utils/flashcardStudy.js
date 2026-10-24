export const STUDY_MODES = {
  STANDARD: 'standard',
  REVERSE: 'reverse',
  MIXED: 'mixed',
};

/**
 * Unbiased Fisher-Yates shuffle. Returns a new array and never touches the input.
 * `random` can be injected for tests.
 */
export function shuffleArray(items, random = Math.random) {
  const result = Array.isArray(items) ? [...items] : [];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const CLOZE_PATTERN = /\{\{c\d+::/i;

/** Cloze cards ({{c1::answer}}) only make sense front to back. */
export function isClozeCard(card) {
  return Boolean(card) && (CLOZE_PATTERN.test(card.front || '') || CLOZE_PATTERN.test(card.back || ''));
}

/** Pick a direction (true = reversed) for every card id, 50/50. */
export function buildMixedDirections(cards, random = Math.random) {
  const directions = {};
  (cards || []).forEach((card) => {
    if (card && card.id !== undefined) directions[card.id] = random() < 0.5;
  });
  return directions;
}

/**
 * Work out what to show as the prompt and as the answer for a card.
 * The card itself is never changed, only the view of it.
 */
export function getCardOrientation(card, mode, mixedDirections = {}) {
  if (!card) return { reversed: false, promptText: '', answerText: '' };
  let reversed = false;
  if (!isClozeCard(card)) {
    if (mode === STUDY_MODES.REVERSE) reversed = true;
    else if (mode === STUDY_MODES.MIXED) reversed = Boolean(mixedDirections[card.id]);
  }
  return {
    reversed,
    promptText: reversed ? card.back : card.front,
    answerText: reversed ? card.front : card.back,
  };
}

/** Shuffle only the cards after `fromIndex`, so the card on screen stays put. */
export function shuffleRemaining(cards, fromIndex, random = Math.random) {
  const start = Math.max(0, fromIndex + 1);
  return [...cards.slice(0, start), ...shuffleArray(cards.slice(start), random)];
}
