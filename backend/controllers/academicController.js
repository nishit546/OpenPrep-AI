const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const PYQ = require('../models/PYQ');
const StudyPlan = require('../models/StudyPlan');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Note = require('../models/Note');
const Flashcard = require('../models/Flashcard');
const Progress = require('../models/Progress');

// ==========================================
// EXAMS CONTROLLER
// ==========================================

exports.createExam = async (req, res, next) => {
  try {
    const { name, description, date } = req.body;
    const exam = await Exam.create({
      name,
      description,
      date,
      user: req.user.id,
    });
    res.status(201).json({ success: true, data: exam });
  } catch (error) {
    next(error);
  }
};

exports.getExams = async (req, res, next) => {
  try {
    const exams = await Exam.findAll({
      where: { user: req.user.id },
      order: [['date', 'ASC']],
    });
    res.status(200).json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const exam = await Exam.findOne({
      where: { id: req.params.id, user: req.user.id },
      transaction: t,
    });

    if (!exam) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    const subjects = await Subject.findAll({
      where: { exam: exam.id },
      transaction: t,
    });
    const subjectIds = subjects.map((sub) => sub.id);

    const topics = await Topic.findAll({
      where: { subject: { [Op.in]: subjectIds } },
      transaction: t,
    });
    const topicIds = topics.map((top) => top.id);

    const quizzes = await Quiz.findAll({
      where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] },
      transaction: t,
    });
    const quizIds = quizzes.map((q) => q.id);

    await QuizAttempt.destroy({ where: { quiz: { [Op.in]: quizIds } }, transaction: t });
    await Quiz.destroy({ where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] }, transaction: t });
    await StudyPlan.destroy({ where: { exam: exam.id }, transaction: t });
    await PYQ.destroy({ where: { [Op.or]: [{ exam: exam.id }, { subject: { [Op.in]: subjectIds } }] }, transaction: t });
    await Note.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Flashcard.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Progress.destroy({ where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] }, transaction: t });
    await Topic.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Subject.destroy({ where: { exam: exam.id }, transaction: t });
    await exam.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// ==========================================
// SUBJECTS CONTROLLER
// ==========================================

exports.createSubject = async (req, res, next) => {
  try {
    const { name, description, examId } = req.body;
    const examExists = await Exam.findOne({
      where: { id: examId, user: req.user.id },
    });
    if (!examExists) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }

    const subject = await Subject.create({
      name,
      description,
      exam: examId,
      user: req.user.id,
    });
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

exports.getSubjects = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const filter = { user: req.user.id };
    if (examId) filter.exam = examId;

    const subjects = await Subject.findAll({ where: filter });
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const subject = await Subject.findOne({
      where: { id: req.params.id, user: req.user.id },
      transaction: t,
    });

    if (!subject) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const topics = await Topic.findAll({
      where: { subject: subject.id },
      transaction: t,
    });
    const topicIds = topics.map((top) => top.id);

    const quizzes = await Quiz.findAll({
      where: { [Op.or]: [{ subject: subject.id }, { topic: { [Op.in]: topicIds } }] },
      transaction: t,
    });
    const quizIds = quizzes.map((q) => q.id);

    await QuizAttempt.destroy({ where: { quiz: { [Op.in]: quizIds } }, transaction: t });
    await Quiz.destroy({ where: { [Op.or]: [{ subject: subject.id }, { topic: { [Op.in]: topicIds } }] }, transaction: t });
    await PYQ.destroy({ where: { subject: subject.id }, transaction: t });
    await Note.destroy({ where: { subject: subject.id }, transaction: t });
    await Flashcard.destroy({ where: { subject: subject.id }, transaction: t });
    await Progress.destroy({ where: { [Op.or]: [{ subject: subject.id }, { topic: { [Op.in]: topicIds } }] }, transaction: t });
    await Topic.destroy({ where: { subject: subject.id }, transaction: t });
    await subject.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// ==========================================
// TOPICS CONTROLLER
// ==========================================

exports.createTopic = async (req, res, next) => {
  try {
    const { name, description, subjectId, status, weightage } = req.body;
    const subjectExists = await Subject.findOne({
      where: { id: subjectId, user: req.user.id },
    });
    if (!subjectExists) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }

    const topic = await Topic.create({
      name,
      description,
      subject: subjectId,
      status: status || 'Medium',
      weightage: weightage || 0,
      user: req.user.id,
    });
    res.status(201).json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

exports.getTopics = async (req, res, next) => {
  try {
    const { subjectId } = req.query;
    const filter = { user: req.user.id };
    if (subjectId) filter.subject = subjectId;

    const topics = await Topic.findAll({
      where: filter,
      order: [['weightage', 'DESC']],
    });
    res.status(200).json({ success: true, count: topics.length, data: topics });
  } catch (error) {
    next(error);
  }
};

exports.updateTopic = async (req, res, next) => {
  try {
    const { status, weightage, name, description } = req.body;
    let topic = await Topic.findOne({
      where: { id: req.params.id, user: req.user.id },
    });

    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    if (status) topic.status = status;
    if (weightage !== undefined) topic.weightage = weightage;
    if (name) topic.name = name;
    if (description) topic.description = description;

    await topic.save();
    res.status(200).json({ success: true, data: topic });
  } catch (error) {
    next(error);
  }
};

exports.deleteTopic = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const topic = await Topic.findOne({
      where: { id: req.params.id, user: req.user.id },
      transaction: t,
    });

    if (!topic) {
      await t.rollback();
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }

    const quizzes = await Quiz.findAll({
      where: { topic: topic.id },
      transaction: t,
    });
    const quizIds = quizzes.map((q) => q.id);

    await QuizAttempt.destroy({ where: { quiz: { [Op.in]: quizIds } }, transaction: t });
    await Quiz.destroy({ where: { topic: topic.id }, transaction: t });
    await Flashcard.destroy({ where: { topic: topic.id }, transaction: t });
    await Progress.destroy({ where: { topic: topic.id }, transaction: t });
    await Note.update({ topic: null }, { where: { topic: topic.id }, transaction: t });
    await topic.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
