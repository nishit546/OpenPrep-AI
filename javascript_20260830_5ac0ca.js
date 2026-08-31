/**
 * Sequence Optimizer for Interleaved Practice
 * Deterministic, seedable algorithms for optimal question sequencing
 */

/**
 * Seeded random number generator
 */
class SeededRandom {
  constructor(seed) {
    this.seed = seed || Date.now();
  }

  // Linear Congruential Generator
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Random integer between min and max (inclusive)
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Shuffle array using Fisher-Yates with seed
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Pick random element from array
  pick(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  // Weighted random selection
  weightedPick(items, weights) {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = this.next() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    return items[items.length - 1];
  }
}

/**
 * Calculate Shannon entropy of a sequence
 */
function calculateEntropy(sequence) {
  if (!sequence || sequence.length === 0) return 0;

  const counts = {};
  for (const item of sequence) {
    counts[item] = (counts[item] || 0) + 1;
  }

  const n = sequence.length;
  let entropy = 0;
  for (const count of Object.values(counts)) {
    const p = count / n;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Calculate maximum run length (consecutive same items)
 */
function calculateMaxRunLength(sequence) {
  if (!sequence || sequence.length === 0) return 0;

  let maxRun = 1;
  let currentRun = 1;

  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] === sequence[i - 1]) {
      currentRun++;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return maxRun;
}

/**
 * Calculate switch rate (proportion of adjacent pairs that differ)
 */
function calculateSwitchRate(sequence) {
  if (!sequence || sequence.length < 2) return 0;

  let switches = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) {
      switches++;
    }
  }

  return switches / (sequence.length - 1);
}

/**
 * Calculate confusable adjacency ratio
 * Confusable topics are those the learner has previously confused
 */
function calculateConfusableAdjacencyRatio(sequence, confusablePairs) {
  if (!sequence || sequence.length < 2 || !confusablePairs) return 0;

  const confusableSet = new Set();
  for (const pair of confusablePairs) {
    const key = [pair.topicA, pair.topicB].sort().join('-');
    confusableSet.add(key);
  }

  let confusableAdjacencies = 0;
  for (let i = 1; i < sequence.length; i++) {
    const key = [sequence[i - 1], sequence[i]].sort().join('-');
    if (confusableSet.has(key)) {
      confusableAdjacencies++;
    }
  }

  return confusableAdjacencies / (sequence.length - 1);
}

/**
 * Generate interleaved sequence with controlled interference
 */
