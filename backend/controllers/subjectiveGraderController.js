/**
 * @fileoverview Controller for Subjective Answer Grader API endpoints
 */
const subjectiveGraderService = require('../services/subjectiveGraderService');

/**
 * Evaluate a subjective student answer against a rubric and model answer
 * @route POST /api/subjective-grader/evaluate
 * @access Private
 */
exports.evaluateAnswer = async (req, res, next) => {
  try {
    const { studentAnswer, modelAnswer, questionText, rubricCriteria, totalMarks = 10 } = req.body;

    if (!studentAnswer || !modelAnswer) {
      return res.status(400).json({
        success: false,
        error: 'studentAnswer and modelAnswer are required for evaluation.',
      });
    }

    const evaluation = await subjectiveGraderService.evaluateSubjectiveAnswer({
      studentAnswer,
      modelAnswer,
      questionText: questionText || 'Subjective Question',
      rubricCriteria: rubricCriteria || null,
      totalMarks: Number(totalMarks) || 10,
    });

    return res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate AI rubric template for a question
 * @route POST /api/subjective-grader/generate-rubric
 * @access Private
 */
exports.generateRubric = async (req, res, next) => {
  try {
    const { questionText, modelAnswer, totalMarks = 10 } = req.body;

    if (!questionText || !modelAnswer) {
      return res.status(400).json({
        success: false,
        error: 'questionText and modelAnswer are required to generate a rubric template.',
      });
    }

    const rubric = await subjectiveGraderService.generateRubricTemplate({
      questionText,
      modelAnswer,
      totalMarks: Number(totalMarks) || 10,
    });

    return res.status(200).json({
      success: true,
      data: rubric,
    });
  } catch (error) {
    next(error);
  }
};
