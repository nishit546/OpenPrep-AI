const { Op, fn, col } = require('sequelize');
const PDFDocument = require('pdfkit');
const Progress = require('../models/Progress');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');
const Exam = require('../models/Exam');
const Feedback = require('../models/Feedback');
const { checkAndAwardBadges } = require('../services/achievementService');
const analyticsAggregationService = require('../services/analyticsAggregationService');
const FocusSession = require('../models/FocusSession');const Flashcard = require('../models/Flashcard');
const StudyPlan = require('../models/StudyPlan');
const SubjectGoal = require('../models/SubjectGoal');
const cacheManager = require('../utils/cacheManager');
// ── Mastery tier thresholds (shared with the dashboard UI) ──
// Beginner: < 50% | Intermediate: 50-79% | Master: 80%+
const MASTERY_TIER_BEGINNER = 50;
const MASTERY_TIER_MASTER = 80;
// A flashcard is considered "mastered" once its SM-2 interval reaches 21+ days
const FLASHCARD_MASTERY_INTERVAL_DAYS = 21;

/**
 * Map a mastery percentage (0-100) to a tier label.
 * @param {number} pct
 * @returns {'Beginner'|'Intermediate'|'Master'}
 */
function masteryTier(pct) {
  if (pct >= MASTERY_TIER_MASTER) return 'Master';
  if (pct >= MASTERY_TIER_BEGINNER) return 'Intermediate';
  return 'Beginner';
}

/**
 * Combine quiz accuracy and flashcard retention into a single mastery score.
 * When both signals exist they are weighted 60/40; otherwise the available
 * signal is used alone. Returns 0 when no signal exists.
 */