function generateInterleavedSequence({
  topicItems, // { topicId: [questionIds] }
  interferenceLevel = 0.5,
  questionCount = 10,
  seed = null,
  confusablePairs = [],
  minAccuracyThreshold = 0.6,
  topicReadiness = {}, // { topicId: accuracy }
  noAdjacentRepeat = true,
}) {
  const rng = new SeededRandom(seed);

  // Filter topics by readiness
  const eligibleTopics = {};
  for (const [topicId, questions] of Object.entries(topicItems)) {
    const accuracy = topicReadiness[topicId] || 0;
    if (accuracy >= minAccuracyThreshold) {
      eligibleTopics[topicId] = questions;
    }
  }

  if (Object.keys(eligibleTopics).length === 0) {
    throw new Error('No topics meet the minimum accuracy threshold for interleaving');
  }

  // Flatten question pool with topic labels
  const questionPool = [];
  for (const [topicId, questions] of Object.entries(eligibleTopics)) {
    for (const question of questions) {
      questionPool.push({
        id: question.id || question,
        topicId,
      });
    }
  }

  if (questionPool.length === 0) {
    throw new Error('No questions available for the selected topics');
  }

  // If question pool is smaller than requested count, adjust
  const actualCount = Math.min(questionCount, questionPool.length * 2);

  // Build topic weights based on interference level
  const topics = Object.keys(eligibleTopics);
  const topicWeights = {};
  for (const topic of topics) {
    // Higher interference = more balanced distribution
    const baseWeight = 1 / topics.length;
    const variance = 1 - interferenceLevel;
    topicWeights[topic] = baseWeight + (Math.random() - 0.5) * variance * baseWeight;
    topicWeights[topic] = Math.max(0.1, topicWeights[topic]);
  }

  // Generate sequence
  const sequence = [];
  const selectedQuestions = new Set();

  // First, determine how many questions per topic
  const topicCounts = {};
  let remaining = actualCount;

  // Distribute questions across topics based on weights
  const totalWeight = Object.values(topicWeights).reduce((a, b) => a + b, 0);
  for (const topic of topics) {
    const count = Math.floor((topicWeights[topic] / totalWeight) * actualCount);
    topicCounts[topic] = count;
    remaining -= count;
  }

  // Distribute remaining questions
  let i = 0;
  while (remaining > 0) {
    const topic = topics[i % topics.length];
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    remaining--;
    i++;
  }

  // Build initial sequence by interleaving
  const topicQueues = {};
  for (const [topicId, count] of Object.entries(topicCounts)) {
    const available = eligibleTopics[topicId] || [];
    topicQueues[topicId] = rng.shuffle(available).slice(0, count);
  }

  // Interleaving algorithm with no-adjacent-repeat
  let lastTopic = null;
  let attempts = 0;
  const maxAttempts = 1000;

  while (Object.values(topicQueues).some(q => q.length > 0) && attempts < maxAttempts) {
    attempts++;

    // Get available topics (those with questions remaining)
    const availableTopics = Object.keys(topicQueues).filter(t => topicQueues[t].length > 0);

    if (availableTopics.length === 0) break;

    // Apply no-adjacent-repeat constraint
    let candidateTopics = availableTopics;
    if (noAdjacentRepeat && lastTopic !== null) {
      candidateTopics = availableTopics.filter(t => t !== lastTopic);
    }

    // If no candidates due to constraint, relax it
    if (candidateTopics.length === 0) {
      candidateTopics = availableTopics;
    }

    // Pick topic based on interference level
    let selectedTopic;
    if (interferenceLevel > 0.7) {
      // High interference: prefer topics different from last
      if (lastTopic !== null && candidateTopics.length > 1) {
        selectedTopic = rng.pick(candidateTopics.filter(t => t !== lastTopic));
        if (!selectedTopic) selectedTopic = rng.pick(candidateTopics);
      } else {
        selectedTopic = rng.pick(candidateTopics);
      }
    } else if (interferenceLevel < 0.3) {
      // Low interference: prefer staying on same topic (blocked)
      const sameTopic = availableTopics.find(t => t === lastTopic);
      if (sameTopic && topicQueues[sameTopic].length > 0) {
        selectedTopic = sameTopic;
      } else {
        selectedTopic = rng.pick(availableTopics);
      }
    } else {
      // Medium interference: balanced
      selectedTopic = rng.pick(candidateTopics);
    }

    // Pop question from selected topic
    const question = topicQueues[selectedTopic].shift();
    if (question) {
      const questionId = typeof question === 'object' ? question.id : question;
      sequence.push({
        questionId,
        topicId: selectedTopic,
      });
      lastTopic = selectedTopic;
    }
  }

  // If we need more questions, add from remaining pool
  if (sequence.length < actualCount) {
    const remainingQuestions = questionPool.filter(
      q => !sequence.some(s => s.questionId === q.id)
    );
    const shuffledRemaining = rng.shuffle(remainingQuestions);
    for (const q of shuffledRemaining) {
      if (sequence.length >= actualCount) break;
      sequence.push({
        questionId: q.id,
        topicId: q.topicId,
      });
    }
  }

  // Extract sequences for metrics
  const questionSequence = sequence.map(s => s.questionId);
  const topicSequence = sequence.map(s => s.topicId);

  // Calculate quality metrics
  const switchRate = calculateSwitchRate(topicSequence);
  const maxRunLength = calculateMaxRunLength(topicSequence);
  const entropy = calculateEntropy(topicSequence);
  const confusableAdjacencyRatio = calculateConfusableAdjacencyRatio(
    topicSequence,
    confusablePairs
  );

  return {
    questionSequence,
    topicSequence,
    metadata: {
      switchRate,
      maxRunLength,
      entropy,
      confusableAdjacencyRatio,
      totalQuestions: sequence.length,
      uniqueTopics: Object.keys(eligibleTopics).length,
      actualInterferenceLevel: switchRate, // Actual measured interference
      targetInterferenceLevel: interferenceLevel,
    },
    topicCounts,
    sequence: sequence.map((s, idx) => ({
      position: idx + 1,
      questionId: s.questionId,
      topicId: s.topicId,
    })),
  };
}

/**
 * Generate confusable pairs from historical data
 */
function generateConfusablePairs(historicalData) {
  // historicalData: [{ questionId, topicId, distractorTopicId, selectedTopicId }]
  const confusableMap = {};

  for (const entry of historicalData) {
    if (entry.distractorTopicId && entry.distractorTopicId !== entry.topicId) {
      const key = [entry.topicId, entry.distractorTopicId].sort().join('-');
      confusableMap[key] = (confusableMap[key] || 0) + 1;
    }
  }

  // Sort by frequency and return top pairs
  const pairs = Object.entries(confusableMap)
    .map(([key, count]) => {
      const [topicA, topicB] = key.split('-');
      return { topicA, topicB, count };
    })
    .sort((a, b) => b.count - a.count);

  return pairs;
}

/**
 * Calculate interleaving benefit
 */
function calculateInterleavingBenefit(interleavedResults, blockedResults) {
  // interleavedResults: [{ topicId, correct, timeSpent }]
  // blockedResults: [{ topicId, correct, timeSpent }]

  const interleavedAccuracy = interleavedResults.reduce((sum, r) => sum + (r.correct ? 1 : 0), 0) / interleavedResults.length;
  const blockedAccuracy = blockedResults.reduce((sum, r) => sum + (r.correct ? 1 : 0), 0) / blockedResults.length;

  return interleavedAccuracy - blockedAccuracy;
}

/**
 * Recommend interference level based on benefit history
 */
function recommendInterferenceLevel(benefitHistory) {
  // benefitHistory: [{ interferenceLevel, benefit }]
  if (!benefitHistory || benefitHistory.length === 0) {
    return 0.5; // Default medium
  }

  // Find the interference level with maximum benefit
  let bestLevel = 0.5;
  let bestBenefit = -Infinity;

  for (const entry of benefitHistory) {
    if (entry.benefit > bestBenefit) {
      bestBenefit = entry.benefit;
      bestLevel = entry.interferenceLevel;
    }
  }

  // Clamp to reasonable range
  return Math.max(0, Math.min(1, bestLevel));
}

module.exports = {
  SeededRandom,
  calculateEntropy,
  calculateMaxRunLength,
  calculateSwitchRate,
  calculateConfusableAdjacencyRatio,
  generateInterleavedSequence,
  generateConfusablePairs,
  calculateInterleavingBenefit,
  recommendInterferenceLevel,
};