const { sequelize } = require('../../config/db');

describe('Database Configuration - Model Registration', () => {
  it('should export a valid Sequelize instance', () => {
    expect(sequelize).toBeDefined();
    expect(typeof sequelize.authenticate).toBe('function');
    expect(typeof sequelize.sync).toBe('function');
  });

  it('should have models registered after requiring models/index', () => {
    const models = require('../../models');
    expect(models).toBeDefined();
    expect(models.User).toBeDefined();
    expect(models.Exam).toBeDefined();
    expect(models.Subject).toBeDefined();
    expect(models.Topic).toBeDefined();
    expect(models.PYQ).toBeDefined();
    expect(models.Quiz).toBeDefined();
    expect(models.QuizAttempt).toBeDefined();
    expect(models.Note).toBeDefined();
    expect(models.Flashcard).toBeDefined();
    expect(models.Progress).toBeDefined();
    expect(models.StudyPlan).toBeDefined();
    expect(models.Feedback).toBeDefined();
    expect(models.ActivityLog).toBeDefined();
  });

  it('should have associations registered on models', () => {
    const { User, Exam, Subject, Topic, Quiz } = require('../../models');

    expect(User.associations).toBeDefined();
    expect(Object.keys(User.associations).length).toBeGreaterThan(0);
    expect(User.associations.Exams).toBeDefined();
    expect(User.associations.Subjects).toBeDefined();

    expect(Subject.associations).toBeDefined();
    expect(Object.keys(Subject.associations).length).toBeGreaterThan(0);
    expect(Subject.associations.examRef).toBeDefined();
    expect(Subject.associations.Topics).toBeDefined();

    expect(Quiz.associations).toBeDefined();
    expect(Object.keys(Quiz.associations).length).toBeGreaterThan(0);
    expect(Quiz.associations.subjectRef).toBeDefined();
  });

  it('should have models registered even when NODE_ENV is production', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    // Models should still be accessible (they were registered during require)
    const models = require('../../models');
    expect(models.User).toBeDefined();
    expect(models.Subject).toBeDefined();
    expect(models.Quiz).toBeDefined();

    // Associations should still be defined
    expect(Object.keys(models.User.associations).length).toBeGreaterThan(0);

    process.env.NODE_ENV = originalEnv;
  });

  it('should have the sequelize instance available on all models', () => {
    const models = require('../../models');
    expect(models.User.sequelize).toBe(sequelize);
    expect(models.Subject.sequelize).toBe(sequelize);
    expect(models.Quiz.sequelize).toBe(sequelize);
  });

  describe('Foreign Key Indexes', () => {
    const getIndexNames = (model) => (model.options.indexes || []).map((idx) => idx.name);

    it('Exam should have index on user', () => {
      const { Exam } = require('../../models');
      const names = getIndexNames(Exam);
      expect(names).toContain('exam_user_idx');
    });

    it('Subject should have indexes on exam and user', () => {
      const { Subject } = require('../../models');
      const names = getIndexNames(Subject);
      expect(names).toContain('subject_exam_idx');
      expect(names).toContain('subject_user_idx');
    });

    it('Topic should have indexes on subject and user', () => {
      const { Topic } = require('../../models');
      const names = getIndexNames(Topic);
      expect(names).toContain('topic_subject_idx');
      expect(names).toContain('topic_user_idx');
    });

    it('PYQ should have indexes on exam, subject, and user+exam', () => {
      const { PYQ } = require('../../models');
      const names = getIndexNames(PYQ);
      expect(names).toContain('pyq_exam_idx');
      expect(names).toContain('pyq_subject_idx');
      expect(names).toContain('pyq_user_exam_idx');
    });

    it('StudyPlan should have indexes on user and exam', () => {
      const { StudyPlan } = require('../../models');
      const names = getIndexNames(StudyPlan);
      expect(names).toContain('studyplan_user_idx');
      expect(names).toContain('studyplan_exam_idx');
      expect(names).toContain('studyplan_user_exam_idx');
    });

    it('Quiz should have indexes on subject and topic', () => {
      const { Quiz } = require('../../models');
      const names = getIndexNames(Quiz);
      expect(names).toContain('quiz_subject_idx');
      expect(names).toContain('quiz_topic_idx');
    });

    it('QuizAttempt should have indexes on user and quiz', () => {
      const { QuizAttempt } = require('../../models');
      const names = getIndexNames(QuizAttempt);
      expect(names).toContain('quizattempt_user_idx');
      expect(names).toContain('quizattempt_quiz_idx');
      expect(names).toContain('quizattempt_user_quiz_idx');
    });

    it('Note should have indexes on user, subject, topic, and user+subject', () => {
      const { Note } = require('../../models');
      const names = getIndexNames(Note);
      expect(names).toContain('note_user_idx');
      expect(names).toContain('note_subject_idx');
      expect(names).toContain('note_topic_idx');
      expect(names).toContain('note_user_subject_idx');
    });

    it('Flashcard should have indexes on user, subject, topic, and user+subject', () => {
      const { Flashcard } = require('../../models');
      const names = getIndexNames(Flashcard);
      expect(names).toContain('flashcard_user_idx');
      expect(names).toContain('flashcard_subject_idx');
      expect(names).toContain('flashcard_topic_idx');
      expect(names).toContain('flashcard_user_subject_idx');
    });

    it('Progress should have indexes on user, subject, topic, and user+subject', () => {
      const { Progress } = require('../../models');
      const names = getIndexNames(Progress);
      expect(names).toContain('progress_user_idx');
      expect(names).toContain('progress_subject_idx');
      expect(names).toContain('progress_topic_idx');
      expect(names).toContain('progress_user_subject_idx');
    });

    it('Feedback should have index on user', () => {
      const { Feedback } = require('../../models');
      const names = getIndexNames(Feedback);
      expect(names).toContain('feedback_user_idx');
    });

    it('ActivityLog should have indexes on user and user+timestamp', () => {
      const { ActivityLog } = require('../../models');
      const names = getIndexNames(ActivityLog);
      expect(names).toContain('activitylog_user_idx');
      expect(names).toContain('activitylog_user_timestamp_idx');
    });
  });
});