function combineMastery(quizAccuracy, flashcardRetention) {
  if (quizAccuracy != null && flashcardRetention != null) {
    return Math.round(quizAccuracy * 0.6 + flashcardRetention * 0.4);
  }
  if (quizAccuracy != null) return Math.round(quizAccuracy);
  if (flashcardRetention != null) return Math.round(flashcardRetention);
  return 0;
}
/**
 * @swagger
 * /api/progress/dashboard:
 *   get:
 *     summary: Retrieve dashboard metrics and activity feed
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check Redis cache for 5-minute cached response
    const cacheKey = cacheManager.generateKey(userId, 'dashboard');
    try {
      const cachedData = await cacheManager.get(cacheKey);
      if (cachedData) {
        const parsed = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
        return res.status(200).json({
          success: true,
          data: parsed,
          cached: true,
        });
      }
    } catch (cacheErr) {
      // Graceful fallback if Redis is unavailable
    }

    // 1. User profile stats (streak & study hours)
    const streak = req.user.streakCount || 0;
    const streakFreezes = req.user.streakFreezes || 0;
    const totalStudyHours = req.user.studyHours || 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // Run database aggregate queries in parallel to eliminate database latency bottlenecks
    const [
      totalTopicsCount,
      topicStats,
      totalCompletionResult,
      attemptsCount,
      progressHistory,
      activePlan,
      activities,
    ] = await Promise.all([
      Topic.count({ where: { user: userId } }),
      Topic.findAll({
        attributes: ['status', [fn('COUNT', col('status')), 'count']],
        where: { user: userId },
        group: ['status'],
        raw: true,
      }),
      Progress.findAll({
        attributes: [[fn('SUM', col('completionPercentage')), 'totalCompletion']],
        where: { user: userId },
        raw: true,
      }),
      QuizAttempt.count({ where: { user: userId } }),
      Progress.findAll({
        attributes: [
          [fn('DATE', col('updatedAt')), 'date'],
          [fn('SUM', col('studyHours')), 'totalStudyHours'],
          [fn('AVG', col('completionPercentage')), 'avgCompletion'],
        ],
        where: {
          user: userId,
          updatedAt: { [Op.gte]: sevenDaysAgo },
        },
        group: [fn('DATE', col('updatedAt'))],
        order: [[fn('DATE', col('updatedAt')), 'ASC']],
        raw: true,
      }),
      StudyPlan.findOne({
        where: { user: userId, status: 'active' },
      }),
      ActivityLog.findAll({
        where: { user: userId },
        order: [['createdAt', 'DESC']],
        limit: 10,
      }),
    ]);

    // 2. Process topic breakdown counts
    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;

    topicStats.forEach((t) => {
      const count = parseInt(t.count, 10) || 0;
      if (t.status === 'Strong') strongCount = count;
      else if (t.status === 'Medium') mediumCount = count;
      else if (t.status === 'Weak') weakCount = count;
    });

    // Calculate syllabus progress percentage
    const totalCompletionSum = parseFloat(totalCompletionResult[0]?.totalCompletion) || 0;
    const syllabusProgress =
      totalTopicsCount > 0 ? Math.round(totalCompletionSum / totalTopicsCount) : 0;

    // 3. Construct 7-day study hours chart data
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyChartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];

      const record = progressHistory.find((r) => r.date === dateStr);
      weeklyChartData.push({
        day: dayNames[date.getDay()],
        hours: record ? parseFloat(record.totalStudyHours) || 0 : 0,
        completion: record ? Math.round(parseFloat(record.avgCompletion)) || 0 : 0,
      });
    }

    // 4. Calculate countdown and required daily velocity
    let daysUntilExam = null;
    let requiredDailyMinutes = 0;
    const targetDateStr = req.user.examCountdownPreferences?.targetExamDate;
    if (targetDateStr) {
      const targetDate = new Date(targetDateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      daysUntilExam = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    let totalUncompletedDuration = 0;
    if (activePlan && Array.isArray(activePlan.dailyGoals)) {
      activePlan.dailyGoals.forEach((goal) => {
        if (goal && Array.isArray(goal.tasks)) {
          goal.tasks.forEach((task) => {
            if (!task.completed) {
              totalUncompletedDuration += task.duration || 60;
            }
          });
        }
      });
    }

    if (daysUntilExam !== null) {
      if (daysUntilExam > 0) {
        requiredDailyMinutes = Math.ceil(totalUncompletedDuration / daysUntilExam);
      } else if (daysUntilExam === 0) {
        requiredDailyMinutes = totalUncompletedDuration;
      }
    }

    const loggedHoursToday = weeklyChartData[weeklyChartData.length - 1]?.hours || 0;
    const loggedMinutesToday = Math.round(loggedHoursToday * 60);

    let paceStatus = 'On Track';
    if (targetDateStr) {
      if (loggedMinutesToday < requiredDailyMinutes) {
        if (loggedMinutesToday >= requiredDailyMinutes * 0.5) {
          paceStatus = 'Slightly Behind';
        } else {
          paceStatus = 'Action Required';
        }
      }
    } else {
      paceStatus = null;
    }

    const responsePayload = {
      streak,
      streakFreezes,
      totalStudyHours,
      syllabusProgress,
      topicsBreakdown: {
        total: totalTopicsCount,
        strong: strongCount,
        medium: mediumCount,
        weak: weakCount,
      },
      attemptsCount,
      weeklyChartData,
      recentActivity: activities,
      examCountdown: {
        targetExamDate: targetDateStr || null,
        daysUntilExam,
        requiredDailyMinutes,
        loggedMinutesToday,
        paceStatus,
      },
    };

    // Cache dashboard response for 5 minutes (300 seconds)
    try {
      await cacheManager.set(cacheKey, responsePayload, 300);
    } catch (cacheErr) {
      // Graceful fallback
    }

    res.status(200).json({
      success: true,
      data: responsePayload,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed subject-wise performance breakdown
// @route   GET /api/progress/subjects
// @access  Private
exports.getSubjectBreakdown = async (req, res, next) => {
  try {
    // Aggregate progress stats per subject directly in PostgreSQL
    const breakdown = await Progress.findAll({
      where: { user: req.user.id },
      attributes: [
        [fn('COUNT', col('topic')), 'topicsCount'],
        [fn('SUM', col('completionPercentage')), 'totalCompletion'],
        [fn('SUM', col('studyHours')), 'totalHours'],
        [fn('SUM', col('flashcardsMastered')), 'flashcardsMastered'],
      ],
      include: [{ model: Subject, as: 'subjectRef', attributes: ['name'] }],
      group: ['subjectRef.id'],
      raw: true,
    });

    const result = breakdown
      .filter((b) => b['subjectRef.name'])
      .map((b) => ({
        subjectName: b['subjectRef.name'],
        progressPercentage:
          parseInt(b.topicsCount, 10) > 0
            ? Math.round(parseFloat(b.totalCompletion) / parseInt(b.topicsCount, 10))
            : 0,
        studyHours: parseFloat(b.totalHours) || 0,
        flashcardsMastered: parseInt(b.flashcardsMastered, 10) || 0,
      }));

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subject & chapter mastery levels (quiz accuracy + flashcard retention)
// @route   GET /api/progress/mastery
// @access  Private
exports.getMasteryLevels = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch all data needed for the calculation in parallel
const [subjects, topics, progressRecords, flashcards, subjectGoals] = await Promise.all([
  Subject.findAll({ where: { user: userId } }),
  Topic.findAll({ where: { user: userId } }),
  Progress.findAll({ where: { user: userId } }),
  Flashcard.findAll({
    where: { user: userId },
    attributes: ['id', 'subject', 'topic', 'interval'],
    raw: true,
  }),
  SubjectGoal.findAll({
    where: { user: userId },
    raw: true,
  }),
]);
    const topicsBySubject = new Map();
    topics.forEach((t) => {
      if (!topicsBySubject.has(t.subject)) topicsBySubject.set(t.subject, []);
      topicsBySubject.get(t.subject).push(t);
    });

    // Index progress quiz scores per topic & per subject
    const quizScoresByTopic = new Map();
    const quizScoresBySubject = new Map();
    progressRecords.forEach((p) => {
      const scores = Array.isArray(p.quizScores)
        ? p.quizScores.filter((qs) => typeof qs?.score === 'number').map((qs) => qs.score)
        : [];
      if (scores.length === 0) return;

      if (p.topic) {
        const acc = quizScoresByTopic.get(p.topic) || [];
        acc.push(...scores);
        quizScoresByTopic.set(p.topic, acc);
      }
      if (p.subject) {
        const acc = quizScoresBySubject.get(p.subject) || [];
        acc.push(...scores);
        quizScoresBySubject.set(p.subject, acc);
      }
    });

    // Index flashcard retention per topic & per subject
    const flashcardsByTopic = new Map();
    const flashcardsBySubject = new Map();
    flashcards.forEach((f) => {
      if (f.topic) {
        const acc = flashcardsByTopic.get(f.topic) || [];
        acc.push(f);
        flashcardsByTopic.set(f.topic, acc);
      }
      if (f.subject) {
        const acc = flashcardsBySubject.get(f.subject) || [];
        acc.push(f);
        flashcardsBySubject.set(f.subject, acc);
      }
    });

    const avg = (arr) => (arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
    const retentionPct = (cards) => {
      if (!cards || cards.length === 0) return null;
      const mastered = cards.filter((c) => c.interval >= FLASHCARD_MASTERY_INTERVAL_DAYS).length;
      return (mastered / cards.length) * 100;
    };

    // Per-chapter mastery
    const chapterMastery = new Map();
    topics.forEach((topic) => {
      const quizAccuracy = avg(quizScoresByTopic.get(topic.id) || []);
      const flashcardRetention = retentionPct(flashcardsByTopic.get(topic.id));
      const masteryPercentage = combineMastery(quizAccuracy, flashcardRetention);
      chapterMastery.set(topic.id, {
        id: topic.id,
        name: topic.name,
        masteryPercentage,
        tier: masteryTier(masteryPercentage),
      });
    });

    // Per-subject mastery = weighted average of its chapters (by topic weightage)
    const subjectsMastery = subjects.map((subject) => {
      const subjectTopics = topicsBySubject.get(subject.id) || [];
      const chapters = subjectTopics
        .map((t) => chapterMastery.get(t.id))
        .filter(Boolean);

      let masteryPercentage;
      if (chapters.length > 0) {
        const totalWeight = subjectTopics.reduce((s, t) => s + (t.weightage || 0), 0);
        if (totalWeight > 0) {
          masteryPercentage = Math.round(
            chapters.reduce(
              (s, ch, i) => s + ch.masteryPercentage * (subjectTopics[i].weightage || 0),
              0
            ) / totalWeight
          );
        } else {
          masteryPercentage = Math.round(
            chapters.reduce((s, ch) => s + ch.masteryPercentage, 0) / chapters.length
          );
        }
      } else {
        // No chapters recorded — fall back to direct subject-level signals
        const quizAccuracy = avg(quizScoresBySubject.get(subject.id) || []);
        const flashcardRetention = retentionPct(flashcardsBySubject.get(subject.id));
        masteryPercentage = combineMastery(quizAccuracy, flashcardRetention);
      }
const actualScore = Math.round(avg(quizScoresBySubject.get(subject.id) || []) || 0);
const targetPercentage = goalsBySubject.get(subject.id) ?? null;
const performanceGap =
  targetPercentage === null ? null : Math.max(0, targetPercentage - actualScore);
return {
  id: subject.id,
  name: subject.name,
  masteryPercentage,
  tier: masteryTier(masteryPercentage),
  chapters,
  actualScore,
  targetPercentage,
  performanceGap,
};    });

    // Overall mastery = average across subjects
    const overallMastery =
      subjectsMastery.length > 0
        ? Math.round(
            subjectsMastery.reduce((s, sub) => s + sub.masteryPercentage, 0) /
              subjectsMastery.length
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        overallMastery,
        overallTier: masteryTier(overallMastery),
        subjects: subjectsMastery,
      },
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Set or update a subject target score
// @route   PUT /api/progress/subject-goals/:subjectId
// @access  Private
exports.updateSubjectGoal = async (req, res, next) => {
  try {
    const { subjectId } = req.params;
    const targetPercentage = Number(req.body.targetPercentage);

    if (!Number.isFinite(targetPercentage) || targetPercentage < 0 || targetPercentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Target percentage must be between 0 and 100',
      });
    }

    const subject = await Subject.findOne({
      where: {
        id: subjectId,
        user: req.user.id,
      },
    });

    if (!subject) {
      return res.status(404).json({
        success: false,
        error: 'Subject not found',
      });
    }

    const [goal] = await SubjectGoal.findOrCreate({
      where: {
        user: req.user.id,
        subject: subjectId,
      },
      defaults: {
        targetPercentage,
      },
    });

    if (goal.targetPercentage !== targetPercentage) {
      goal.targetPercentage = targetPercentage;
      await goal.save();
    }

    res.status(200).json({
      success: true,
      data: goal,
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Get Target Exam Composite Bundle Overview with cumulative weighted syllabus progress
// @route   GET /api/progress/composite-overview
// @access  Private
exports.getCompositeBundleOverview = async (req, res, next) => {
  try {
const goalsBySubject = new Map(
  subjectGoals.map((goal) => [goal.subject, Number(goal.targetPercentage)])
);    const { examId } = req.query;

    let exam;
    if (examId) {
      exam = await Exam.findOne({ where: { id: examId, user: userId } });
    } else {
      exam = await Exam.findOne({
        where: { user: userId, isBundle: true },
        order: [['createdAt', 'DESC']],
      });
      if (!exam) {
        exam = await Exam.findOne({
          where: { user: userId },
          order: [['date', 'ASC']],
        });
      }
    }

    if (!exam) {
      return res.status(200).json({
        success: true,
        data: null,
      });
    }

    const subjects = await Subject.findAll({ where: { exam: exam.id, user: userId } });
    let totalWeightedProgress = 0;
    let totalWeightage = 0;
    const subjectBreakdown = [];

    for (const sub of subjects) {
      const topics = await Topic.findAll({ where: { subject: sub.id, user: userId } });
      const topicCount = topics.length;

      let subProgress = 0;
      if (topicCount > 0) {
        const topicIds = topics.map((t) => t.id);
        const [sumResult] = await Progress.findAll({
          attributes: [[fn('SUM', col('completionPercentage')), 'totalCompletion']],
          where: { user: userId, topic: { [Op.in]: topicIds } },
          raw: true,
        });
        const sum = parseFloat(sumResult?.totalCompletion) || 0;
        subProgress = Math.round(sum / topicCount);
      }

      const weightage = sub.weightage || (subjects.length > 0 ? 100 / subjects.length : 0);
      totalWeightedProgress += subProgress * weightage;
      totalWeightage += weightage;

      subjectBreakdown.push({
        id: sub.id,
        name: sub.name,
        description: sub.description,
        weightage: Math.round(weightage * 10) / 10,
        topicCount,
        progressPercentage: subProgress,
      });
    }

    const cumulativeProgress = totalWeightage > 0 ? Math.round(totalWeightedProgress / totalWeightage) : 0;

    res.status(200).json({
      success: true,
      data: {
        examId: exam.id,
        examName: exam.name,
        description: exam.description,
        examDate: exam.date,
        isBundle: exam.isBundle || false,
        targetExamType: exam.targetExamType || 'Custom',
        cumulativeProgress,
        totalSubjects: subjects.length,
        subjects: subjectBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};


// @desc    Get study hours tracking data
// @route   GET /api/progress/study-hours
// @access  Private
exports.getStudyHours = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const totalStudyHours = req.user.studyHours || 0;

    // Weekly study hours from Progress records (last 7 calendar days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const progressHistory = await Progress.findAll({
      attributes: [
        [fn('DATE', col('updatedAt')), 'date'],
        [fn('SUM', col('studyHours')), 'totalStudyHours'],
      ],
      where: {
        user: userId,
        updatedAt: { [Op.gte]: sevenDaysAgo },
      },
      group: [fn('DATE', col('updatedAt'))],
      order: [[fn('DATE', col('updatedAt')), 'ASC']],
      raw: true,
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];

      const record = progressHistory.find((r) => r.date === dateStr);
      weeklyData.push({
        day: dayNames[date.getDay()],
        hours: record ? parseFloat(record.totalStudyHours) || 0 : 0,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        totalStudyHours,
        weeklyData,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Log study time for a topic/subject
// @route   POST /api/progress/track
// @access  Private
exports.trackStudyTime = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { studyHours, subjectId, topicId, description } = req.body;

    if (studyHours == null || studyHours <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid study hours (must be greater than 0)',
      });
    }

    // If a topic is specified, update or create a Progress record
    if (topicId && subjectId) {
      const [progress, created] = await Progress.findOrCreate({
        where: { user: userId, topic: topicId },
        defaults: {
          user: userId,
          subject: subjectId,
          topic: topicId,
          studyHours: parseFloat(studyHours),
          completionPercentage: 0,
        },
      });
      if (!created) {
        progress.studyHours = (progress.studyHours || 0) + parseFloat(studyHours);
        await progress.save();
      }
    } else if (subjectId) {
      // If only subject is specified, update or create a Progress record for that subject
      const [progress, created] = await Progress.findOrCreate({
        where: { user: userId, subject: subjectId, topic: null },
        defaults: {
          user: userId,
          subject: subjectId,
          topic: null,
          studyHours: parseFloat(studyHours),
          completionPercentage: 0,
        },
      });
      if (!created) {
        progress.studyHours = (progress.studyHours || 0) + parseFloat(studyHours);
        await progress.save();
      }
    }

    // Log activity
    await ActivityLog.create({
      user: userId,
      activityType: 'study_plan_create',
      description: description || `Studied for ${studyHours} hour${studyHours !== 1 ? 's' : ''}`,
    });

    // Accumulate total study hours on the user record AFTER progress + activity succeed
    req.user.studyHours = (req.user.studyHours || 0) + parseFloat(studyHours);
    await req.user.save();

    res.status(200).json({
      success: true,
      data: {
        totalStudyHours: req.user.studyHours,
        hoursLogged: parseFloat(studyHours),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update topic progress (completion, flashcards, quiz scores)
// @route   PUT /api/progress/topic/:id
// @access  Private
exports.updateTopicProgress = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const topicId = req.params.id;

    const topic = await Topic.findOne({ where: { id: topicId, user: userId } });
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const { completionPercentage, studyHours, flashcardsMastered, quizScores } = req.body;

    // Find or create a Progress record for this topic
    const subjectId = topic.subject;
    const [progress, created] = await Progress.findOrCreate({
      where: { user: userId, topic: topicId },
      defaults: {
        user: userId,
        subject: subjectId,
        topic: topicId,
        completionPercentage: completionPercentage ?? 0,
        studyHours: studyHours ?? 0,
        flashcardsMastered: flashcardsMastered ?? 0,
        quizScores: quizScores ?? [],
      },
    });

    if (!created) {
      if (completionPercentage !== undefined) progress.completionPercentage = completionPercentage;
      if (studyHours !== undefined) progress.studyHours = studyHours;
      if (flashcardsMastered !== undefined) progress.flashcardsMastered = flashcardsMastered;
      if (quizScores !== undefined) progress.quizScores = quizScores;
      await progress.save();
    }

    return res.status(200).json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activity feed
// @route   GET /api/progress/activity
// @access  Private
exports.getActivityFeed = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { activityType, dateFrom, dateTo, limit, offset } = req.query;

    const where = { user: userId };
    if (activityType) {
      where.activityType = activityType;
    }
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) where.timestamp[Op.lte] = new Date(dateTo);
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    const activities = await ActivityLog.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: safeLimit,
      offset: safeOffset,
    });

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};

// ── Helper: build export rows from user's progress data ──
async function buildExportRows(userId) {
  const subjects = await Subject.findAll({
    where: { user: userId },
    include: [{ model: Exam, as: 'examRef', attributes: ['name'] }],
    raw: true,
    nest: true,
  });

  const topics = await Topic.findAll({
    where: { user: userId },
    raw: true,
  });

  const progressRecords = await Progress.findAll({
    where: { user: userId },
    raw: true,
  });

  const quizAttempts = await QuizAttempt.findAll({
    where: { user: userId },
    attributes: ['score', 'totalQuestions', 'createdAt'],
    order: [['createdAt', 'DESC']],
    raw: true,
  });

  // Build a lookup: topicId -> progress
  const progressByTopic = {};
  const progressBySubject = {};
  for (const p of progressRecords) {
    if (p.topic) {
      progressByTopic[p.topic] = p;
    } else {
      progressBySubject[p.subject] = p;
    }
  }

  // Build a lookup: subjectId -> subject
  const subjectMap = {};
  for (const s of subjects) {
    subjectMap[s.id] = s;
  }

  const rows = [];

  for (const topic of topics) {
    const subject = subjectMap[topic.subject];
    const prog = progressByTopic[topic.id] || progressBySubject[topic.subject] || {};
    rows.push({
      examName: subject?.examRef?.name || 'N/A',
      subjectName: subject?.name || 'N/A',
      topicName: topic.name,
      topicStatus: topic.status || 'Medium',
      completionPercentage: prog.completionPercentage ?? 0,
      studyHours: prog.studyHours ?? 0,
      flashcardsMastered: prog.flashcardsMastered ?? 0,
    });
  }

  // Include subjects without topics
  for (const subject of subjects) {
    const hasTopics = topics.some((t) => t.subject === subject.id);
    if (!hasTopics) {
      const prog = progressBySubject[subject.id] || {};
      rows.push({
        examName: subject.examRef?.name || 'N/A',
        subjectName: subject.name,
        topicName: '(No topics)',
        topicStatus: 'N/A',
        completionPercentage: prog.completionPercentage ?? 0,
        studyHours: prog.studyHours ?? 0,
        flashcardsMastered: prog.flashcardsMastered ?? 0,
      });
    }
  }

  return { rows, quizAttempts };
}

// @desc    Export progress report as CSV
// @route   GET /api/progress/export/csv
// @access  Private
exports.exportCSV = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows, quizAttempts } = await buildExportRows(userId);

    const headers = [
      'Exam',
      'Subject',
      'Topic',
      'Status',
      'Completion %',
      'Study Hours',
      'Flashcards Mastered',
    ];

    const escapeCSV = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csv = headers.join(',') + '\n';
    for (const row of rows) {
      csv += [
        escapeCSV(row.examName),
        escapeCSV(row.subjectName),
        escapeCSV(row.topicName),
        escapeCSV(row.topicStatus),
        row.completionPercentage,
        row.studyHours,
        row.flashcardsMastered,
      ].join(',') + '\n';
    }

    // Append quiz attempts summary
    csv += '\n';
    csv += 'Quiz Attempts Summary\n';
    csv += 'Score,Total Questions,Percentage,Date\n';
    for (const attempt of quizAttempts.slice(0, 50)) {
      const pct = attempt.totalQuestions > 0
        ? Math.round((attempt.score / attempt.totalQuestions) * 100)
        : 0;
      csv += [
        attempt.score,
        attempt.totalQuestions,
        `${pct}%`,
        escapeCSV(new Date(attempt.createdAt).toLocaleDateString()),
      ].join(',') + '\n';
    }

    const filename = `progress_report_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export progress report data as JSON (for frontend PDF generation)
// @route   GET /api/progress/export/pdf-data
// @access  Private
exports.exportPDFData = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows, quizAttempts } = await buildExportRows(userId);

    const totalStudyHours = req.user.studyHours || 0;
    const streak = req.user.streakCount || 0;

    const totalTopics = await Topic.count({ where: { user: userId } });
    const [completionResult] = await Progress.findAll({
      attributes: [[fn('SUM', col('completionPercentage')), 'totalCompletion']],
      where: { user: userId },
      raw: true,
    });
    const syllabusProgress = totalTopics > 0
      ? Math.round((parseFloat(completionResult?.totalCompletion) || 0) / totalTopics)
      : 0;

    res.status(200).json({
      rows,
      quizAttempts,
      totalStudyHours,
      streak,
      totalTopics,
      syllabusProgress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export progress report as PDF certificate/report card using pdfkit
// @route   GET /api/progress/export/pdf
// @access  Private
exports.exportPDF = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { rows, quizAttempts } = await buildExportRows(userId);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const filename = `progress_report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Title / Header
    doc.fillColor('#1a365d').fontSize(22).text('OpenPrep AI - Student Progress Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#4a5568').fontSize(11).text(`Student Name: ${req.user.name || 'Scholar'}`, { align: 'center' });
    doc.text(`Generated On: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.2);

    // Summary Section Box
    doc.fillColor('#2b6cb0').fontSize(14).text('Academic Summary', { underline: true });
    doc.moveDown(0.4);
    doc.fillColor('#2d3748').fontSize(10);
    doc.text(`• Total Study Hours Logged: ${(req.user.studyHours || 0).toFixed(1)} hours`);
    doc.text(`• Study Streak: ${req.user.streakCount || 0} Days`);
    doc.text(`• Total Topics Tracked: ${rows.length}`);
    doc.text(`• Total Quiz Attempts: ${quizAttempts.length}`);
    doc.moveDown(1.2);

    // Topic & Subject Breakdown Table Header
    doc.fillColor('#2b6cb0').fontSize(14).text('Topic & Subject Mastery Breakdown', { underline: true });
    doc.moveDown(0.6);

    // Table Header
    doc.fillColor('#1a202c').fontSize(9).font('Helvetica-Bold');
    const startY = doc.y;
    doc.text('Subject', 50, startY, { width: 120 });
    doc.text('Topic', 170, startY, { width: 150 });
    doc.text('Status', 320, startY, { width: 70 });
    doc.text('Completion', 390, startY, { width: 80 });
    doc.text('Hours', 470, startY, { width: 60 });
    doc.moveDown(0.4);

    doc.font('Helvetica').fontSize(9).fillColor('#4a5568');
    if (rows.length === 0) {
      doc.text('No subject or topic progress data recorded yet.');
    } else {
      for (const row of rows.slice(0, 35)) {
        if (doc.y > 720) {
          doc.addPage();
        }
        const currentY = doc.y;
        doc.text(row.subjectName.substring(0, 22), 50, currentY, { width: 120 });
        doc.text(row.topicName.substring(0, 28), 170, currentY, { width: 150 });
        doc.text(row.topicStatus, 320, currentY, { width: 70 });
        doc.text(`${row.completionPercentage}%`, 390, currentY, { width: 80 });
        doc.text(`${row.studyHours}h`, 470, currentY, { width: 60 });
        doc.moveDown(0.3);
      }
    }

    doc.moveDown(1.5);
    doc.fillColor('#718096').fontSize(8).text('Generated by OpenPrep AI Learning Platform', { align: 'center' });

doc.end();
  } catch (error) {
    next(error);
  }
};

// @desc    Log a Pomodoro focus session (active time, pauses, interruptions)
// @route   POST /api/progress/focus-session
// @access  Private
exports.logFocusSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { activeSeconds, pausedSeconds = 0, interruptions = 0, subjectId } = req.body;

    const totalSeconds = activeSeconds + pausedSeconds;
    const focusScore = totalSeconds > 0 ? Math.round((activeSeconds / totalSeconds) * 100) : 0;

    const session = await FocusSession.create({
      user: userId,
      subject: subjectId || null,
      activeSeconds,
      pausedSeconds,
      interruptions,
      focusScore,
    });

    // Issue #1053: Check for Early Bird badge
    await checkAndAwardBadges(req.user.id, {
      type: 'STUDY_SESSION_LOGGED',
      payload: { startTime: session.createdAt }
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly focus efficiency percentage for the dashboard chart
// @route   GET /api/progress/focus-session/weekly
// @access  Private
exports.getWeeklyFocusEfficiency = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const sessions = await FocusSession.findAll({
      attributes: [
        [fn('DATE', col('createdAt')), 'date'],
        [fn('AVG', col('focusScore')), 'avgFocusScore'],
      ],
      where: { user: userId, createdAt: { [Op.gte]: sevenDaysAgo } },
      group: [fn('DATE', col('createdAt'))],
      raw: true,
    });

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyFocusData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const record = sessions.find((s) => s.date === dateStr);
      weeklyFocusData.push({
        day: dayNames[date.getDay()],
        focusEfficiency: record ? Math.round(parseFloat(record.avgFocusScore)) || 0 : 0,
      });
    }

    res.status(200).json({ success: true, data: weeklyFocusData });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/analytics/activity-heatmap:
 *   get:
 *     summary: Get daily study activity for the last 365 days (contribution heatmap)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily activity heatmap data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       questionsSolved:
 *                         type: integer
 *                       flashcardsReviewed:
 *                         type: integer
 *                       total:
 *                         type: integer
 */
