require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const csrf = require('csurf');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/error');
const { protect } = require('./middleware/auth');
const fs = require('fs');
const PYQ = require('./models/PYQ');
const Note = require('./models/Note');
const Achievement = require('./models/Achievement');
const http = require('http');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const passport = require('./config/passport');
const { getCorsMiddleware, getSocketCorsOrigin } = require('./middleware/corsHandler');
// Validate required environment variables at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  console.error('Set JWT_SECRET in your .env file or environment before starting the server.');
  process.exit(1);
}

if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.warn('WARNING: GEMINI_API_KEY is not set. AI endpoints will return mock data.');
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const academicRoutes = require('./routes/academicRoutes');
const pyqRoutes = require('./routes/pyqRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const quizRoutes = require('./routes/quizRoutes');
const flashcardRoutes = require('./routes/flashcardRoutes');
const noteRoutes = require('./routes/noteRoutes');
const progressRoutes = require('./routes/progressRoutes');
const communityRoutes = require('./routes/communityRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { initNotificationCron } = require('./services/notificationService');
const { initDifficultyCalibratorCron } = require('./services/difficultyCalibrator');
initNotificationCron();
initDifficultyCalibratorCron();

// Connect to Database
connectDB();

// Connect to Redis
const redisService = require('./services/redisService');
redisService.connect();

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:', "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    xContentTypeOptions: true,
  })
);
app.use(getCorsMiddleware());
app.use(passport.initialize());

// Cookie parser (required for csurf cookie-based tokens)
app.use(cookieParser());

// CSRF protection middleware
const csrfProtection = csrf({ cookie: true });
// The batched quiz-telemetry endpoint is flushed via navigator.sendBeacon()
// on tab close/navigation, which cannot attach a CSRF header. It's already
// protected by its own JWT-based auth (see middleware/telemetryAuth.js), so
// CSRF protection is skipped only for this one route.
app.use((req, res, next) => {
  if (req.path === '/api/quiz/telemetry/batch' || req.path === '/api/quizzes/telemetry/batch') {
    return next();
  }
  return csrfProtection(req, res, next);
});
// CSRF Token Endpoint for frontend clients
app.get('/api/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Response compression (skip binary uploads via default filter)
app.use(compression());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// General API rate limiter: 100 requests per 15 minutes per IP
// Auth routes have tighter per-route limits defined in authRoutes.js
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: () => process.env.NODE_ENV === 'test',
  message: { success: false, error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Serve avatar images publicly — profile pictures are displayed to other
// users (e.g. in community features) and aren't sensitive like notes/PYQs.
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));

// Set Static Folder for File Uploads (Protected)
// protect, Note, PYQ already imported at top of file

app.get('/uploads/:filename', protect, async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const fileUrl = `/uploads/${filename}`;
    
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
      }
    }

    if (!record) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (owner !== req.user.id && !isPublic) {
      return res.status(403).json({ success: false, error: 'Not authorized to access this file' });
    }

    res.sendFile(path.join(__dirname, 'uploads', filename));
  } catch (error) {
    next(error);
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/pyqs', pyqRoutes);
app.use('/api/study-plans', studyPlanRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to OpenPrep AI Backend REST API API Services' });
});

// Health Check Route
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Swagger UI Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'OpenPrep AI API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}));

// Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;


const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: getSocketCorsOrigin(),
    methods: ['GET', 'POST'],
    credentials: true,
  },  // Longer timeouts tolerate throttled timers in backgrounded/idle browser
  // tabs, so active lobby players aren't disconnected on a missed heartbeat.
  pingTimeout: 60000,
  pingInterval: 25000,
});
// Initialize socket handlers
require('./sockets/battleHandler')(io);
require('./sockets/chatHandler')(io);

// Start weekly digest background scheduler
const { startScheduler } = require('./services/weeklyDigestService');
startScheduler();

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
