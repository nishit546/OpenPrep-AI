/**
 * Text Analysis Utility for Feynman Explain-Back Grader
 * All deterministic, no AI required for core scoring
 */

// Stopwords to filter out during analysis
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'for', 'nor', 'on', 'at', 'to', 'by',
  'in', 'of', 'off', 'with', 'without', 'about', 'against', 'between', 'through',
  'during', 'within', 'upon', 'towards', 'among', 'upon', 'etc', 'i', 'you',
  'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'her', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'so', 'because', 'since', 'until', 'while', 'though', 'although', 'whereas',
  'therefore', 'thus', 'hence', 'accordingly', 'consequently', 'furthermore',
  'moreover', 'nevertheless', 'nonetheless', 'still', 'yet', 'then', 'else',
  'also', 'too', 'very', 'really', 'quite', 'rather', 'somewhat', 'actually',
  'basically', 'absolutely', 'completely', 'entirely', 'totally', 'utterly',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'might', 'must',
  'may', 'can', 'shall', 'need', 'dare', 'ought', 'used', 'get', 'got', 'gotten',
]);

// Common word stems mapping
const STEM_MAP = {
  // Verbs
  'explain': ['explains', 'explained', 'explaining', 'explanation'],
  'understand': ['understands', 'understood', 'understanding'],
  'know': ['knows', 'knew', 'known', 'knowing', 'knowledge'],
  'learn': ['learns', 'learned', 'learning', 'learnt'],
  'remember': ['remembers', 'remembered', 'remembering', 'memory'],
  'apply': ['applies', 'applied', 'applying', 'application'],
  'analyze': ['analyzes', 'analyzed', 'analyzing', 'analysis'],
  'evaluate': ['evaluates', 'evaluated', 'evaluating', 'evaluation'],
  'create': ['creates', 'created', 'creating', 'creation'],
  'identify': ['identifies', 'identified', 'identifying', 'identification'],
  'describe': ['describes', 'described', 'describing', 'description'],
  'discuss': ['discusses', 'discussed', 'discussing', 'discussion'],
  'define': ['defines', 'defined', 'defining', 'definition'],
  'compare': ['compares', 'compared', 'comparing', 'comparison'],
  'contrast': ['contrasts', 'contrasted', 'contrasting', 'contrast'],
  // Nouns
  'concept': ['concepts', 'conceptual'],
  'idea': ['ideas'],
  'theory': ['theories', 'theoretical'],
  'principle': ['principles'],
  'rule': ['rules'],
  'law': ['laws'],
  'fact': ['facts'],
  'process': ['processes'],
  'system': ['systems', 'systematic'],
  'method': ['methods', 'methodology'],
  'approach': ['approaches'],
  'result': ['results', 'resulting'],
  'effect': ['effects'],
  'cause': ['causes', 'caused', 'causing'],
  'change': ['changes', 'changed', 'changing'],
  'increase': ['increases', 'increased', 'increasing'],
  'decrease': ['decreases', 'decreased', 'decreasing'],
  'difference': ['differences', 'different'],
  'similarity': ['similarities', 'similar'],
  'function': ['functions', 'functional'],
  'structure': ['structures', 'structural'],
  'component': ['components'],
  'factor': ['factors'],
  'variable': ['variables'],
  'constant': ['constants'],
  'value': ['values'],
  'quality': ['qualities'],
  'quantity': ['quantities'],
  'size': ['sizes'],
  'level': ['levels'],
  'type': ['types'],
  'form': ['forms'],
  'part': ['parts'],
  'element': ['elements'],
  'aspect': ['aspects'],
  'feature': ['features'],
  'issue': ['issues'],
  'problem': ['problems'],
  'solution': ['solutions'],
  'reason': ['reasons', 'reasoning'],
  'evidence': ['evidences', 'evident'],
  'example': ['examples'],
  'case': ['cases'],
};

/**
 * Build a reverse lookup for stemming
 */
function buildStemMap() {
  const reverseMap = {};
  for (const [stem, variants] of Object.entries(STEM_MAP)) {
    reverseMap[stem] = stem;
    for (const variant of variants) {
      reverseMap[variant] = stem;
    }
  }
  return reverseMap;
}

const STEM_LOOKUP = buildStemMap();

/**
 * Tokenize text into words
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }
  return text
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);
}

/**
 * Get the stem of a word
 */
function getStem(word) {
  const lower = word.toLowerCase();
  return STEM_LOOKUP[lower] || lower;
}

/**
 * Extract technical terms from text (words with 6+ chars or in technical list)
 */
