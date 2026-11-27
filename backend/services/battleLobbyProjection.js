/** Only public lobby metadata belongs in REST responses before a round reveal. */
function publicQuiz(quiz) {
  if (!quiz) return null;
  return {
    id: quiz.id,
    title: quiz.title,
    questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
  };
}

module.exports = { publicQuiz };
