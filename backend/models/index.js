const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/db');

 feature/wcag-aaa-overhaul
const AIUsageLog = require('./AIUsageLog')(sequelize, DataTypes);
const ProviderHealthStatus = require('./ProviderHealthStatus')(sequelize, DataTypes);



 main
/**
 * The model registry: every Sequelize model the backend can reach, wired to
 * the single shared instance and associated in one place.
 *
 * Three export shapes coexist under backend/models, and each has to be
 * imported the way it was written.
 *
 *   instance  the file defines the model at load and exports the model
 *             itself, so the import must not be invoked.
 *   factory   the file exports a function taking (sequelize, DataTypes) and
 *             returning the model, so the import must be invoked.
 *   pair      the file exports the Model subclass alongside an init function,
 *             so the import is destructured and the init called below. A
 *             subclass is not usable until init has run.
 *
 * Importing one shape as another does not fail where it is written. Invoking
 * an instance throws "Class constructor model cannot be invoked without
 * 'new'" while this file loads, which takes the whole backend down; failing to
 * invoke a factory leaves a bare function in the registry, so the first query
 * against it throws "findAll is not a function" from a stack that points at a
 * controller rather than at here. Both were live in this file at once.
 *
 * Each group below is alphabetical. scripts/check-model-registry.js reads
 * every entry back against the file it names and fails on a mismatch, so a
 * model added to the wrong group is caught before it can boot.
 */

// Models exporting a defined instance.
const Achievement = require('./Achievement');
const ActivityLog = require('./ActivityLog');
const AlumniMentorProfile = require('./AlumniMentorProfile');
const AuditLog = require('./AuditLog');
const Badge = require('./Badge');
const BattleParticipant = require('./BattleParticipant');
const BattleSession = require('./BattleSession');
const BountyAnswer = require('./BountyAnswer');
const BountyQuestion = require('./BountyQuestion');
const CodeRoom = require('./CodeRoom');
const CommentFlag = require('./CommentFlag');
const CommentVote = require('./CommentVote');
const DeckCollaborator = require('./DeckCollaborator');
const DeckRating = require('./DeckRating');
const DoubtSession = require('./DoubtSession');
const DoubtSessionMessage = require('./DoubtSessionMessage');
const Exam = require('./Exam');
const ExamIntegrityReport = require('./ExamIntegrityReport');
const ExamStrategy = require('./ExamStrategy');
const FactualityVerificationLog = require('./FactualityVerificationLog');
const Feedback = require('./Feedback');
const Flashcard = require('./Flashcard');
const FlashcardDeck = require('./FlashcardDeck');
const FlashcardReviewHistory = require('./FlashcardReviewHistory');
const FlashcardSchedulingState = require('./FlashcardSchedulingState');
const FocusSession = require('./FocusSession');
const FocusSessionLog = require('./FocusSessionLog');
const Folder = require('./Folder');
 feature/wcag-aaa-overhaul


 main
const HandwrittenSubmission = require('./HandwrittenSubmission');
const LearningPath = require('./LearningPath');
const MistakeLogEntry = require('./MistakeLogEntry');
const MockExamSession = require('./MockExamSession');
const MockInterview = require('./MockInterview');
const MockInterviewSession = require('./MockInterviewSession');
const Note = require('./Note');
const NoteLink = require('./NoteLink');
const Notification = require('./Notification');
const NotificationSettings = require('./NotificationSettings');
const PYQ = require('./PYQ');
const PYQAnalysis = require('./PYQAnalysis');
const PYQQuestion = require('./PYQQuestion');
const PlanRevisionMetadata = require('./PlanRevisionMetadata');
const PodcastEpisode = require('./PodcastEpisode');
const Progress = require('./Progress');
const PushSubscription = require('./PushSubscription');
const Question = require('./Question');
const QuestionComment = require('./QuestionComment');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const QuizBookmark = require('./QuizBookmark');
const QuizTelemetryEvent = require('./QuizTelemetryEvent');
const QuizValidationLog = require('./QuizValidationLog');
const ReadinessSnapshot = require('./ReadinessSnapshot');
 feature/wcag-aaa-overhaul