function extractTechnicalTerms(text, technicalTerms = []) {
  const tokens = tokenize(text);
  const technicalSet = new Set(technicalTerms.map((t) => t.toLowerCase()));
  
  return tokens.filter((token) => {
    // Words longer than 6 chars are likely technical
    if (token.length >= 6) return true;
    // Check against provided technical terms
    if (technicalSet.has(token)) return true;
    // Check against known technical prefixes/suffixes
    if (/^(bio|chem|phys|math|geo|astro|psych|socio|eco|polit|tech|sci|engi)/.test(token)) return true;
    if (/(ology|ation|ment|ence|ance|ity|ism|ist|ive|ous|tion|sion)$/.test(token)) return true;
    return false;
  });
}

/**
 * Calculate jargon density as percentage of technical terms
 */
function calculateJargonDensity(text, technicalTerms = []) {
  const tokens = tokenize(text);
  if (tokens.length === 0) return 0;
  
  const techTerms = extractTechnicalTerms(text, technicalTerms);
  return (techTerms.length / tokens.length) * 100;
}

/**
 * Calculate average sentence length
 */
function calculateAvgSentenceLength(text) {
  if (!text || typeof text !== 'string') return 0;
  
  // Split by sentence-ending punctuation
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 0;
  
  const totalWords = tokenize(text).length;
  return totalWords / sentences.length;
}

/**
 * Calculate simplicity score using Flesch Reading Ease formula
 * Higher score = simpler (easier to read)
 */
function calculateSimplicityScore(text) {
  if (!text || typeof text !== 'string' || text.length < 10) {
    return 50; // Neutral default
  }
  
  const words = tokenize(text);
  const wordCount = words.length;
  if (wordCount === 0) return 0;
  
  // Count syllables (simplified)
  const syllableCount = countSyllables(text);
  
  // Count sentences
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = sentences.length || 1;
  
  // Flesch Reading Ease formula
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const flesch = 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (syllableCount / wordCount);
  
  // Clamp to 0-100 and invert (higher = simpler)
  const score = Math.max(0, Math.min(100, flesch));
  
  // Normalize: Flesch scale 0-100, 60-70 is ideal for plain English
  // We'll map it so 100 is simplest
  return Math.round(score);
}

/**
 * Count syllables in text (simplified algorithm)
 */
function countSyllables(text) {
  const words = tokenize(text);
  let total = 0;
  
  for (const word of words) {
    total += countSyllablesWord(word);
  }
  
  return total;
}

/**
 * Count syllables in a single word
 */
function countSyllablesWord(word) {
  if (!word || word.length < 1) return 1;
  
  // Remove common suffixes
  let w = word.toLowerCase()
    .replace(/e$/, '') // Remove silent e
    .replace(/ed$/, '')
    .replace(/ing$/, '')
    .replace(/es$/, '');
  
  // Count vowel groups
  const vowelGroups = w.match(/[aeiouy]+/g);
  if (!vowelGroups) return 1;
  
  let count = vowelGroups.length;
  
  // Handle special cases
  if (w.length > 3 && /[^aeiouy]e$/.test(w)) {
    count += 1;
  }
  
  // Handle "le" at end
  if (/le$/.test(w) && w.length > 2) {
    const before = w[w.length - 3];
    if (before && !/[aeiouy]/.test(before)) {
      count += 1;
    }
  }
  
  return Math.max(1, count);
}

/**
 * Match key points against explanation text
 * Returns matched points with confidence scores
 */
