const { sequelize } = require('../config/db');

// Import all models
const User = require('./User');
const Folder = require('./Folder');
const Exam = require('./Exam');
const Subject = require('./Subject');
const Topic = require('./Topic');
const PYQ = require('./PYQ');
const StudyPlan = require('./StudyPlan');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Note = require('./Note');
const Flashcard = require('./Flashcard');
const FlashcardDeck = require('./FlashcardDeck');
const DeckCollaborator = require('./DeckCollaborator');
const Progress = require('./Progress');
const Feedback = require('./Feedback');
const ActivityLog = require('./ActivityLog');
const UsageQuota = require('./UsageQuota');
const Achievement = require('./Achievement');
const FocusSession = require('./FocusSession');
const QuizTelemetryEvent = require('./QuizTelemetryEvent');
const QuizBookmark = require('./QuizBookmark');
const DeckRating = require('./DeckRating');
const UserBadge = require('./UserBadge');
const Badge = require('./Badge');
const BattleSession = require('./BattleSession');
const BattleParticipant = require('./BattleParticipant');
const PYQAnalysis = require('./PYQAnalysis');
const PYQQuestion = require('./PYQQuestion');
const Notification = require('./Notification');
const PushSubscription = require('./PushSubscription');
const ReadinessSnapshot = require('./ReadinessSnapshot');
const SubjectGoal = require('./SubjectGoal');
const StudySquad = require('./StudySquad');const SquadMember = require('./SquadMember');
const SquadChallenge = require('./SquadChallenge');
const SquadChallengeContribution = require('./SquadChallengeContribution');
const SquadAchievement = require('./SquadAchievement');
const SquadActivity = require('./SquadActivity');
const SquadActivityReaction = require('./SquadActivityReaction');
const Syllabus = require('./Syllabus');
const SyllabusTopic = require('./SyllabusTopic');
const PDFAnnotation = require('./PDFAnnotation');
const QuizRoom = require('./QuizRoom');
const AuditLog = require('./AuditLog');

// User associations
User.hasMany(Exam, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Subject, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Topic, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(PYQ, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(StudyPlan, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Quiz, { foreignKey: 'createdBy', onDelete: 'CASCADE' });
User.hasMany(QuizAttempt, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Note, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Flashcard, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(FlashcardDeck, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Progress, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Feedback, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(ActivityLog, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Achievement, { foreignKey: 'userId', as: 'achievements', onDelete: 'CASCADE' });
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'badgesRef', onDelete: 'CASCADE' });
User.hasMany(Folder, { foreignKey: 'userId', onDelete: 'CASCADE' });

// Exam associations
Exam.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
Exam.hasMany(Subject, { foreignKey: 'exam', onDelete: 'CASCADE' });
Exam.hasMany(PYQ, { foreignKey: 'exam', onDelete: 'CASCADE' });
Exam.hasMany(StudyPlan, { foreignKey: 'exam', onDelete: 'CASCADE' });

// Subject associations
Subject.belongsTo(Exam, { foreignKey: 'exam', as: 'examRef', onDelete: 'CASCADE' });
Subject.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
Subject.hasMany(Topic, { foreignKey: 'subject', onDelete: 'CASCADE' });
Subject.hasMany(PYQ, { foreignKey: 'subject', onDelete: 'CASCADE' });
Subject.hasMany(Quiz, { foreignKey: 'subject', onDelete: 'CASCADE' });
Subject.hasMany(Note, { foreignKey: 'subject', onDelete: 'CASCADE' });
Subject.hasMany(Flashcard, { foreignKey: 'subject', onDelete: 'CASCADE' });
Subject.hasMany(FlashcardDeck, { foreignKey: 'subject', onDelete: 'SET NULL' });
Subject.hasMany(Progress, { foreignKey: 'subject', onDelete: 'CASCADE' });

// FlashcardDeck associations
FlashcardDeck.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
FlashcardDeck.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'SET NULL' });
FlashcardDeck.hasMany(Flashcard, { foreignKey: 'deckId', onDelete: 'CASCADE' });
Flashcard.belongsTo(FlashcardDeck, { foreignKey: 'deckId', as: 'deckRef' });

// DeckCollaborator associations
FlashcardDeck.hasMany(DeckCollaborator, { foreignKey: 'deckId', onDelete: 'CASCADE' });
DeckCollaborator.belongsTo(FlashcardDeck, { foreignKey: 'deckId', as: 'deckRef' });

User.hasMany(DeckCollaborator, { foreignKey: 'userId', onDelete: 'CASCADE' });
DeckCollaborator.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