const Subject = require('./Subject');
const SubjectGoal = require('./SubjectGoal');
const Topic = require('./Topic');
const StudyPlan = require('./StudyPlan');

const StudyHabit = require('./StudyHabit')(sequelize, DataTypes);
const HabitLog = require('./HabitLog')(sequelize, DataTypes);
const HabitStreak = require('./HabitStreak')(sequelize, DataTypes);



const StudySquad = require('./StudySquad');
const SquadMember = require('./SquadMember');
const SquadChallenge = require('./SquadChallenge');
const SquadChallengeContribution = require('./SquadChallengeContribution');

const MockExamSession = require('./MockExamSession');

 main
const ResumeParseSession = require('./ResumeParseSession');

const ReviewSubmissionToken = require('./ReviewSubmissionToken');
const SalaryNegotiation = require('./SalaryNegotiation');
const SavedSession = require('./SavedSession');
const SchedulerVersion = require('./SchedulerVersion');
const SecurityAuditLog = require('./SecurityAuditLog');
const SkillDependency = require('./SkillDependency');
const SquadAchievement = require('./SquadAchievement');
const SquadActivity = require('./SquadActivity');
const SquadActivityReaction = require('./SquadActivityReaction');
const SquadAuditLog = require('./SquadAuditLog');
 feature/wcag-aaa-overhaul
const StudyReminder = require('./StudyReminder');
const StudyTip = require('./StudyTip');

const SquadChallenge = require('./SquadChallenge');
const SquadChallengeContribution = require('./SquadChallengeContribution');
const SquadMember = require('./SquadMember');
 main
const StudyGoal = require('./StudyGoal');


const StudyGoalProgress = require('./StudyGoalProgress');
const StudyPlan = require('./StudyPlan');
const StudyPlanVersion = require('./StudyPlanVersion');
const StudyReminder = require('./StudyReminder');
const StudySquad = require('./StudySquad');
const StudyTask = require('./StudyTask');
const StudyTip = require('./StudyTip');
const Subject = require('./Subject');
const SubjectGoal = require('./SubjectGoal');
const Syllabus = require('./Syllabus');
const SyllabusTopic = require('./SyllabusTopic');
const Topic = require('./Topic');
const UsageQuota = require('./UsageQuota');
const User = require('./User');
const UserBadge = require('./UserBadge');
const UserPasskey = require('./UserPasskey');
const UserProgress = require('./UserProgress');
const User = require('./User');
const VivaSession = require('./VivaSession');
 feature/wcag-aaa-overhaul



const ModeratorAuditLog = require('./ModeratorAuditLog');

 main
const WeeklyStudyReport = require('./WeeklyStudyReport');

// Models exporting a (sequelize, DataTypes) factory.
const AIUsageLog = require('./AIUsageLog')(sequelize, DataTypes);
const HabitLog = require('./HabitLog')(sequelize, DataTypes);
const HabitStreak = require('./HabitStreak')(sequelize, DataTypes);
const InterviewAnalytics = require('./InterviewAnalytics')(sequelize, DataTypes);
const ProviderHealthStatus = require('./ProviderHealthStatus')(sequelize, DataTypes);
const SharedNote = require('./SharedNote')(sequelize, DataTypes);
const StudyHabit = require('./StudyHabit')(sequelize, DataTypes);
const StudyMilestone = require('./StudyMilestone')(sequelize, DataTypes);
const StudySession = require('./StudySession')(sequelize, DataTypes);
const UserMilestone = require('./UserMilestone')(sequelize, DataTypes);

