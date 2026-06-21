const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');

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
    const exams = await Exam.find({ user: req.user.id }).sort({ date: 1 });
    res.status(200).json({ success: true, count: exams.length, data: exams });
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!exam) {
      return res.status(404).json({ success: false, error: 'Exam not found' });
    }
    // Cascade delete subjects and topics
    const subjects = await Subject.find({ exam: exam._id });
    const subjectIds = subjects.map((sub) => sub._id);
    await Subject.deleteMany({ exam: exam._id });
    await Topic.deleteMany({ subject: { $in: subjectIds } });

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBJECTS CONTROLLER
// ==========================================

exports.createSubject = async (req, res, next) => {
  try {
    const { name, description, examId } = req.body;
    const examExists = await Exam.findOne({ _id: examId, user: req.user.id });
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

    const subjects = await Subject.find(filter);
    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!subject) {
      return res.status(404).json({ success: false, error: 'Subject not found' });
    }
    await Topic.deleteMany({ subject: subject._id });
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TOPICS CONTROLLER
// ==========================================

exports.createTopic = async (req, res, next) => {
  try {
    const { name, description, subjectId, status, weightage } = req.body;
    const subjectExists = await Subject.findOne({ _id: subjectId, user: req.user.id });
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

    const topics = await Topic.find(filter).sort({ weightage: -1 });
    res.status(200).json({ success: true, count: topics.length, data: topics });
  } catch (error) {
    next(error);
  }
};

exports.updateTopic = async (req, res, next) => {
  try {
    const { status, weightage, name, description } = req.body;
    let topic = await Topic.findOne({ _id: req.params.id, user: req.user.id });
    
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
  try {
    const topic = await Topic.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!topic) {
      return res.status(404).json({ success: false, error: 'Topic not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};
