require('dotenv').config();
const { Sentry } = require('./config/sentry');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { doubleCsrfProtection, generateCsrfToken, csrfErrorHandler } = require('./middleware/securityMiddleware');
const { authRateLimiter, aiRateLimiter, generalRateLimiter } = require('./middleware/rateLimitMiddleware');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { connectDB } = require('./config/db');
const { Op } = require('sequelize');
const errorHandler = require('./middleware/error');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/requestLogger');
const { protect } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const PYQ = require('./models/PYQ');
const Note = require('./models/Note');
const Achievement = require('./models/Achievement');
const swaggerSpec = require('./config/swagger');
const mockInterviewRoutes = require('./routes/mockInterviewRoutes');
let apiReference;
try {
  apiReference = require('@scalar/express-api-reference').apiReference;
} catch (e) {
  apiReference = null;
}
const passport = require('./config/passport');
const { getCorsMiddleware, getSocketCorsOrigin } = require('./middleware/corsHandler');
const { metricsMiddleware, getMetrics } = require('./middleware/metricsMiddleware');

// Validate the whole environment against the schema in config/env.js before
// anything else loads. Reports every problem at once and exits in production;
// in development it warns and continues on defaults so the API still boots.
//
// This supersedes the ad-hoc JWT_SECRET / GEMINI_API_KEY guards that used to
// live here: both are declared in the schema now, JWT_SECRET is additionally
// length-checked in production, and GEMINI_API_KEY surfaces through the
// integration summary below. Reported through the structured logger so the
// startup report lands in the same stream as every other log line.
const { loadEnv, summariseIntegrations } = require('./config/env');

const env = loadEnv(process.env, { logger });

logger.info('configuration loaded', {
  env: env.NODE_ENV,
  integrations: summariseIntegrations(env),
});