// Models exporting a { Model, initModel } pair.
const { AnalyticsEvent, initAnalyticsEvent } = require('./AnalyticsEvent');
const { Bounty, initBounty } = require('./Bounty');
const { BountyClaim, initBountyClaim } = require('./BountyClaim');
const { BountySolution, initBountySolution } = require('./BountySolution');
const { BountySolutionVote, initBountySolutionVote } = require('./BountySolutionVote');
const { JobApplication, initJobApplication } = require('./JobApplication');
const { JobOpportunity, initJobOpportunity } = require('./JobOpportunity');
const { ModeratorAuditLog, initModeratorAuditLog } = require('./ModeratorAuditLog');
const { Sponsor, initSponsor } = require('./Sponsor');

// A Model subclass is not usable until init() has run against the shared
// instance. Nothing else in the tree calls these, so the registry must.
initAnalyticsEvent(sequelize);
initBounty(sequelize);
initBountyClaim(sequelize);
initBountySolution(sequelize);
initBountySolutionVote(sequelize);
initJobApplication(sequelize);
initJobOpportunity(sequelize);
initModeratorAuditLog(sequelize);
initSponsor(sequelize);

// User associations
User.hasMany(Exam, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Subject, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Topic, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(PYQ, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Bounty, { foreignKey: 'authorId', as: 'bounties', onDelete: 'CASCADE' });
Bounty.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
Bounty.belongsTo(User, { foreignKey: 'winnerId', as: 'winner' });

Bounty.hasMany(BountySolution, { foreignKey: 'bountyId', as: 'solutions', onDelete: 'CASCADE' });
BountySolution.belongsTo(Bounty, { foreignKey: 'bountyId', as: 'bounty' });
BountySolution.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

BountySolution.hasMany(BountySolutionVote, { foreignKey: 'solutionId', as: 'votes', onDelete: 'CASCADE' });
BountySolutionVote.belongsTo(BountySolution, { foreignKey: 'solutionId', as: 'solution' });
User.hasMany(StudyPlan, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(LearningPath, { foreignKey: 'userId', onDelete: 'CASCADE' });
LearningPath.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });
User.hasMany(Quiz, { foreignKey: 'createdBy', onDelete: 'CASCADE' });
User.hasMany(QuizAttempt, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Note, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Flashcard, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Question, { foreignKey: 'user', onDelete: 'CASCADE' });
Question.belongsTo(User, { foreignKey: 'user', as: 'userRef' });
User.hasMany(QuestionComment, { foreignKey: 'authorId', onDelete: 'CASCADE' });
QuestionComment.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
QuestionComment.hasMany(QuestionComment, { foreignKey: 'parentCommentId', as: 'replies', onDelete: 'CASCADE' });
QuestionComment.belongsTo(QuestionComment, { foreignKey: 'parentCommentId', as: 'parent' });
QuestionComment.hasMany(CommentVote, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentVote.belongsTo(QuestionComment, { foreignKey: 'commentId', as: 'comment' });
QuestionComment.hasMany(CommentFlag, { foreignKey: 'commentId', onDelete: 'CASCADE' });
CommentFlag.belongsTo(QuestionComment, { foreignKey: 'commentId', as: 'comment' });
CommentFlag.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });
User.hasMany(DoubtSession, { foreignKey: 'studentId', onDelete: 'CASCADE' });
DoubtSession.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
DoubtSession.hasMany(DoubtSessionMessage, { foreignKey: 'sessionId', as: 'messages', onDelete: 'CASCADE' });
DoubtSessionMessage.belongsTo(DoubtSession, { foreignKey: 'sessionId', as: 'session' });
Note.hasMany(Question, { foreignKey: 'noteId', onDelete: 'CASCADE' });
Question.belongsTo(Note, { foreignKey: 'noteId', as: 'noteRef' });
User.hasMany(FlashcardDeck, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Progress, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Feedback, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(ActivityLog, { foreignKey: 'user', onDelete: 'CASCADE' });
User.hasMany(Achievement, { foreignKey: 'userId', as: 'achievements', onDelete: 'CASCADE' });
User.hasMany(UserBadge, { foreignKey: 'userId', as: 'badgesRef', onDelete: 'CASCADE' });
User.hasMany(UsageQuota, { foreignKey: 'userId', onDelete: 'CASCADE' });
User.hasMany(UserPasskey, { foreignKey: 'userId', as: 'passkeys', onDelete: 'CASCADE' });
UserPasskey.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });
User.hasMany(VivaSession, { foreignKey: 'userId', as: 'vivaSessions', onDelete: 'CASCADE' });
VivaSession.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });
User.hasMany(FactualityVerificationLog, { foreignKey: 'userId', as: 'factualityLogs', onDelete: 'CASCADE' });
FactualityVerificationLog.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

