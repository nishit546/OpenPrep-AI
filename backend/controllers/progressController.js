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

    // 4. Study Hours Chart Data (weekly progression based on real records)
    const progressHistory = await Progress.findAll({
      attributes: ['studyHours', 'completionPercentage', 'updatedAt'],
      where: { user: userId },
      order: [['updatedAt', 'DESC']],
      limit: 7,
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyChartData = progressHistory.map((p) => ({
      day: dayNames[new Date(p.updatedAt).getDay()],
      hours: p.studyHours || 0,
      completion: p.completionPercentage || 0,
    }));

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
        weeklyChartData:
          weeklyChartData.length > 0
            ? weeklyChartData
            : [
                { day: 'Mon', hours: 1, completion: 20 },
                { day: 'Tue', hours: 2, completion: 40 },
                { day: 'Wed', hours: 1.5, completion: 45 },
                { day: 'Thu', hours: 3, completion: 60 },
                { day: 'Fri', hours: 2.5, completion: 75 },
                { day: 'Sat', hours: 4, completion: 90 },
                { day: 'Sun', hours: 2, completion: 100 },
              ],
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