if (!process.env.RECAPTCHA_SECRET_KEY) {
  console.warn('WARNING: RECAPTCHA_SECRET_KEY is not set. reCAPTCHA verification will be bypassed.');
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const academicRoutes = require('./routes/academicRoutes');
const pyqRoutes = require('./routes/pyqRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const streakRoutes = require('./routes/streakRoutes');
const quizRoutes = require('./routes/quizRoutes');
const questionDiscussionRoutes = require('./routes/questionDiscussionRoutes');
const commentRoutes = require('./routes/commentRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const flashcardDeckRoutes = require('./routes/flashcardDeckRoutes');
const shareRoutes = require('./routes/shareRoutes');
const noteRoutes = require('./routes/noteRoutes');
const adminRoutes = require('./routes/adminRoutes');
const searchRoutes = require('./routes/searchRoutes');
const progressRoutes = require('./routes/progressRoutes');
const confidenceCalibrationRoutes = require('./routes/confidenceCalibrationRoutes');
const handwrittenSubmissionRoutes = require('./routes/handwrittenSubmissionRoutes');
const communityRoutes = require('./routes/communityRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const doubtSessionRoutes = require('./routes/doubtSessionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const aiEditorRoutes = require('./routes/aiEditorRoutes');
const quizBattleRoutes = require('./routes/quizBattleRoutes');
const pdfAnnotationRoutes = require('./routes/pdfAnnotationRoutes');
const folderRoutes = require('./routes/folderRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const fatigueRoutes = require('./routes/fatigueRoutes');
const pdfRoutes = require('./routes/pdfRoutes');
const syncRoutes = require('./routes/syncRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const gamificationRoutes = require('./routes/gamificationRoutes');
const battleRoutes = require('./routes/battleRoutes');
const readinessRoutes = require('./routes/readinessRoutes');
const proctoringRoutes = require('./routes/proctoringRoutes');
const squadRoutes = require('./routes/squadRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const visualizerRoutes = require('./routes/visualizerRoutes');
const weaknessDetectionRoutes = require('./routes/weaknessDetectionRoutes');
const pyqIntelligenceRoutes = require('./routes/pyqIntelligenceRoutes');
const adaptivePlannerRoutes = require('./routes/adaptivePlannerRoutes');
const communityResourceRoutes = require('./routes/communityResourceRoutes');
const attemptHistoryRoutes = require('./routes/attemptHistoryRoutes');
const learningInsightsRoutes = require('./routes/learningInsightsRoutes');
const studyGoalSchedulerRoutes = require('./routes/studyGoalSchedulerRoutes');
const analyticsInsightsRoutes = require('./routes/analyticsInsightsRoutes');
const adaptiveExamRoutes = require('./routes/adaptiveExamRoutes');
const diagramQuestionRoutes = require('./routes/diagramQuestionRoutes');
const classroomRoutes = require('./routes/classroomRoutes');
const studyReminderRoutes = require('./routes/studyReminderRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const { initNotificationCron } = require('./services/notificationService');
const { initDifficultyCalibratorCron } = require('./services/difficultyCalibrator');
const { initNightlyBadgeEvaluatorCron } = require('./services/badgeEvaluationService');
const { initNotificationScheduler } = require('./services/notificationSchedulerService');
initDifficultyCalibratorCron();
initNightlyBadgeEvaluatorCron();
initNotificationScheduler();

const cron = require('node-cron');
const calendarService = require('./services/calendarService');

// Run webhook channel renewal daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await calendarService.renewExpiringWebhookChannels();
    logger.info('Google Calendar Webhook Channels renewed successfully.');
  } catch (err) {
    logger.error('Failed to renew Google Calendar Webhook Channels:', err);
  }
});

// Connect to Database
connectDB();

// Connect to Redis
const redisService = require('./services/redisService');
redisService.connect();
const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Mounted first so every request — including ones rejected by CORS, CSRF or
// the rate limiters below — carries a correlation ID and gets an access log
// line. Health probes and static avatars are skipped by default.
app.use(requestLogger());

// Security Middlewares
// Directives shared by every response. Gemini calls happen server-side (see
// services/geminiService.js) but the API host is still explicitly
// allow-listed here in case a client ever needs to reach it directly.
const baseCspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com'],
  imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com', 'https://avatars.githubusercontent.com', 'https://avatar.com'],
  connectSrc: ["'self'", 'https://generativelanguage.googleapis.com', 'ws://localhost:*', 'http://localhost:*'],
  fontSrc: ["'self'", 'https:', 'data:', 'https://fonts.gstatic.com'],
  objectSrc: ["'none'"],
  frameAncestors: ["'none'"],
  upgradeInsecureRequests: [],
};

const hstsOptions = {
  maxAge: 63072000, // 2 years
  includeSubDomains: true,
  preload: true,
};

// Strict CSP for every route: no 'unsafe-inline' in script-src, which is
// what security-header scanners (e.g. Mozilla Observatory) require for a
// Grade A score.
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      ...baseCspDirectives,
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
    },
  },
  hsts: hstsOptions,
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
});

// swagger-ui-express renders its page with an inline bootstrap <script>, so
// /api-docs needs 'unsafe-inline' in script-src or the docs page breaks.
// Every other route keeps the strict policy above.
const docsSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      ...baseCspDirectives,
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
    },
  },
  hsts: hstsOptions,
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/docs') || req.path.startsWith('/api-docs')) {
    return docsSecurityHeaders(req, res, next);
  }
  return securityHeaders(req, res, next);
});
app.use(getCorsMiddleware());
app.use(passport.initialize());

// Cookie parser (required for csurf cookie-based tokens)
app.use(cookieParser());

// Prometheus metrics middleware
app.use(metricsMiddleware);

// CSRF protection middleware
// The batched quiz-telemetry endpoint is flushed via navigator.sendBeacon()
// on tab close/navigation, which cannot attach a CSRF header. It's already
// protected by its own JWT-based auth (see middleware/telemetryAuth.js), so
// CSRF protection is skipped only for this one route and /metrics.
app.use((req, res, next) => {
  if (req.path === '/api/quiz/telemetry/batch' || req.path === '/api/quizzes/telemetry/batch' || req.path === '/metrics') {
    return next();
  }
  return doubleCsrfProtection(req, res, next);
});