exports.getActivityHeatmap = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const days = 365;

    // Use UTC-based date math so the zero-filled keys match the DB's
    // DATE(createdAt) / DATE(updatedAt) values regardless of server timezone.
    const startDate = new Date();
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    startDate.setUTCHours(0, 0, 0, 0);

    // Daily questions solved (sum of totalQuestions per quiz attempt) and
    // daily flashcard reviews (cards touched within the day) in parallel.
    const [quizRows, flashcardRows] = await Promise.all([
      QuizAttempt.findAll({
        attributes: [
          [fn('DATE', col('createdAt')), 'date'],
          [fn('SUM', col('totalQuestions')), 'questionsSolved'],
        ],
        where: { user: userId, createdAt: { [Op.gte]: startDate } },
        group: [fn('DATE', col('createdAt'))],
        raw: true,
      }),
      Flashcard.findAll({
        attributes: [
          [fn('DATE', col('updatedAt')), 'date'],
          [fn('COUNT', col('id')), 'flashcardsReviewed'],
        ],
        where: { user: userId, updatedAt: { [Op.gte]: startDate } },
        group: [fn('DATE', col('updatedAt'))],
        raw: true,
      }),
    ]);

    // Index aggregated rows by date so both signals merge per day.
    const daily = new Map();
    quizRows.forEach((r) => {
      daily.set(r.date, {
        questionsSolved: parseInt(r.questionsSolved, 10) || 0,
        flashcardsReviewed: 0,
      });
    });
    flashcardRows.forEach((r) => {
      const entry = daily.get(r.date) || { questionsSolved: 0, flashcardsReviewed: 0 };
      entry.flashcardsReviewed = parseInt(r.flashcardsReviewed, 10) || 0;
      daily.set(r.date, entry);
    });

    // Zero-fill the full 365-day window (oldest → newest).
    const heatmap = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - i);
      date.setUTCHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      const entry = daily.get(dateStr) || { questionsSolved: 0, flashcardsReviewed: 0 };
      heatmap.push({
        date: dateStr,
        questionsSolved: entry.questionsSolved,
        flashcardsReviewed: entry.flashcardsReviewed,
        total: entry.questionsSolved + entry.flashcardsReviewed,
      });
    }

    res.status(200).json({ success: true, data: heatmap });
  } catch (error) {
    next(error);
  }
};