DeckCollaborator.belongsTo(User, { foreignKey: 'invitedBy', as: 'invitedByRef' });

// Topic associations
Topic.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Topic.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
Topic.hasMany(Quiz, { foreignKey: 'topic', onDelete: 'SET NULL' });
Topic.hasMany(Note, { foreignKey: 'topic', onDelete: 'CASCADE' });
Topic.hasMany(Flashcard, { foreignKey: 'topic', onDelete: 'CASCADE' });
Topic.hasMany(Progress, { foreignKey: 'topic', onDelete: 'CASCADE' });

// PYQ associations
PYQ.belongsTo(Exam, { foreignKey: 'exam', as: 'examRef' });
PYQ.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
PYQ.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// StudyPlan associations
StudyPlan.belongsTo(Exam, { foreignKey: 'exam', as: 'examRef' });
StudyPlan.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// Quiz associations
Quiz.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Quiz.belongsTo(Topic, { foreignKey: 'topic', as: 'topicRef', onDelete: 'SET NULL' });
Quiz.belongsTo(User, { foreignKey: 'createdBy', as: 'creatorRef' });
Quiz.hasMany(QuizAttempt, { foreignKey: 'quiz', onDelete: 'CASCADE' });
Quiz.hasMany(QuizTelemetryEvent, { foreignKey: 'quiz', onDelete: 'CASCADE' });

// QuizAttempt associations
QuizAttempt.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quiz', as: 'quizRef', onDelete: 'CASCADE' });

// Note associations
Note.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Note.belongsTo(Topic, { foreignKey: 'topic', as: 'topicRef', onDelete: 'CASCADE' });
Note.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// Flashcard associations
Flashcard.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
Flashcard.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Flashcard.belongsTo(Topic, { foreignKey: 'topic', as: 'topicRef', onDelete: 'CASCADE' });

// Progress associations
Progress.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
Progress.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Progress.belongsTo(Topic, { foreignKey: 'topic', as: 'topicRef', onDelete: 'CASCADE' });

// Feedback associations
Feedback.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// ActivityLog associations
ActivityLog.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// Achievement associations
Achievement.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

// UserBadge associations
UserBadge.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

// Badge associations
Badge.hasMany(UserBadge, { foreignKey: 'badgeCode', sourceKey: 'id', as: 'userBadges' });
UserBadge.belongsTo(Badge, { foreignKey: 'badgeCode', targetKey: 'id', as: 'badge' });

// FocusSession associations
FocusSession.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// QuizTelemetryEvent associations
QuizTelemetryEvent.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
QuizTelemetryEvent.belongsTo(Quiz, { foreignKey: 'quiz', as: 'quizRef', onDelete: 'CASCADE' });
User.hasMany(QuizTelemetryEvent, { foreignKey: 'user', onDelete: 'CASCADE' });

// QuizBookmark associations
QuizBookmark.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
QuizBookmark.belongsTo(Quiz, { foreignKey: 'quiz', as: 'quizRef', onDelete: 'CASCADE' });
User.hasMany(QuizBookmark, { foreignKey: 'user', onDelete: 'CASCADE' });
Quiz.hasMany(QuizBookmark, { foreignKey: 'quiz', onDelete: 'CASCADE' });

// BattleSession and BattleParticipant associations
User.hasMany(BattleSession, { foreignKey: 'hostUserId', onDelete: 'CASCADE' });
BattleSession.belongsTo(User, { foreignKey: 'hostUserId', as: 'hostRef' });

BattleSession.hasMany(BattleParticipant, { foreignKey: 'battleId', onDelete: 'CASCADE' });
BattleParticipant.belongsTo(BattleSession, { foreignKey: 'battleId', as: 'battleRef' });

User.hasMany(BattleParticipant, { foreignKey: 'userId', onDelete: 'CASCADE' });
BattleParticipant.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

BattleSession.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quizRef', onDelete: 'SET NULL' });

// PYQAnalysis and PYQQuestion associations
User.hasMany(PYQAnalysis, { foreignKey: 'userId', onDelete: 'CASCADE' });
PYQAnalysis.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

