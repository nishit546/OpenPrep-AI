const { Op } = require('sequelize');
const StudyBuddyRequest = require('../models/StudyBuddyRequest');
const User = require('../models/User');

// ── Constants ────────────────────────────────────────────────────────────

/** Weight factors for the compatibility scoring algorithm. */
const MATCH_WEIGHTS = {
  subjectOverlap: 0.30,
  complementarySubjects: 0.25,
  availabilityOverlap: 0.25,
  studyStyleAlignment: 0.10,
  goalAlignment: 0.10,
};

/** Default expiry duration for open requests (7 days). */
const DEFAULT_EXPIRY_DAYS = 7;

/** Minimum compatibility score to suggest a match. */
const MIN_COMPATIBILITY_SCORE = 30;

/** Day-of-week helpers. */
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ── Request Management ───────────────────────────────────────────────────

/**
 * Create a new study buddy request.
 */
async function createRequest(userId, data) {
  const {
    subjects, strengths, studyGoals, preferredStudyStyle,
    availabilityWindows, timezone, maxSessionMinutes,
  } = data;

  if (!Array.isArray(subjects) || subjects.length === 0) {
    throw new Error('At least one subject is required');
  }

  // Check for existing open request
  const existing = await StudyBuddyRequest.findOne({
    where: { user: userId, status: 'open' },
  });

  if (existing) {
    throw new Error('You already have an open buddy request. Cancel it first or wait for it to expire.');
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRY_DAYS);

  const request = await StudyBuddyRequest.create({
    user: userId,
    subjects: subjects.map((s) => s.toLowerCase().trim()),
    strengths: (strengths || []).map((s) => s.toLowerCase().trim()),
    studyGoals: studyGoals || ['exam_prep'],
    preferredStudyStyle: preferredStudyStyle || 'any',
    availabilityWindows: availabilityWindows || [],
    timezone: timezone || 'UTC',
    maxSessionMinutes: maxSessionMinutes || 120,
    status: 'open',
    expiresAt,
  });

  return request;
}

/**
 * Get all buddy requests for a user.
 */
async function getUserRequests(userId, { status, page = 1, limit = 20 } = {}) {
  const where = { user: userId };
  if (status) where.status = status;

  const offset = (Math.max(1, page) - 1) * limit;

  const { count, rows } = await StudyBuddyRequest.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    offset,
    limit,
  });

  return {
    requests: rows,
    pagination: { total: count, page, totalPages: Math.ceil(count / limit), limit },
  };
}

/**
 * Get a single request by ID.
 */
async function getRequestById(userId, requestId) {
  return StudyBuddyRequest.findOne({
    where: { id: requestId, user: userId },
  });
}

/**
 * Cancel an open buddy request.
 */
async function cancelRequest(userId, requestId) {
  const request = await StudyBuddyRequest.findOne({
    where: { id: requestId, user: userId, status: 'open' },
  });

  if (!request) return null;

  request.status = 'cancelled';
  await request.save();
  return request;
}

/**
 * Pause or resume an open request.
 */
async function togglePause(userId, requestId) {
  const request = await StudyBuddyRequest.findOne({
    where: { id: requestId, user: userId, status: { [Op.in]: ['open', 'paused'] } },
  });

  if (!request) return null;

  request.status = request.status === 'open' ? 'paused' : 'open';
  await request.save();
  return request;
}

/**
 * Auto-expire past-due open requests.
 */
async function expireOverdue() {
  const now = new Date();
  const [updated] = await StudyBuddyRequest.update(
    { status: 'expired' },
    {
      where: {
        status: 'open',
        expiresAt: { [Op.lt]: now },
      },
    }
  );
  return updated;
}

// ── Matching Engine ──────────────────────────────────────────────────────

/**
 * Find the best compatible buddy for a given open request.
 * Returns the top match with a detailed compatibility breakdown.
 */
