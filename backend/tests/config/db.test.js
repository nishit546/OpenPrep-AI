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
});