Subject.hasMany(PYQAnalysis, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
PYQAnalysis.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subjectRef' });

PYQAnalysis.hasMany(PYQQuestion, { foreignKey: 'pyqAnalysisId', onDelete: 'CASCADE' });
PYQQuestion.belongsTo(PYQAnalysis, { foreignKey: 'pyqAnalysisId', as: 'analysisRef' });

// Notification & PushSubscription associations
User.hasMany(Notification, { foreignKey: 'user', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

User.hasMany(PushSubscription, { foreignKey: 'user', onDelete: 'CASCADE' });
PushSubscription.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

User.hasMany(ReadinessSnapshot, { foreignKey: 'userId', onDelete: 'CASCADE' });
ReadinessSnapshot.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

Subject.hasMany(ReadinessSnapshot, { foreignKey: 'subjectId', onDelete: 'CASCADE' });
ReadinessSnapshot.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subjectRef' });
Subject.hasOne(SubjectGoal, { foreignKey: 'subject', as: 'goal', onDelete: 'CASCADE' });
SubjectGoal.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef' });
// StudySquad associationsUser.hasMany(SubjectGoal, { foreignKey: 'user', as: 'subjectGoals', onDelete: 'CASCADE' });
SubjectGoal.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
User.hasMany(StudySquad, { foreignKey: 'adminUserId', as: 'ownedSquads', onDelete: 'CASCADE' });
StudySquad.belongsTo(User, { foreignKey: 'adminUserId', as: 'adminRef' });

StudySquad.hasMany(SquadMember, { foreignKey: 'squadId', onDelete: 'CASCADE' });
SquadMember.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squadRef' });

User.hasMany(SquadMember, { foreignKey: 'userId', onDelete: 'CASCADE' });
SquadMember.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

StudySquad.hasMany(SquadChallenge, { foreignKey: 'squadId', onDelete: 'CASCADE' });
SquadChallenge.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squadRef' });

SquadChallenge.hasMany(SquadChallengeContribution, { foreignKey: 'challengeId', onDelete: 'CASCADE' });
SquadChallengeContribution.belongsTo(SquadChallenge, { foreignKey: 'challengeId', as: 'challengeRef' });

User.hasMany(SquadChallengeContribution, { foreignKey: 'userId', onDelete: 'CASCADE' });
SquadChallengeContribution.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

StudySquad.hasMany(SquadAchievement, { foreignKey: 'squadId', onDelete: 'CASCADE' });
SquadAchievement.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squadRef' });

StudySquad.hasMany(SquadActivity, { foreignKey: 'squadId', onDelete: 'CASCADE' });
SquadActivity.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squadRef' });

User.hasMany(SquadActivity, { foreignKey: 'userId', onDelete: 'CASCADE' });
SquadActivity.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

SquadActivity.hasMany(SquadActivityReaction, { foreignKey: 'activityId', onDelete: 'CASCADE' });
SquadActivityReaction.belongsTo(SquadActivity, { foreignKey: 'activityId', as: 'activityRef' });

User.hasMany(SquadActivityReaction, { foreignKey: 'userId', onDelete: 'CASCADE' });
SquadActivityReaction.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

// Syllabus associations
User.hasMany(Syllabus, { foreignKey: 'userId', onDelete: 'CASCADE' });
Syllabus.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

Syllabus.hasMany(SyllabusTopic, { foreignKey: 'syllabusId', onDelete: 'CASCADE' });
SyllabusTopic.belongsTo(Syllabus, { foreignKey: 'syllabusId', as: 'syllabusRef' });

// PDFAnnotation associations
User.hasMany(PDFAnnotation, { foreignKey: 'userId', onDelete: 'CASCADE' });
PDFAnnotation.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });
// DeckRating associations
DeckRating.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });
User.hasMany(DeckRating, { foreignKey: 'userId', as: 'ratings', onDelete: 'CASCADE' });
DeckRating.belongsTo(Subject, { foreignKey: 'deckId', as: 'deckRef', onDelete: 'CASCADE' });
Subject.hasMany(DeckRating, { foreignKey: 'deckId', as: 'ratings', onDelete: 'CASCADE' });

module.exports = {  sequelize,  User,  Exam,
  Subject,
  Topic,
  PYQ,
  StudyPlan,
  Quiz,
  QuizAttempt,
  Note,
  Flashcard,
  Progress,
  Feedback,
  ActivityLog,
  UsageQuota,
  Achievement,
  FocusSession,
  QuizTelemetryEvent,
  QuizBookmark,
  DeckRating,
  UserBadge,
  Badge,
  BattleSession,
  BattleParticipant,
  PYQAnalysis,
  PYQQuestion,
  Notification,
  PushSubscription,
  ReadinessSnapshot,
  SubjectGoal,
  StudySquad,  SquadMember,
  SquadChallenge,
  SquadChallengeContribution,
  SquadAchievement,
  SquadActivity,
  SquadActivityReaction,
  FlashcardDeck,
  DeckCollaborator,
  PDFAnnotation,
  QuizRoom,
  AuditLog,
};