function matchKeyPoints(keyPoints, explanation, technicalTerms = []) {
  if (!keyPoints || keyPoints.length === 0) {
    return { matched: [], missed: [], matchedIndices: [] };
  }
  
  const explanationTokens = tokenize(explanation);
  const explanationStems = explanationTokens.map((t) => getStem(t));
  const explanationSet = new Set(explanationStems);
  
  const matched = [];
  const missed = [];
  const matchedIndices = [];
  
  for (let i = 0; i < keyPoints.length; i++) {
    const point = keyPoints[i];
    const pointTokens = tokenize(point);
    const pointStems = pointTokens.map((t) => getStem(t));
    
    // Count how many stems from the point appear in the explanation
    let matchCount = 0;
    for (const stem of pointStems) {
      if (explanationSet.has(stem)) {
        matchCount++;
      }
    }
    
    // Calculate match ratio (minimum 1 stem required for a match)
    const matchRatio = pointStems.length > 0 ? matchCount / pointStems.length : 0;
    
    // Also check for exact phrase matches (bonus)
    let exactPhraseMatch = false;
    for (let j = 0; j < explanationTokens.length - pointTokens.length + 1; j++) {
      let allMatch = true;
      for (let k = 0; k < pointTokens.length; k++) {
        if (getStem(explanationTokens[j + k]) !== pointStems[k]) {
          allMatch = false;
          break;
        }
      }
      if (allMatch && pointTokens.length > 1) {
        exactPhraseMatch = true;
        break;
      }
    }
    
    // Match if more than 60% of stems match, or exact phrase match
    const isMatched = matchRatio >= 0.6 || exactPhraseMatch || pointStems.some((stem) => explanationSet.has(stem) && pointTokens.length === 1);
    
    // Also check for technical term overlap
    const pointTechTerms = extractTechnicalTerms(point, technicalTerms);
    const explanationTechTerms = extractTechnicalTerms(explanation, technicalTerms);
    const techOverlap = pointTechTerms.filter((t) => explanationTechTerms.includes(t));
    
    const techMatchRatio = pointTechTerms.length > 0 ? techOverlap.length / pointTechTerms.length : 0;
    const isTechMatched = techMatchRatio >= 0.5;
    
    const finalMatched = isMatched || isTechMatched;
    
    if (finalMatched) {
      matched.push({
        point,
        matchRatio: Math.max(matchRatio, techMatchRatio),
        exactPhraseMatch,
        techMatch: isTechMatched,
        matchedTerms: pointTokens.filter((t) => explanationSet.has(getStem(t))),
      });
      matchedIndices.push(i);
    } else {
      missed.push({
        point,
        matchRatio,
        techMatchRatio,
        suggestedTerms: pointStems.slice(0, 3), // Suggest key terms to use
      });
    }
  }
  
  return { matched, missed, matchedIndices };
}

/**
 * Calculate coverage score based on matched points
 */
function calculateCoverageScore(keyPoints, matchedIndices) {
  if (!keyPoints || keyPoints.length === 0) return 0;
  return (matchedIndices.length / keyPoints.length) * 100;
}

/**
 * Generate feedback for missed points
 */
function generateGapFeedback(missedPoints) {
  if (!missedPoints || missedPoints.length === 0) {
    return "🎉 Excellent! You covered all the key points. Your understanding is complete.";
  }
  
  const count = missedPoints.length;
  let feedback = `📋 You missed ${count} key point${count > 1 ? 's' : ''}. `;
  
  if (count === 1) {
    feedback += "Focus on understanding this concept better:";
  } else if (count <= 3) {
    feedback += "Pay attention to these concepts:";
  } else {
    feedback += "There are significant gaps. Review these key points:";
  }
  
  return feedback;
}

/**
 * Generate jargon density feedback
 */
function generateJargonFeedback(jargonDensity) {
  if (jargonDensity < 15) {
    return "✅ Low jargon density. You're explaining in plain language — excellent for learning!";
  } else if (jargonDensity < 30) {
    return "📊 Moderate jargon usage. Try to simplify further — explain as if to a beginner.";
  } else if (jargonDensity < 50) {
    return "⚠️ High jargon density. You might be reciting vocabulary without understanding. Try to use simpler words.";
  } else {
    return "🚨 Very high jargon density. This is the signature of recitation without understanding. Rewrite in plain language.";
  }
}

/**
 * Generate simplicity feedback
 */
function generateSimplicityFeedback(simplicityScore) {
  if (simplicityScore >= 80) {
    return "✅ Very simple and clear. Perfect for explaining to a beginner!";
  } else if (simplicityScore >= 60) {
    return "✅ Good clarity. The explanation is accessible to most readers.";
  } else if (simplicityScore >= 40) {
    return "📊 Moderate clarity. Try using shorter sentences and simpler words.";
  } else {
    return "⚠️ Complex explanation. Remember: explain it like you're talking to a beginner!";
  }
}

/**
 * Generate overall feedback summary
 */
