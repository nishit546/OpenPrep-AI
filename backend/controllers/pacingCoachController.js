const pacingCoachService = require('../services/pacingCoachService');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');

// @desc    Generate a pacing plan for an upcoming attempt
// @route   POST /api/pacing-coach/plan
// @access  Private
exports.createPlan = async (req, res, next) => {
  try {
    const { totalDurationSeconds, questions, reviewBufferPercent, subjectId } = req.body;
    
    let personalizationFactor = 1.0;
    if (subjectId) {
      const profile = await pacingCoachService.getSubjectPacingProfile(req.user.id, subjectId);
      if (profile && profile.factor) {
        personalizationFactor = profile.factor;
      }
    }

    const plan = pacingCoachService.createPacingPlan({
      totalDurationSeconds,
      questions,
      reviewBufferPercent: reviewBufferPercent !== undefined ? reviewBufferPercent : 8,
      personalizationFactor,
    });

    if (plan.error) {
      return res.status(400).json({ success: false, error: plan.error });
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    next(error);
  }
};

// @desc    Calculate live pacing state
// @route   POST /api/pacing-coach/live
// @access  Private
exports.calculateLivePacing = (req, res) => {
  try {
    const { elapsedSeconds, totalDurationSeconds, completedQuestions, pacingPlan } = req.body;
    
    if (!pacingPlan || !pacingPlan.questionBudgets) {
      return res.status(400).json({ success: false, error: 'Pacing plan is required' });
    }

    const state = pacingCoachService.calculateRunningPace({
      elapsedSeconds,
      totalDurationSeconds,
      completedQuestions,
      pacingPlan,
    });
    
    // Also check time bleed for current question if provided
    let bleedState = null;
    if (req.body.currentQuestionId && req.body.currentQuestionElapsed) {
      const qPlan = pacingPlan.questionBudgets.find(qb => String(qb.questionId) === String(req.body.currentQuestionId));
      if (qPlan) {
        bleedState = pacingCoachService.detectTimeBleed(req.body.currentQuestionElapsed, qPlan.budgetSeconds);
      }
    }

    res.status(200).json({ success: true, data: { ...state, bleedState } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// @desc    Post-attempt autopsy
// @route   POST /api/pacing-coach/autopsy
// @access  Private
exports.getAutopsy = async (req, res, next) => {
  try {
    const { attemptId, pacingPlan } = req.body;
    
    if (!pacingPlan || !pacingPlan.questionBudgets) {
      return res.status(400).json({ success: false, error: 'Pacing plan is required' });
    }

    let attempt;
    if (attemptId) {
      attempt = await QuizAttempt.findOne({
        where: { id: attemptId, user: req.user.id },
      });
      if (!attempt) {
        return res.status(404).json({ success: false, error: 'Attempt not found' });
      }
    } else if (req.body.attemptData) {
      attempt = req.body.attemptData;
    } else {
      return res.status(400).json({ success: false, error: 'attemptId or attemptData required' });
    }

    const autopsy = pacingCoachService.analyzeAttempt(attempt, pacingPlan);
    res.status(200).json({ success: true, data: autopsy });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subject pacing history profile
// @route   GET /api/pacing-coach/subjects/:subjectId
// @access  Private
exports.getSubjectProfile = async (req, res, next) => {
  try {
    const profile = await pacingCoachService.getSubjectPacingProfile(req.user.id, req.params.subjectId);
    res.status(200).json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