// @desc    Get aggregated metrics for interactive progress dashboard with animated charts
// @route   GET /api/progress/analytics
// @access  Private
exports.getInteractiveAnalytics = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const attempts = await QuizAttempt.findAll({
      where: { user: userId },
      order: [['createdAt', 'ASC']],
      include: [{ model: Subject, as: 'subjectRef', attributes: ['id', 'name'] }],
    });

    const totalQuizzes = attempts.length;
    const totalScoreSum = attempts.reduce((acc, curr) => acc + (curr.score || 0), 0);
    const averageScore = totalQuizzes > 0 ? Math.round(totalScoreSum / totalQuizzes) : 0;

    const totalTimeSpentSeconds = attempts.reduce((acc, curr) => acc + (curr.timeSpent || 0), 0);
    const userStudyHours = req.user.studyHours || 0;
    const totalTimeSpentMinutes = Math.max(
      Math.round(totalTimeSpentSeconds / 60),
      Math.round(userStudyHours * 60)
    );

    const difficultyScore = req.user.skillScore || 1000;

    // Build score trend for animated line chart (last 10 attempts or aggregated by date)
    const scoreTrend = attempts.slice(-10).map((att, idx) => ({
      attemptIndex: idx + 1,
      date: att.createdAt ? new Date(att.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : `Quiz ${idx + 1}`,
      score: att.score || 0,
      difficulty: att.difficulty || 'Medium',
    }));

    if (scoreTrend.length === 0) {
      scoreTrend.push(
        { date: 'Mon', score: 65, difficulty: 'Easy' },
        { date: 'Tue', score: 72, difficulty: 'Medium' },
        { date: 'Wed', score: 85, difficulty: 'Medium' },
        { date: 'Thu', score: 78, difficulty: 'Medium' },
        { date: 'Fri', score: 92, difficulty: 'Hard' }
      );
    }

    // Build weekly activity for animated bar chart (last 7 days)
    const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysMap[d.getDay()];
      weeklyMap[dayName] = { day: dayName, quizzesCompleted: 0, minutesSpent: 0 };
    }

    attempts.forEach((att) => {
      if (att.createdAt) {
        const d = new Date(att.createdAt);
        const dayName = daysMap[d.getDay()];
        if (weeklyMap[dayName]) {
          weeklyMap[dayName].quizzesCompleted += 1;
          weeklyMap[dayName].minutesSpent += Math.round((att.timeSpent || 120) / 60);
        }
      }
    });

    const weeklyActivity = Object.values(weeklyMap);

    // Subject mastery breakdown for animated radial gauges
    const subjectStats = {};
    attempts.forEach((att) => {
      const subName = (att.subjectRef && att.subjectRef.name) || 'General';
      if (!subjectStats[subName]) {
        subjectStats[subName] = { total: 0, sum: 0 };
      }
      subjectStats[subName].total += 1;
      subjectStats[subName].sum += att.score || 0;
    });

    const subjectColors = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const subjectMastery = Object.keys(subjectStats).map((name, idx) => ({
      subject: name,
      masteryPercentage: Math.round(subjectStats[name].sum / subjectStats[name].total),
      color: subjectColors[idx % subjectColors.length],
    }));

    if (subjectMastery.length === 0) {
      subjectMastery.push(
        { subject: 'Computer Science', masteryPercentage: 85, color: '#f59e0b' },
        { subject: 'Mathematics', masteryPercentage: 72, color: '#10b981' },
        { subject: 'Physics', masteryPercentage: 64, color: '#3b82f6' }
      );
    }

    // Difficulty distribution breakdown
    const diffCounts = { Easy: 0, Medium: 0, Hard: 0 };
    attempts.forEach((att) => {
      const d = att.difficulty || 'Medium';
      const key = d.charAt(0).toUpperCase() + d.slice(1).toLowerCase();
      if (diffCounts[key] !== undefined) diffCounts[key] += 1;
      else diffCounts.Medium += 1;
    });

    const totalDiffCount = totalQuizzes || 1;
    const difficultyDistribution = [
      { level: 'Easy', count: diffCounts.Easy, percentage: Math.round((diffCounts.Easy / totalDiffCount) * 100) },
      { level: 'Medium', count: diffCounts.Medium, percentage: Math.round((diffCounts.Medium / totalDiffCount) * 100) },
      { level: 'Hard', count: diffCounts.Hard, percentage: Math.round((diffCounts.Hard / totalDiffCount) * 100) },
    ];

    res.status(200).json({
      success: true,
      data: {
        totalQuizzes,
        averageScore,
        totalTimeSpentMinutes,
        difficultyScore: Math.round(difficultyScore),
        scoreTrend,
        weeklyActivity,
        subjectMastery,
        difficultyDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /api/progress/reconcile:
 *   post:
 *     summary: Rebuild the current user's Progress rows from their LearningEvent history
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress rows rebuilt from source events
 */
exports.reconcileMyAnalytics = async (req, res, next) => {
  try {
    const rebuilt = await analyticsAggregationService.rebuildProgressForUser(req.user.id);
    res.status(200).json({ success: true, data: { progressRowsRebuilt: rebuilt.length } });
  } catch (error) {
    next(error);
  }
};