function generateOverallFeedback(
  coverageScore,
  jargonDensity,
  simplicityScore,
  missedPoints
) {
  let feedback = "📝 **Feedback Summary**\n\n";
  
  // Coverage feedback
  if (coverageScore >= 80) {
    feedback += "✅ **Coverage**: Excellent! You covered most key points.\n";
  } else if (coverageScore >= 50) {
    feedback += "📊 **Coverage**: Good, but there's room for improvement.\n";
  } else {
    feedback += "⚠️ **Coverage**: Significant gaps identified. Review the missed points.\n";
  }
  
  // Jargon feedback
  feedback += generateJargonFeedback(jargonDensity) + "\n";
  
  // Simplicity feedback
  feedback += generateSimplicityFeedback(simplicityScore) + "\n";
  
  // Gap feedback
  if (missedPoints && missedPoints.length > 0) {
    feedback += "\n**🔍 Missing Key Points:**\n";
    for (const missed of missedPoints.slice(0, 5)) {
      feedback += `• ${missed.point}\n`;
    }
    if (missedPoints.length > 5) {
      feedback += `• ... and ${missedPoints.length - 5} more\n`;
    }
  }
  
  // Overall assessment
  feedback += "\n**📈 Overall Assessment:**\n";
  if (coverageScore >= 80 && jargonDensity < 20 && simplicityScore >= 60) {
    feedback += "🌟 Outstanding! Your explanation is clear, comprehensive, and beginner-friendly. You truly understand this concept.";
  } else if (coverageScore >= 60 && jargonDensity < 30 && simplicityScore >= 50) {
    feedback += "👍 Good effort! You're on the right track. Focus on the missed points and simplify your language further.";
  } else if (coverageScore >= 40) {
    feedback += "📚 You have a basic understanding, but there are significant gaps. The Feynman technique works best as a loop — restudy and try again!";
  } else {
    feedback += "🔄 It's okay! This is exactly what the Feynman technique is for — identify what you don't know and go back to study those parts. Try again after reviewing the material.";
  }
  
  return feedback;
}

/**
 * Main analysis function
 */
function analyzeExplanation({
  keyPoints,
  explanation,
  technicalTerms = [],
  customScore = {},
}) {
  if (!keyPoints || keyPoints.length === 0) {
    throw new Error('Key points are required for analysis');
  }
  
  if (!explanation || explanation.length < 5) {
    throw new Error('Explanation is too short. Please write at least 5 words.');
  }
  
  // Clean up the explanation
  const cleanExplanation = explanation.trim();
  
  // Tokenize
  const tokens = tokenize(cleanExplanation);
  const wordCount = tokens.length;
  
  // Match key points
  const { matched, missed, matchedIndices } = matchKeyPoints(
    keyPoints,
    cleanExplanation,
    technicalTerms
  );
  
  // Calculate scores
  const coverageScore = calculateCoverageScore(keyPoints, matchedIndices);
  const jargonDensity = calculateJargonDensity(cleanExplanation, technicalTerms);
  const avgSentenceLength = calculateAvgSentenceLength(cleanExplanation);
  const simplicityScore = calculateSimplicityScore(cleanExplanation);
  const technicalTermCount = extractTechnicalTerms(cleanExplanation, technicalTerms).length;
  
  // Generate feedback
  const gapFeedback = generateGapFeedback(missed);
  const jargonFeedback = generateJargonFeedback(jargonDensity);
  const simplicityFeedback = generateSimplicityFeedback(simplicityScore);
  const overallFeedback = generateOverallFeedback(
    coverageScore,
    jargonDensity,
    simplicityScore,
    missed
  );
  
  // Determine if the explanation is "good enough"
  const isGoodEnough = coverageScore >= 70 && jargonDensity < 30 && simplicityScore >= 50;
  
  return {
    // Scores
    coverageScore: Math.round(coverageScore * 100) / 100,
    jargonDensity: Math.round(jargonDensity * 100) / 100,
    simplicityScore: Math.round(simplicityScore),
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    wordCount,
    technicalTermCount,
    
    // Match details
    matchedPoints: matched.map((m) => m.point),
    missedPoints: missed.map((m) => m.point),
    matchedDetails: matched,
    missedDetails: missed,
    
    // Feedback
    gapFeedback,
    jargonFeedback,
    simplicityFeedback,
    overallFeedback,
    
    // Status
    isGoodEnough,
    coverageGrade: coverageScore >= 80 ? 'excellent' : coverageScore >= 60 ? 'good' : coverageScore >= 40 ? 'fair' : 'poor',
    
    // Raw data for frontend charts
    raw: {
      matchedIndices,
      totalPoints: keyPoints.length,
      matchedCount: matched.length,
      missedCount: missed.length,
    },
  };
}

module.exports = {
  tokenize,
  getStem,
  extractTechnicalTerms,
  calculateJargonDensity,
  calculateAvgSentenceLength,
  calculateSimplicityScore,
  countSyllables,
  countSyllablesWord,
  matchKeyPoints,
  calculateCoverageScore,
  generateGapFeedback,
  generateJargonFeedback,
  generateSimplicityFeedback,
  generateOverallFeedback,
  analyzeExplanation,
  STOPWORDS,
  STEM_MAP,
  STEM_LOOKUP,
};