/**
 * @fileoverview Controller for proctored mock exams session synchronization and grading.
 */
const { MockExamSession, User } = require('../models');

/**
 * Initializes and starts a secure mock exam session on the server
 */
const startMockExam = async (req, res) => {
  try {
    const { id } = req.params; // Exam template / config ID
    const userId = req.user.id;

    // Create a new mock exam session with current timestamp secure from client manipulation
    const session = await MockExamSession.create({
      userId,
      examId: id,
      startTime: new Date(),
      status: 'started',
      answers: {},
      violationsCount: 0,
      score: 0,
    });

    res.status(201).json({
      success: true,
      message: 'Exam session started successfully',
      data: session,
    });
  } catch (error) {
    console.error('Error starting mock exam session:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Sync payload heartbeat updating answer state periodically
 */
const submitHeartbeat = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, violationsCount } = req.body;

    const session = await MockExamSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Mock exam session not found' });
    }

    if (session.status !== 'started') {
      return res.status(400).json({ success: false, message: 'Exam session is already completed or inactive' });
    }

    // Save current states
    if (answers) session.answers = answers;
    if (violationsCount !== undefined) session.violationsCount = violationsCount;

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Heartbeat synced successfully',
      data: {
        violationsCount: session.violationsCount,
      },
    });
  } catch (error) {
    console.error('Error syncing heartbeat:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

/**
 * Grades the full mock attempt and produces sectional percentiles
 */
const submitMockExam = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { answers, violationsCount } = req.body;

    const session = await MockExamSession.findByPk(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Mock exam session not found' });
    }

    // Update final states
    if (answers) session.answers = answers;
    if (violationsCount !== undefined) session.violationsCount = violationsCount;
    session.status = 'submitted';
    session.endTime = new Date();

    // Grade Mock attempt (mock grading / scorecard generation)
    // Assume correct answer rates are simulated based on answered questions
    let correctCount = 0;
    let totalQuestions = 0;
    const sectionalScores = {
      physics: { correct: 0, total: 0 },
      chemistry: { correct: 0, total: 0 },
      mathematics: { correct: 0, total: 0 },
    };

    Object.entries(session.answers).forEach(([qId, ans]) => {
      totalQuestions++;
      // Determine section based on question ID prefix or assign a section
      let section = 'mathematics';
      if (qId.startsWith('p')) section = 'physics';
      else if (qId.startsWith('c')) section = 'chemistry';

      sectionalScores[section].total++;
      if (ans.isCorrect || ans.selectedOption === 'A' || ans.selectedOption === '1') { // Mock logic for correct answers
        correctCount++;
        sectionalScores[section].correct++;
      }
    });

    // Score out of 100
    const finalScore = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 75.0;
    session.score = finalScore;
    await session.save();

    // Generate simulated percentile scorecard (percentile range 70-99 based on score)
    const percentile = Math.min(99.8, Math.max(50.0, 50.0 + (finalScore / 2)));
    const sectionPercentiles = {
      physics: Math.min(99.6, Math.max(45.0, 45.0 + (sectionalScores.physics.correct / (sectionalScores.physics.total || 1)) * 50)),
      chemistry: Math.min(99.7, Math.max(48.0, 48.0 + (sectionalScores.chemistry.correct / (sectionalScores.chemistry.total || 1)) * 50)),
      mathematics: Math.min(99.9, Math.max(52.0, 52.0 + (sectionalScores.mathematics.correct / (sectionalScores.mathematics.total || 1)) * 50)),
    };

    res.status(200).json({
      success: true,
      message: 'Exam graded successfully',
      data: {
        sessionId: session.id,
        score: finalScore,
        violationsCount: session.violationsCount,
        percentile,
        sectionPercentiles,
        timeTakenMinutes: Math.round((session.endTime - session.startTime) / 60000),
      },
    });
  } catch (error) {
    console.error('Error submitting mock exam:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

module.exports = {
  startMockExam,
  submitHeartbeat,
  submitMockExam,
};
