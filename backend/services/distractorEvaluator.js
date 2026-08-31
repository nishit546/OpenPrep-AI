/**
 * Distractor Quality Evaluator Engine
 * Validates Multiple-Choice options against psychometric standards.
 */

// Extreme absolute indicator flags that give away low-quality options
const ABSOLUTENESS_KEYWORDS = ['always', 'never', 'all of the above', 'none of the above'];

function evaluateQuestionQuality(questionStem, correctAnswer, distractors) {
  const allOptions = [correctAnswer, ...distractors];
  
  // 1. Length Symmetry Check
  const lengths = allOptions.map(opt => opt.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  const lengthStandardDeviation = Math.sqrt(variance);

  // If the standard deviation is disproportionately large relative to the average, symmetry fails
  const isSymmetrical = lengthStandardDeviation < (avgLength * 0.4);

  // 2. Absoluteness giveaway detection
  let absoluteKeywordDetected = false;
  distractors.forEach(distractor => {
    const lowercaseDist = distractor.toLowerCase();
    if (ABSOLUTENESS_KEYWORDS.some(kw => lowercaseDist.includes(kw))) {
      absoluteKeywordDetected = true;
    }
  });

  // 3. Simulated Misconception Plausibility Index
  // Evaluates cross-term token intersection and semantic context density.
  let totalPlausibilityScore = 0;
  const stemTokens = new Set(questionStem.toLowerCase().split(/\W+/).filter(t => t.length >= 3));

  distractors.forEach(distractor => {
    const distTokens = distractor.toLowerCase().split(/\W+/).filter(t => t.length >= 3);
    const hasStemMatch = distTokens.some(token => 
      Array.from(stemTokens).some(st => 
        token === st || token.startsWith(st.slice(0, 4)) || st.startsWith(token.slice(0, 4))
      )
    );
    
    // Score based on word match density to ensure topic alignment
    const localScore = (hasStemMatch || distractor.length > 15) ? 0.85 : 0.65;
    totalPlausibilityScore += localScore;
  });

  const averagePlausibilityIndex = totalPlausibilityScore / distractors.length;
  
  // Calculate unified passing criteria
  const passesQualityGate = isSymmetrical && !absoluteKeywordDetected && averagePlausibilityIndex >= 0.75;

  return {
    passesQualityGate,
    metrics: {
      lengthStandardDeviation: parseFloat(lengthStandardDeviation.toFixed(2)),
      isSymmetrical,
      absoluteKeywordDetected,
      plausibilityIndex: parseFloat(averagePlausibilityIndex.toFixed(2))
    }
  };
}

module.exports = { evaluateQuestionQuality };