Note.hasMany(NoteLink, { foreignKey: 'sourceNoteId', as: 'outgoingLinks', onDelete: 'CASCADE' });
Note.hasMany(NoteLink, { foreignKey: 'targetNoteId', as: 'incomingLinks', onDelete: 'CASCADE' });
NoteLink.belongsTo(Note, { foreignKey: 'sourceNoteId', as: 'sourceNote' });
NoteLink.belongsTo(Note, { foreignKey: 'targetNoteId', as: 'targetNote' });

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
Subject.hasMany(VivaSession, { foreignKey: 'subjectId', as: 'vivaSessions', onDelete: 'CASCADE' });
VivaSession.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subjectRef' });

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

Topic.hasMany(SkillDependency, {
  foreignKey: 'skillId',
  as: 'dependencies',
  onDelete: 'CASCADE',
});

Topic.hasMany(SkillDependency, {
  foreignKey: 'prerequisiteSkillId',
  as: 'dependents',
  onDelete: 'CASCADE',
});

SkillDependency.belongsTo(Topic, {
  foreignKey: 'skillId',
  as: 'skill',
});

SkillDependency.belongsTo(Topic, {
  foreignKey: 'prerequisiteSkillId',
  as: 'prerequisite',
});

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
QuizAttempt.hasOne(ExamIntegrityReport, { foreignKey: 'quizAttemptId', as: 'integrityReport', onDelete: 'CASCADE' });
ExamIntegrityReport.belongsTo(QuizAttempt, { foreignKey: 'quizAttemptId', as: 'attemptRef' });
ExamIntegrityReport.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

// Note associations
Note.belongsTo(Subject, { foreignKey: 'subject', as: 'subjectRef', onDelete: 'CASCADE' });
Note.belongsTo(Topic, { foreignKey: 'topic', as: 'topicRef', onDelete: 'CASCADE' });
Note.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

// CodeRoom associations
CodeRoom.belongsTo(User, { foreignKey: 'userId', as: 'creator' });
User.hasMany(CodeRoom, { foreignKey: 'userId' });

// SquadAuditLog associations
SquadAuditLog.belongsTo(User, { foreignKey: 'userId', as: 'actor' });
SquadAuditLog.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squad' });

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

// FocusSessionLog associations
FocusSessionLog.belongsTo(User, { foreignKey: 'user', as: 'userRef' });

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

 feature/wcag-aaa-overhaul
// StudySquad.hasMany(Whiteboard, { foreignKey: 'squadId', onDelete: 'CASCADE' });
// Whiteboard.belongsTo(StudySquad, { foreignKey: 'squadId', as: 'squadRef' });


User.hasMany(MockExamSession, { foreignKey: 'userId', onDelete: 'CASCADE' });
MockExamSession.belongsTo(User, { foreignKey: 'userId', as: 'userRef' });

Note.hasMany(NoteLink, { foreignKey: 'sourceNoteId', as: 'outgoingLinks', onDelete: 'CASCADE' });
Note.hasMany(NoteLink, { foreignKey: 'targetNoteId', as: 'incomingLinks', onDelete: 'CASCADE' });
NoteLink.belongsTo(Note, { foreignKey: 'sourceNoteId', as: 'sourceNote' });
NoteLink.belongsTo(Note, { foreignKey: 'targetNoteId', as: 'targetNote' });


 main
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

