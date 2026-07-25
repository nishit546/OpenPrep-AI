const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Flashcard = require('../models/Flashcard');
const Note = require('../models/Note');
const Progress = require('../models/Progress');
const StudyPlan = require('../models/StudyPlan');
const PYQ = require('../models/PYQ');

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
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { count: total, rows: exams } = await Exam.findAndCountAll({
      where: { user: req.user.id },
      order: [['date', 'ASC']],
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      count: exams.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: exams,
    });
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

    // Collect all subject IDs for this exam
    const subjects = await Subject.findAll({ where: { exam: exam.id } });
    const subjectIds = subjects.map((sub) => sub.id);

    // Collect all topics for these subjects
    const topics = await Topic.findAll({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    const topicIds = topics.map((top) => top.id);

    // 1. Delete QuizAttempts for quizzes under these subjects and topics
    const quizzes = await Quiz.findAll({
      where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] },
      transaction: t,
    });
    const quizIds = quizzes.map((q) => q.id);

    if (quizIds.length > 0) {
      await QuizAttempt.destroy({ where: { quiz: { [Op.in]: quizIds } }, transaction: t });
    }

    // 2. Delete quizzes and other related records
    await Quiz.destroy({ where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] }, transaction: t });
    await StudyPlan.destroy({ where: { exam: exam.id }, transaction: t });
    await PYQ.destroy({ where: { [Op.or]: [{ exam: exam.id }, { subject: { [Op.in]: subjectIds } }] }, transaction: t });
    await Note.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Flashcard.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Progress.destroy({ where: { [Op.or]: [{ subject: { [Op.in]: subjectIds } }, { topic: { [Op.in]: topicIds } }] }, transaction: t });

    // 3. Ensure child Topic records are deleted BEFORE parent Subject records
    await Topic.destroy({ where: { subject: { [Op.in]: subjectIds } }, transaction: t });
    await Subject.destroy({ where: { exam: exam.id }, transaction: t });
    
    // 4. Delete the exam itself
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

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { count: total, rows: subjects } = await Subject.findAndCountAll({
      where: filter,
      limit,
      offset,
    });

    res.status(200).json({
      success: true,
      count: subjects.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      data: subjects,
    });
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

    // 1. Delete QuizAttempts for quizzes under this subject
    const quizzes = await Quiz.findAll({ where: { subject: subject.id } });
    const quizIds = quizzes.map((q) => q.id);
    if (quizIds.length > 0) {
      await QuizAttempt.destroy({ where: { quiz: { [Op.in]: quizIds } } });
    }

    // 2. Delete child records that reference this subject
    await Progress.destroy({ where: { subject: subject.id } });
    await Flashcard.destroy({ where: { subject: subject.id } });
    await Note.destroy({ where: { subject: subject.id } });

    // 3. Delete quizzes
    await Quiz.destroy({ where: { subject: subject.id } });

    // 4. Delete topics
    await Topic.destroy({ where: { subject: subject.id } });

    // 5. Delete PYQs for this subject
    await PYQ.destroy({ where: { subject: subject.id } });

    // 6. Delete the subject itself
    await subject.destroy();

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

    // 1. Delete child records that reference this topic
    await Progress.destroy({ where: { topic: topic.id } });
    await Flashcard.destroy({ where: { topic: topic.id } });
    await Note.destroy({ where: { topic: topic.id } });

    // 2. Nullify topic reference on quizzes (quiz itself is preserved)
    await Quiz.update({ topic: null }, { where: { topic: topic.id } });

    // 3. Delete the topic itself
    await topic.destroy();

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};