// Prometheus Metrics Exporter Endpoint
app.get('/metrics', getMetrics);

// CSRF Token Endpoint for frontend clients
app.get('/api/csrf-token', (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ csrfToken: token });
});

// Response compression (skip binary uploads via default filter)
app.use(compression({
  level: 6, // balanced gzip compression
  threshold: 0,
}));
// Existing middleware setup
app.use(express.json());
app.use(cors(corsOptions));
app.use(requestLogger);

// AI Usage Budget middleware
const { checkAIBudget, recordUsageAfterRequest } = require('./middleware/aiUsageBudgetMiddleware');
app.use(checkAIBudget);
app.use(recordUsageAfterRequest);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Mount distributed rate limiters
app.use('/api/auth', authRateLimiter);
app.use('/api/ai', aiRateLimiter);
app.use('/api/', generalRateLimiter);

// Serve avatar images publicly — profile pictures are displayed to other
// users (e.g. in community features) and aren't sensitive like notes/PYQs.
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars'), {
  maxAge: '1y',
  immutable: true
}));

// Set Static Folder for File Uploads (Protected)
// protect, Note, PYQ already imported at top of file

// Helper to extract filename from a stored URL (handles full URLs and different path formats)
const extractFilename = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return path.basename(parsed.pathname);
  } catch {
    // Not a full URL, treat as path
    return path.basename(url);
  }
};

