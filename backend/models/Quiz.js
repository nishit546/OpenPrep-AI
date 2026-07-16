const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, required: true }, // Index of correct option (0-3)
  explanation: { type: String },
});

const QuizSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a quiz title'],
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
    },
    questions: [QuestionSchema],
    type: {
      type: String,
      enum: ['AI_Generated', 'Manual'],
      default: 'AI_Generated',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index to optimize user-scoped queries (prevents IDOR via fast ownership lookup)
QuizSchema.index({ createdBy: 1, _id: 1 });

module.exports = mongoose.model('Quiz', QuizSchema);
