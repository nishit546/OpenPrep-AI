const VERSION = 1;

function nonempty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateGeneratedQuiz(quiz, count, questionType = 'MCQ') {
  if (!quiz || !nonempty(quiz.title) || !Array.isArray(quiz.questions) || quiz.questions.length !== count) {
    return { valid: false, reason: `Quiz must have a title and exactly ${count} questions` };
  }

  const seen = new Set();
  for (const [index, question] of quiz.questions.entries()) {
    if (!question || !nonempty(question.questionText) || !nonempty(question.explanation)) {
      return { valid: false, reason: `Question ${index + 1} has missing text or explanation` };
    }
    const textKey = question.questionText.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
    if (seen.has(textKey)) return { valid: false, reason: `Question ${index + 1} duplicates another question` };
    seen.add(textKey);

    if (questionType === 'SUBJECTIVE') {
      if (question.questionType !== 'SUBJECTIVE' || !nonempty(question.idealAnswer) ||
          !Number.isFinite(Number(question.maxScore)) || Number(question.maxScore) <= 0 ||
          !Array.isArray(question.rubricCriteria) || question.rubricCriteria.length === 0 ||
          question.rubricCriteria.some((item) => !nonempty(item?.category) || !nonempty(item?.description) ||
            !Number.isFinite(Number(item?.maxPoints)) || Number(item.maxPoints) <= 0) ||
          quiz.questions[index].rubricCriteria.reduce((sum, item) => sum + Number(item.maxPoints), 0) !== Number(question.maxScore)) {
        return { valid: false, reason: `Question ${index + 1} has an invalid subjective rubric` };
      }
    } else {
      if (question.questionType === 'SUBJECTIVE' || !Array.isArray(question.options) || question.options.length !== 4 ||
          question.options.some((option) => !nonempty(option)) ||
          new Set(question.options.map((option) => option.trim().toLocaleLowerCase())).size !== 4 ||
          !Number.isInteger(question.correctAnswer) || question.correctAnswer < 0 || question.correctAnswer > 3) {
        return { valid: false, reason: `Question ${index + 1} has invalid options or answer index` };
      }
    }
  }
  return { valid: true, version: VERSION };
}

module.exports = { validateGeneratedQuiz, QUIZ_CONTRACT_VERSION: VERSION };