app.get(['/uploads/:filename', '/uploads/podcasts/:filename'], protect, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const fileUrl = req.path;

    // Direct match first (fast path for standard format)
    let record = await Note.findOne({ where: { fileUrl } });
    let isPublic = false;
    let owner = null;

    if (record) {
      isPublic = record.isPublic;
      owner = record.user;
    } else {
      record = await PYQ.findOne({ where: { fileUrl } });
      if (record) {
        owner = record.user;
      } else {
        const { PodcastEpisode } = require('./models');
        record = await PodcastEpisode.findOne({ where: { audioUrl: fileUrl } });
        if (record) {
          owner = record.userId;
        }
      }
    }

    // Fallback: fuzzy match by extracting filename from stored URLs
    // Handles cases where stored URL is a full URL or has different path format
    if (!record) {
      const allNotes = await Note.findAll({ where: { fileUrl: { [Op.ne]: null } } });
      for (const note of allNotes) {
        if (extractFilename(note.fileUrl) === filename) {
          record = note;
          isPublic = note.isPublic;
          owner = note.user;
          break;
        }
      }
    }
    if (!record) {
      const allPyqs = await PYQ.findAll({ where: { fileUrl: { [Op.ne]: null } } });
      for (const pyq of allPyqs) {
        if (extractFilename(pyq.fileUrl) === filename) {
          record = pyq;
          owner = pyq.user;
          break;
        }
      }
    }
    if (!record) {
      const { PodcastEpisode } = require('./models');
      const allEpisodes = await PodcastEpisode.findAll({ where: { audioUrl: { [Op.ne]: null } } });
      for (const episode of allEpisodes) {
        if (extractFilename(episode.audioUrl) === filename) {
          record = episode;
          owner = episode.userId;
          break;
        }
      }
    }

    if (!record) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (owner !== req.user.id && !isPublic) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this file' });
    }

    res.set('Cache-Control', 'private, max-age=86400'); // 1 day cache for protected assets
    let filePath = path.join(__dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      const podcastPath = path.join(__dirname, 'uploads', 'podcasts', filename);
      if (fs.existsSync(podcastPath)) {
        filePath = podcastPath;
      }
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/session', sessionRoutes);
app.post('/api/session/keepalive', protect, require('./controllers/authController').keepalive);
app.use('/api/academic', academicRoutes);
// 1. Mount the Previous Year Questions (PYQ) Router on the canonical plural path
app.use('/api/pyqs', pyqRoutes);

// 2. Intercept legacy singular endpoint calls and redirect with proper HTTP semantics
app.use('/api/pyq', (req, res) => {
  // Construct the new path maintaining any nested sub-routes and query parameters
  const canonicalPath = req.originalUrl.replace(/^\/api\/pyq/, '/api/pyqs');
  
  res.status(301).redirect(canonicalPath);
});
app.use('/api/community', communityRoutes);
app.use('/api/circuits', require('./routes/circuitRoutes'));
app.use('/api/language', require('./routes/languageRoutes'));
app.use('/api/bounties', require('./routes/bountyRoutes'));
app.use('/api/squads', squadRoutes);
app.use('/api/study', fatigueRoutes);
app.use('/api/documents', pdfAnnotationRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/questions', questionDiscussionRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/recommendations', recommendationRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/flashcard-decks', flashcardDeckRoutes);
app.use('/api/decks', require('./routes/publicDeckRoutes'));
app.use('/api/share', shareRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/submissions', handwrittenSubmissionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/confidence-calibration', confidenceCalibrationRoutes);
app.use('/api/users', userRoutes);
app.get('/api/user/quota', protect, require('./controllers/userController').getQuota);
app.put('/api/user/preferences/timezone', protect, require('./controllers/userController').updateTimezone);
app.get('/api/user/notifications/settings', protect, require('./controllers/userController').getNotificationSettings);
app.put('/api/user/notifications/settings', protect, require('./controllers/userController').updateNotificationSettings);
app.get('/api/user/dashboard', protect, require('./controllers/userController').getDashboardLayout);
app.post('/api/user/dashboard', protect, require('./controllers/userController').updateDashboardLayout);
app.use('/api/ai', aiRoutes);
app.use('/api/quiz-battles', quizBattleRoutes);
app.use('/api/adaptive-exams', adaptiveExamRoutes);
app.use('/api/quizzes/diagram-hotspot', diagramQuestionRoutes);
app.use('/api/diagram-hotspots', diagramQuestionRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/reminders', studyReminderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/doubts', doubtSessionRoutes);
app.use('/api/readiness', readinessRoutes);
app.use('/api/proctoring', proctoringRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', analyticsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/integrations/google-calendar', calendarRoutes);
app.use('/api/graphs', require('./routes/graphRoutes'));
app.use('/api/deck-versioning', require('./routes/deckVersionRoutes'));
app.use('/api/integrations', require('./routes/integrationRoutes'));
app.use('/api/gamification', gamificationRoutes);
app.use('/api/battles', battleRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/badges', badgeRoutes);

const leaderboardRoutes = require('./routes/leaderboardRoutes');
app.use('/api/leaderboard', leaderboardRoutes);app.get('/user/badges', protect, require('./controllers/badgeController').getUserBadges);
app.get('/api/user/badges', protect, require('./controllers/badgeController').getUserBadges);
app.get('/api/leaderboard', protect, require('./controllers/badgeController').getLeaderboardData);
app.get('/leaderboard', protect, require('./controllers/badgeController').getLeaderboardData);
app.use('/api/visualizer', visualizerRoutes);
const revisionSchedulerRoutes = require('./routes/revisionSchedulerRoutes');
app.use('/api/revision-schedules', revisionSchedulerRoutes);
app.use('/api/analytics-insights', analyticsInsightsRoutes);
const examStrategyRoutes = require('./routes/examStrategyRoutes');
const studyTipRoutes = require('./routes/studyTipRoutes');
app.use('/api/exam-strategies', examStrategyRoutes);
app.use('/api/study-tips', studyTipRoutes);
app.use('/api/learning-path', require('./routes/learningPathRoutes'));
app.use('/user/learning-path', require('./routes/learningPathRoutes'));
const studyGoalRoutes = require('./routes/studyGoalRoutes');
app.use('/api/study-goals', studyGoalRoutes);
const habitTrackerRoutes = require('./routes/habitTrackerRoutes');
app.use('/api/habits', habitTrackerRoutes);
app.use('/api/interviews', mockInterviewRoutes);
// Serve static assets from frontend build folder in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));

  // Catch-all route to serve index.html for SPA routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // Base Route (only in development/test)
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to OpenPrep AI Backend REST API API Services' });
  });
}

