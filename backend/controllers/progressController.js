const { Op, fn, col } = require('sequelize');
const Progress = require('../models/Progress');
const Topic = require('../models/Topic');
const ActivityLog = require('../models/ActivityLog');
const QuizAttempt = require('../models/QuizAttempt');
const Subject = require('../models/Subject');

// @desc    Get dashboard metrics & activity feed
// @route   GET /api/progress/dashboard
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. User profile stats (streak & study hours)
    const streak = req.user.streakCount || 0;
    const totalStudyHours = req.user.studyHours || 0;

    // 2. Topic statistics breakdown (Strong, Medium, Weak counts) via aggregation
    const totalTopicsCount = await Topic.count({ where: { user: userId } });

    const topicStats = await Topic.findAll({
      attributes: ['status', [fn('COUNT', col('status')), 'count']],
      where: { user: userId },
      group: ['status'],
      raw: true,
    });

    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;

    topicStats.forEach((t) => {
      const count = parseInt(t.count, 10) || 0;
      if (t.status === 'Strong') strongCount = count;
      else if (t.status === 'Medium') mediumCount = count;
      else if (t.status === 'Weak') weakCount = count;
    });

    // Calculate syllabus progress percentage via aggregation
    const [totalCompletionResult] = await Progress.findAll({
      attributes: [[fn('SUM', col('completionPercentage')), 'totalCompletion']],
      where: { user: userId },
      raw: true,
    });
    const totalCompletionSum = parseFloat(totalCompletionResult?.totalCompletion) || 0;
    const syllabusProgress =
      totalTopicsCount > 0 ? Math.round(totalCompletionSum / totalTopicsCount) : 0;

    // 3. Quiz attempts summaries
    const attemptsCount = await QuizAttempt.count({ where: { user: userId } });

    // 4. Study Hours Chart Data (weekly progression over last 7 calendar days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const progressHistory = await Progress.findAll({
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
    });

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

    // 5. Recent activity logs
    const activities = await ActivityLog.findAll({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.status(200).json({
      success: true,
      data: {
        streak,
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
      },
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
    const progressList = await Progress.findAll({
      where: { user: req.user.id },
      include: [
        { model: Subject, as: 'subjectRef' },
        { model: Topic, as: 'topicRef' },
      ],
    });

    // Group progress by subject
    const subjectStats = {};

    progressList.forEach((p) => {
      const json = p.toJSON();
      const subject = json.subjectRef;
      if (!subject) return;
      const subId = subject.id;
      if (!subjectStats[subId]) {
        subjectStats[subId] = {
          subjectName: subject.name,
          topicsCount: 0,
          totalCompletion: 0,
          totalHours: 0,
          flashcardsMastered: 0,
        };
      }
      subjectStats[subId].topicsCount += 1;
      subjectStats[subId].totalCompletion += json.completionPercentage || 0;
      subjectStats[subId].totalHours += json.studyHours || 0;
      subjectStats[subId].flashcardsMastered += json.flashcardsMastered || 0;
    });

    const breakdown = Object.values(subjectStats).map((s) => ({
      subjectName: s.subjectName,
      progressPercentage: s.topicsCount > 0 ? Math.round(s.totalCompletion / s.topicsCount) : 0,
      studyHours: s.totalHours,
      flashcardsMastered: s.flashcardsMastered,
    }));

    res.status(200).json({ success: true, data: breakdown });
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

    const activities = await ActivityLog.findAll({
      where: { user: userId },
      order: [['createdAt', 'DESC']],
      limit: 20,
    });

    res.status(200).json({ success: true, data: activities });
  } catch (error) {
    next(error);
  }
};