SyllabusTopic.belongsTo(Note, { foreignKey: 'linkedNoteId', as: 'linkedNote', onDelete: 'SET NULL' });

// Bounty associations
User.hasMany(BountyQuestion, { foreignKey: 'userId', as: 'bountyQuestions', onDelete: 'CASCADE' });
BountyQuestion.belongsTo(User, { foreignKey: 'userId', as: 'creator' });

Subject.hasMany(BountyQuestion, { foreignKey: 'subjectId', as: 'bountyQuestions', onDelete: 'SET NULL' });
BountyQuestion.belongsTo(Subject, { foreignKey: 'subjectId', as: 'subjectRef' });

BountyQuestion.hasMany(BountyAnswer, { foreignKey: 'questionId', as: 'answers', onDelete: 'CASCADE' });
BountyAnswer.belongsTo(BountyQuestion, { foreignKey: 'questionId', as: 'question' });

User.hasMany(BountyAnswer, { foreignKey: 'userId', as: 'bountyAnswers', onDelete: 'CASCADE' });
BountyAnswer.belongsTo(User, { foreignKey: 'userId', as: 'author' });

module.exports = {
  sequelize,
  // The library namespace, so callers can reach Sequelize.Op without a
  // second require. Distinct from the instance above.
  Sequelize,
  AIUsageLog,
  Achievement,
  ActivityLog,
  AlumniMentorProfile,
  AnalyticsEvent,
  AuditLog,
  Badge,
  BattleParticipant,
  BattleSession,
  Bounty,
  BountyAnswer,
  BountyClaim,
  BountyQuestion,
  BountySolution,
  BountySolutionVote,
  CodeRoom,
  CommentFlag,
  CommentVote,
  DeckCollaborator,
  DeckRating,
  DoubtSession,
  DoubtSessionMessage,
  Exam,
  ExamIntegrityReport,
  ExamStrategy,
  FactualityVerificationLog,
  Feedback,
  Flashcard,
  FlashcardDeck,
  FlashcardReviewHistory,
  FlashcardSchedulingState,
  FocusSession,
  FocusSessionLog,
  Folder,
  HabitLog,
  HabitStreak,
  HandwrittenSubmission,
  InterviewAnalytics,
  JobApplication,
  JobOpportunity,
  LearningEvent,
  LearningPath,
  MistakeLogEntry,
  MockExamSession,
  MockInterview,
  MockInterviewSession,
  ModeratorAuditLog,
  Note,
  NoteLink,
  Notification,
  NotificationSettings,
  PYQ,
  PYQAnalysis,
  PYQQuestion,
  PlanRevisionMetadata,
  PodcastEpisode,
  Progress,
  ProviderHealthStatus,
  PushSubscription,
  Question,
  QuestionComment,
  Quiz,
  QuizAttempt,
  QuizBookmark,
  QuizTelemetryEvent,
  QuizValidationLog,
  ReadinessSnapshot,
  ResumeParseSession,
  ReviewSubmissionToken,
  SalaryNegotiation,
  SavedSession,
  SchedulerVersion,
  SecurityAuditLog,
  SharedNote,
  SkillDependency,
  Sponsor,
  SquadAchievement,
  SquadActivity,
  SquadActivityReaction,
  SquadAuditLog,
  SquadChallenge,
  SquadChallengeContribution,
  SquadMember,
  StudyGoal,
  StudyGoalProgress,
  StudyHabit,
  StudyMilestone,
  StudyPlan,
  StudyPlanVersion,
  StudyReminder,
  StudySession,
  StudySquad,
  StudyTask,
  StudyTip,
  Subject,
  SubjectGoal,
  Syllabus,
  SyllabusTopic,
  Topic,
  UsageQuota,
  User,
  UserBadge,
  UserMilestone,
  UserPasskey,
  UserProgress,
  VivaSession,
  WeeklyStudyReport,
};