// Health Check Routes
app.get(['/api/v1/health', '/api/health'], async (req, res) => {
  try {
    const { sequelize } = require('./config/db');
    await sequelize.authenticate();
    res.status(200).json({
      status: 'ok',
      db: 'connected',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      error: error.message,
    });
  }
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.get('/api/test-error', (req, res) => {
  throw new Error('Test error for Sentry verification');
});

// Scalar API Reference & OpenAPI Spec endpoints (OpenAPI 3.1)
const isSwaggerEnabled = () => process.env.SWAGGER_ENABLED === 'true' || process.env.NODE_ENV !== 'production';

// Serve raw OpenAPI JSON at both legacy and new paths
app.get(['/api-docs.json', '/api/docs.json', '/api/openapi.json'], (req, res) => {
  if (!isSwaggerEnabled()) {
    return res.status(403).json({ success: false, error: 'API documentation is disabled in this environment.' });
  }
  res.json(swaggerSpec);
});

// Interactive Scalar docs at /api/docs (and legacy /api-docs)
app.use(['/api-docs', '/api/docs'], (req, res, next) => {
  if (!isSwaggerEnabled()) {
    return res.status(403).json({ success: false, error: 'API documentation is disabled in this environment.' });
  }
  next();
}, apiReference({
  content: swaggerSpec,
  theme: 'kepler',
  darkMode: true,
  layout: 'modern',
  metaData: {
    title: 'OpenPrep AI API Documentation',
  },
  customCss: '.scalar-api-reference { --scalar-color-accent: #f59e0b; }',
}));

// Error Handler Middleware
if (process.env.NODE_ENV !== 'test' && process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}
app.use(csrfErrorHandler);
app.use(errorHandler);

// Already coerced to a validated integer by config/env.js.
const PORT = env.PORT;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: getSocketCorsOrigin(),
    methods: ['GET', 'POST'],
    credentials: true,
  }, // Longer timeouts tolerate throttled timers in backgrounded/idle browser
  // tabs, so active lobby players aren't disconnected on a missed heartbeat.
  pingTimeout: 60000,
  pingInterval: 25000,
  connectionStateRecovery: {
    maxDisruption: 120000,
    restoreSession: true,
  },
});

// Configure Redis adapter for multi-instance pub/sub if available
try {
  const { createAdapter } = require('@socket.io/redis-adapter');
  if (redisService.client) {
    const pubClient = redisService.client;
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter configured successfully');
  }
} catch (adapterErr) {
  logger.warn('Socket.io Redis adapter skipped or failed to initialize, using memory adapter instead:', { err: adapterErr.message });
}

global.io = io;
// Initialize socket handlers
require('./sockets/battleHandler')(io);
require('./sockets/chatHandler')(io);
require('./sockets/crdtHandler')(io);
require('./sockets/squadHandler')(io);
require('./sockets/flashcardCollaborationHandler')(io);
require('./sockets/focusRoomHandler')(io);
require('./sockets/studyRoomSocket')(io);
require('./sockets/interviewSocket')(io);
require('./sockets/interviewSignalling')(io);
require('./sockets/noteSyncHandler')(io);
require('./services/webrtcSignalingService')(io);
// Authenticate Socket.io connections
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'access') {
      return next(new Error('Authentication error: Invalid token type'));
    }
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// User notification room listener
io.on('connection', (socket) => {
  if (socket.user && socket.user.id) {
    socket.join(`user:${socket.user.id}`);
  }
});