async function findBestMatch(userId) {
  const request = await StudyBuddyRequest.findOne({
    where: { user: userId, status: 'open' },
  });

  if (!request) return null;

  // Find all other open requests (excluding self)
  const candidates = await StudyBuddyRequest.findAll({
    where: {
      status: 'open',
      user: { [Op.ne]: userId },
      id: { [Op.ne]: request.id },
    },
  });

  if (candidates.length === 0) return null;

  // Score each candidate
  const scored = candidates.map((candidate) => ({
    candidate,
    ...computeCompatibility(request, candidate),
  }));

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the best match if above threshold
  const best = scored[0];
  if (!best || best.score < MIN_COMPATIBILITY_SCORE) {
    return { match: null, candidates: scored.slice(0, 5) };
  }

  return {
    match: {
      requestId: request.id,
      candidateRequestId: best.candidate.id,
      candidateUserId: best.candidate.user,
      score: best.score,
      reasons: best.reasons,
      breakdown: best.breakdown,
    },
    candidates: scored.slice(0, 5),
  };
}

/**
 * Find all potential matches for a request, ranked by compatibility.
 */
async function findPotentialMatches(userId, { limit = 10 } = {}) {
  const request = await StudyBuddyRequest.findOne({
    where: { user: userId, status: 'open' },
  });

  if (!request) return null;

  const candidates = await StudyBuddyRequest.findAll({
    where: {
      status: 'open',
      user: { [Op.ne]: userId },
      id: { [Op.ne]: request.id },
    },
  });

  const scored = candidates.map((candidate) => ({
    candidateUserId: candidate.user,
    candidateRequestId: candidate.id,
    ...computeCompatibility(request, candidate),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

/**
 * Accept a match — mark both requests as matched.
 */
async function acceptMatch(userId, candidateRequestId) {
  const userRequest = await StudyBuddyRequest.findOne({
    where: { user: userId, status: 'open' },
  });

  if (!userRequest) return null;

  const candidateRequest = await StudyBuddyRequest.findByPk(candidateRequestId);
  if (!candidateRequest || candidateRequest.status !== 'open') {
    throw new Error('Candidate request is no longer available');
  }

  // Compute final compatibility
  const compat = computeCompatibility(userRequest, candidateRequest);

  // Update both requests
  userRequest.status = 'matched';
  userRequest.matchedWith = candidateRequest.user;
  userRequest.matchedAt = new Date();
  userRequest.compatibilityScore = compat.score;
  userRequest.matchReasons = compat.reasons;

  candidateRequest.status = 'matched';
  candidateRequest.matchedWith = userId;
  candidateRequest.matchedAt = new Date();
  candidateRequest.compatibilityScore = compat.score;
  candidateRequest.matchReasons = compat.reasons;

  await Promise.all([userRequest.save(), candidateRequest.save()]);

  return {
    userRequest,
    candidateRequest,
    compatibility: compat,
  };
}

/**
 * Record a session completion for matched buddies.
 */
async function recordSession(userId, requestId) {
  const request = await StudyBuddyRequest.findOne({
    where: { id: requestId, user: userId, status: 'matched' },
  });

  if (!request) return null;

  request.totalSessions = (request.totalSessions || 0) + 1;
  request.lastSessionAt = new Date();
  await request.save();

  // Also update the buddy's record
  const buddyRequest = await StudyBuddyRequest.findOne({
    where: { user: request.matchedWith, status: 'matched', matchedWith: userId },
  });

  if (buddyRequest) {
    buddyRequest.totalSessions = (buddyRequest.totalSessions || 0) + 1;
    buddyRequest.lastSessionAt = new Date();
    await buddyRequest.save();
  }

  return request;
}

/**
 * Submit feedback for a matched buddy.
 */
async function submitFeedback(userId, requestId, { rating, feedback }) {
  const request = await StudyBuddyRequest.findOne({
    where: { id: requestId, user: userId, status: 'matched' },
  });

  if (!request) return null;

  if (rating !== undefined) request.rating = rating;
  if (feedback !== undefined) request.feedback = feedback;
  await request.save();

  return request;
}

// ── Compatibility Scoring Engine ─────────────────────────────────────────

/**
 * Compute a 0-100 compatibility score between two buddy requests.
 * Returns { score, reasons, breakdown }.
 */
function computeCompatibility(requestA, requestB) {
  const breakdown = {};
  const reasons = [];
  let totalScore = 0;

  // 1. Subject Overlap — both want to study the same subjects
  const overlapSubjects = requestA.subjects.filter((s) => requestB.subjects.includes(s));
  const allSubjects = [...new Set([...requestA.subjects, ...requestB.subjects])];
  const overlapRatio = allSubjects.length > 0 ? overlapSubjects.length / allSubjects.length : 0;
  const subjectScore = Math.round(overlapRatio * 100 * MATCH_WEIGHTS.subjectOverlap);
  breakdown.subjectOverlap = subjectScore;
  totalScore += subjectScore;

  if (overlapSubjects.length > 0) {
    reasons.push(`Shared subjects: ${overlapSubjects.join(', ')}`);
  }

  // 2. Complementary Subjects — A's strengths match B's weaknesses and vice versa
  const aHelpsB = requestA.strengths.filter((s) => requestB.subjects.includes(s));
  const bHelpsA = requestB.strengths.filter((s) => requestA.subjects.includes(s));
  const complementCount = aHelpsB.length + bHelpsA.length;
  const maxComplement = Math.max(requestA.subjects.length, requestB.subjects.length, 1);
  const complementRatio = Math.min(complementCount / maxComplement, 1);
  const complementScore = Math.round(complementRatio * 100 * MATCH_WEIGHTS.complementarySubjects);
  breakdown.complementarySubjects = complementScore;
  totalScore += complementScore;

  if (aHelpsB.length > 0) {
    reasons.push(`${requestA.user} can tutor in: ${aHelpsB.join(', ')}`);
  }
  if (bHelpsA.length > 0) {
    reasons.push(`${requestB.user} can tutor in: ${bHelpsA.join(', ')}`);
  }

  // 3. Availability Overlap
  const availScore = computeAvailabilityOverlap(
    requestA.availabilityWindows, requestB.availabilityWindows,
  );
  const availWeighted = Math.round(availScore * 100 * MATCH_WEIGHTS.availabilityOverlap);
  breakdown.availabilityOverlap = availWeighted;
  totalScore += availWeighted;

  if (availScore > 0.5) {
    reasons.push('Strong schedule overlap detected');
  } else if (availScore > 0.2) {
    reasons.push('Moderate schedule overlap');
  }

  // 4. Study Style Alignment
  const styleScore = computeStudyStyleAlignment(
    requestA.preferredStudyStyle, requestB.preferredStudyStyle,
  );
  const styleWeighted = Math.round(styleScore * 100 * MATCH_WEIGHTS.studyStyleAlignment);
  breakdown.studyStyleAlignment = styleWeighted;
  totalScore += styleWeighted;

  if (styleScore >= 0.8) {
    reasons.push('Preferred study styles align well');
  }

  // 5. Goal Alignment
  const goalOverlap = requestA.studyGoals.filter((g) => requestB.studyGoals.includes(g));
  const allGoals = [...new Set([...requestA.studyGoals, ...requestB.studyGoals])];
  const goalRatio = allGoals.length > 0 ? goalOverlap.length / allGoals.length : 0;
  const goalScore = Math.round(goalRatio * 100 * MATCH_WEIGHTS.goalAlignment);
  breakdown.goalAlignment = goalScore;
  totalScore += goalScore;

  if (goalOverlap.length > 0) {
    reasons.push(`Shared goals: ${goalOverlap.join(', ')}`);
  }

  return {
    score: Math.min(100, Math.round(totalScore)),
    reasons,
    breakdown,
  };
}

/**
 * Compute availability overlap between two sets of windows.
 * Returns a 0-1 fraction of overlapping hours.
 */
function computeAvailabilityOverlap(windowsA, windowsB) {
  if (!windowsA.length || !windowsB.length) return 0;

  let totalOverlapHours = 0;
  let totalPossibleHours = 0;

  for (const day of DAYS_OF_WEEK) {
    const dayWindowsA = windowsA.filter((w) => w.day === day);
    const dayWindowsB = windowsB.filter((w) => w.day === day);

    // Compute hours covered by either party on this day
    const coveredHours = new Set();
    for (const w of [...dayWindowsA, ...dayWindowsB]) {
      for (let h = w.startHour; h < w.endHour; h++) {
        coveredHours.add(h);
      }
    }
    totalPossibleHours += coveredHours.size;

    // Compute overlapping hours
    for (const wA of dayWindowsA) {
      for (const wB of dayWindowsB) {
        const overlapStart = Math.max(wA.startHour, wB.startHour);
        const overlapEnd = Math.min(wA.endHour, wB.endHour);
        if (overlapEnd > overlapStart) {
          totalOverlapHours += overlapEnd - overlapStart;
        }
      }
    }
  }

  return totalPossibleHours > 0 ? totalOverlapHours / totalPossibleHours : 0;
}

/**
 * Compute study style alignment. Returns 0-1.
 */
function computeStudyStyleAlignment(styleA, styleB) {
  if (styleA === 'any' || styleB === 'any') return 0.7;
  if (styleA === styleB) return 1.0;

  // Partial compatibility matrix
  const compatibility = {
    discuss: { quiz_each_other: 0.6, teach_back: 0.8, silent_together: 0.3 },
    quiz_each_other: { discuss: 0.6, teach_back: 0.5, silent_together: 0.2 },
    teach_back: { discuss: 0.8, quiz_each_other: 0.5, silent_together: 0.4 },
    silent_together: { discuss: 0.3, quiz_each_other: 0.2, teach_back: 0.4 },
  };

  return compatibility[styleA]?.[styleB] || 0.5;
}

// ── Dashboard ────────────────────────────────────────────────────────────

/**
 * Get a combined dashboard view for study buddy features.
 */
async function getDashboard(userId) {
  const [openRequests, matchedPairs, recentActivity] = await Promise.all([
    StudyBuddyRequest.findAll({
      where: { user: userId, status: 'open' },
    }),
    StudyBuddyRequest.findAll({
      where: { user: userId, status: 'matched' },
      order: [['totalSessions', 'DESC']],
    }),
    StudyBuddyRequest.findAll({
      where: { user: userId, status: { [Op.in]: ['matched', 'expired', 'cancelled'] } },
      order: [['updatedAt', 'DESC']],
      limit: 10,
    }),
  ]);

  const totalSessions = matchedPairs.reduce((sum, p) => sum + (p.totalSessions || 0), 0);
  const avgRating = matchedPairs.filter((p) => p.rating).length > 0
    ? matchedPairs
      .filter((p) => p.rating)
      .reduce((sum, p) => sum + p.rating, 0) / matchedPairs.filter((p) => p.rating).length
    : null;

  return {
    openRequests: openRequests.length,
    matchedBuddies: matchedPairs.map((p) => ({
      buddyId: p.matchedWith,
      matchedAt: p.matchedAt,
      compatibilityScore: p.compatibilityScore,
      totalSessions: p.totalSessions,
      lastSessionAt: p.lastSessionAt,
      rating: p.rating,
    })),
    totalSessions,
    averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
    recentActivity,
  };
}

// ── Exports ──────────────────────────────────────────────────────────────

module.exports = {
  // Request management
  createRequest,
  getUserRequests,
  getRequestById,
  cancelRequest,
  togglePause,
  expireOverdue,

  // Matching
  findBestMatch,
  findPotentialMatches,
  acceptMatch,
  recordSession,
  submitFeedback,

  // Dashboard
  getDashboard,

  // Exposed for testing
  computeCompatibility,
  computeAvailabilityOverlap,
  computeStudyStyleAlignment,

  // Constants
  MATCH_WEIGHTS,
  MIN_COMPATIBILITY_SCORE,
  DEFAULT_EXPIRY_DAYS,
  DAYS_OF_WEEK,
};