// Start background schedulers
const { startScheduler } = require('./services/weeklyDigestService');
startScheduler();

const { startReconciliationScheduler } = require('./services/otSyncService');
startReconciliationScheduler();

const { initStudyReminderCron } = require('./jobs/studyReminderCron');
const { initStreakReminderCron } = require('./jobs/streakReminderCron');
const { initBackupScheduler } = require('./services/backupScheduler');
initStudyReminderCron(io);
initStreakReminderCron(io);
initBackupScheduler();

const { startWorker } = require('./workers/squadActivityWorker');
startWorker();

const { startWorker: startTaskWorker } = require('./workers/taskQueueWorker');
startTaskWorker();

const { startMatchmakerDaemon } = require('./workers/matchmakerDaemon');
startMatchmakerDaemon();

const {
  registerWorker: registerInterviewProcessingWorker,
  recoverStaleJobs,
} = require('./services/interviewProcessingService');

registerInterviewProcessingWorker();

recoverStaleJobs().catch((error) => {
  logger.error('failed to recover stale interview processing jobs', {
    err: error,
  });
});
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  server.listen(PORT, () => {
    logger.info('server started', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
      logLevel: logger.getLevel(),
    });
  });
}

module.exports = app;
const {
  validatePartition,
} = require('./services/candidateRankingService');

// Validate the global candidate ranking cache once every night.
// This does not run for every interview.
cron.schedule('0 2 * * *', async () => {
  try {
    const result = await validatePartition(
      'global',
      'all'
    );

    logger.info(
      'candidate ranking consistency check completed',
      result
    );
  } catch (error) {
    logger.error(
      'candidate ranking consistency check failed',
      {
        error: error.message,
      }
    );
  }
});

// Graceful Shutdown Logic
const gracefulShutdown = (signal) => {
  logger.info('graceful shutdown started', { signal });

  // Force exit timeout (10 seconds maximum connection drain)
  const forceExitTimeout = setTimeout(() => {
    logger.error('graceful shutdown timed out — forcing exit', { timeoutMs: 10000 });
    process.exit(1);
  }, 10000);

  server.close(async () => {
    logger.info('HTTP connections drained, closing resource pools');
    clearTimeout(forceExitTimeout);

    try {
      const { stopReconciliationScheduler } = require('./services/otSyncService');
      stopReconciliationScheduler();
      logger.info('OT reconciliation scheduler stopped');
    } catch (otErr) {
      logger.error('error stopping OT reconciliation scheduler', { err: otErr });
    }

    try {
      const { stopWorker } = require('./workers/squadActivityWorker');
      stopWorker();
      logger.info('squad activity worker stopped');
    } catch (workerErr) {
      logger.error('error stopping squad activity worker', { err: workerErr });
    }

    try {
      const { stopWorker: stopTaskWorker } = require('./workers/taskQueueWorker');
      stopTaskWorker();
      logger.info('task queue worker stopped');
    } catch (taskWorkerErr) {
      logger.error('error stopping task queue worker', { err: taskWorkerErr });
    }

    try {
      // Drain queued search-index writes before the pools close, so an
      // in-flight embedding does not fire against a shutting-down process.
      const searchIndex = require('./services/searchIndexService');
      await searchIndex.drain();
      searchIndex.shutdown();
      logger.info('search index queue drained');
    } catch (indexErr) {
      logger.error('error draining search index queue', { err: indexErr });
    }

    try {
      const { sequelize } = require('./config/db');
      await sequelize.close();
      logger.info('postgres connection pool closed');
    } catch (dbErr) {
      logger.error('error closing database pool', { err: dbErr });
    }

    try {
      const redisService = require('./services/redisService');
      if (redisService.client) {
        await redisService.client.quit();
        logger.info('redis connection closed');
      }
    } catch (redisErr) {
      logger.error('error closing redis connection', { err: redisErr });
    }

    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));


