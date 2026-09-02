const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issuesDir = path.join(__dirname, '..', 'issues');
if (!fs.existsSync(issuesDir)) {
  fs.mkdirSync(issuesDir, { recursive: true });
}

// 25 Brand-New, Production-Grade, Architectural GitHub Issues for OpenPrep AI
const newIssues = [
  {
    number: 586,
    slug: "adaptive-cat-irt-difficulty-engine",
    title: "[FEAT]: Adaptive Dynamic Question Difficulty Adjustment (CAT/IRT Engine) with Item Response Theory Calibration",
    labels: ["enhancement", "ai", "quiz-system", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Static quizzes present either uniformly easy or excessively difficult questions, failing to match individual student ability. High-stakes exams (GRE, GMAT, Adaptive SAT) use **Computerized Adaptive Testing (CAT)** to dynamically measure latent student ability $(\\theta)$ and select the most informative next item.

This feature implements a **3-Parameter Logistic (3PL) Item Response Theory (IRT) Adaptive Testing Engine** that calibrates question discrimination $(a)$, difficulty $(b)$, and guessing parameter $(c)$ in real time.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Adaptive Quiz Runner (\`frontend/src/components/quiz/AdaptiveQuizRunner.jsx\`)**:
   - Real-time ability estimation gauge showing student proficiency $(\\theta \\in [-3.0, +3.0])$ with confidence interval bands.
   - Dynamic question loader fetching the mathematically optimal next question based on Fisher Information Maximization.
   - Convergence criteria indicator displaying test termination condition (standard error $< 0.25$ or max items reached).

2. **IRT Diagnostic Ability Report (\`frontend/src/components/quiz/IRTAbilityReport.jsx\`)**:
   - Visual Item Characteristic Curve (ICC) overlays comparing student response trajectory against cohort benchmarks.
   - Sub-domain mastery breakdown with Bayesian expected a posteriori (EAP) ability scores.

### Backend Architecture
1. **IRT Math Calculation Engine (\`backend/services/irtEngineService.js\`)**:
   - Implementation of 3PL probability model:
     $$P_i(\\theta) = c_i + \\frac{1 - c_i}{1 + e^{-D a_i (\\theta - b_i)}}$$
   - Newton-Raphson and Bayesian EAP ability updating algorithms executed after each item response.
   - Maximum Fisher Information item selection algorithm to pick the most informative unserved item from the question pool.

2. **REST Endpoints (\`backend/controllers/adaptiveQuizController.js\`)**:
   - \`POST /api/adaptive-quiz/start\` - Initializes an adaptive session, returning the initial baseline question.
   - \`POST /api/adaptive-quiz/submit-item\` - Accepts item response, updates $\\theta$, checks stopping conditions, and returns the next calibrated item.
   - \`GET /api/adaptive-quiz/:sessionId/report\` - Computes final ability estimate, percentile rank, and detailed IRT diagnostic curves.

---

## Acceptance Criteria
- [ ] Adaptive test algorithm reliably converges ability estimate within 15-20 questions with standard error $\\le 0.28$.
- [ ] Next question selection accurately queries items with maximum Fisher information relative to current estimated $\\theta$.
- [ ] Live UI shows smooth transitions without exposing raw formula parameters directly to test takers.
- [ ] Comprehensive unit tests verifying 3PL probability calculation, EAP updates, and edge-case response patterns.`
  },
  {
    number: 587,
    slug: "ai-cloze-deletion-anki-apkg-sync",
    title: "[FEAT]: AI-Powered Flashcard Cloze Deletion & Anki Import/Export (.apkg) with Media Attachment Preservation",
    labels: ["enhancement", "flashcards", "ai", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Millions of medical and STEM students already have extensive Anki flashcard libraries (\`.apkg\` collections) with embedded audio, diagrams, and Cloze deletions (\`{{c1::key term}}\`). Currently, migrating between OpenPrep AI and Anki requires tedious manual copying, losing formatting and spaced repetition histories.

This feature implements a **Bidirectional Anki (.apkg) Import/Export Engine** with automated AI Cloze Deletion extraction from textbook notes.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Anki Import / Export Modal (\`frontend/src/components/flashcards/AnkiSyncModal.jsx\`)**:
   - Drag-and-drop \`.apkg\` archive uploader with archive inspection summary (number of cards, media count, deck hierarchy).
   - Export configuration selector: OpenPrep native cards $\\rightarrow$ Anki \`.apkg\` with custom tags, SM-2 retention metrics, and embedded audio.
2. **Interactive Cloze Editor (\`frontend/src/components/flashcards/ClozeEditor.jsx\`)**:
   - WYSIWYG highlight-to-cloze shortcut (\`Ctrl+Shift+C\`) to convert selected text into numbered cloze markers (\`{{c1::...}}\`, \`{{c2::...}}\`).
   - "AI Auto-Cloze" button utilizing Gemini to detect high-yield definitions, dates, and formulas.

### Backend Architecture
1. **Anki APKG Parser & Packager (\`backend/services/ankiPackageService.js\`)**:
   - Unzips SQLite database (\`collection.anki2\` / \`collection.anki21\`) from \`.apkg\` archive.
   - Parses note models, cards, deck configurations, and maps media hashes from \`media\` JSON dictionary to uploaded assets.
   - Generates valid, compliant SQLite tables and zips assets back into standards-compliant \`.apkg\` bundles for export.
2. **AI Cloze Extraction Service (\`backend/services/clozeExtractionService.js\`)**:
   - Analyzes raw study text and generates structured cloze cards with hint text: \`{{c1::Photosynthesis::Process}}\`.
3. **REST Endpoints (\`backend/controllers/ankiController.js\`)**:
   - \`POST /api/flashcards/anki/import\` - Multi-part file upload processing \`.apkg\` and creating decks.
   - \`GET /api/flashcards/anki/export/:deckId\` - Streams generated \`.apkg\` binary download.
   - \`POST /api/flashcards/ai/generate-cloze\` - Generates cloze flashcards from user study notes.

---

## Acceptance Criteria
- [ ] Successfully parses standard Anki 2.1 \`.apkg\` decks including basic and cloze note types.
- [ ] Preserves all images, LaTeX formulas, and audio clips during import and export cycles.
- [ ] "AI Auto-Cloze" detects and brackets key domain terms accurately from input paragraphs.
- [ ] Jest integration tests verify SQLite schema extraction and zip integrity of exported packages.`
  },
  {
    number: 588,
    slug: "real-time-collaborative-whiteboard-vector-canvas",
    title: "[FEAT]: Real-Time Whiteboard with Freehand Vector Canvas, Math Shape Recognition & Multi-Cursor Sync",
    labels: ["enhancement", "frontend", "backend", "ui/ux", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
When studying complex subjects like Physics, Geometry, Organic Chemistry, or Circuit Design in study squads, text chat alone is insufficient. Students need a shared, zero-latency visual whiteboard where they can draw diagrams, sketch equations, and collaborate synchronously.

This feature adds a **Real-Time Collaborative Vector Whiteboard** powered by HTML5 Canvas / Fabric.js / tldraw, complete with AI math shape recognition and multi-cursor presence synchronization.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Whiteboard Canvas Workspace (\`frontend/src/components/whiteboard/WhiteboardCanvas.jsx\`)**:
   - Infinite pan and zoom canvas with pressure-sensitive freehand drawing, straight lines, geometric shapes, and KaTeX text blocks.
   - Real-time peer cursors with participant name badges and distinct color trails.
   - Undo/Redo historical stack synchronized across clients.
2. **AI Shape & Equation Recognizer (\`frontend/src/components/whiteboard/ShapeMagicTool.jsx\`)**:
   - "Magic Pen" mode: rough hand-drawn circles, ellipses, triangles, and coordinate axes automatically snap into pristine vector shapes.
   - Handwriting OCR: converts sketched math equations directly into editable KaTeX formulas.

### Backend Architecture
1. **WebSocket Vector Delta Synchronization (\`backend/services/whiteboardSocketService.js\`)**:
   - Operational Transformation / Yjs CRDT room provider broadcasting canvas element mutations (add, transform, delete, z-index).
   - Redis adapter for pub/sub event fan-out across horizontally scaled backend instances.
2. **Canvas State Persistence (\`backend/controllers/whiteboardController.js\`)**:
   - \`POST /api/whiteboard/:roomId/snapshot\` - Saves serialized vector JSON and generates PNG preview thumbnails.
   - \`GET /api/whiteboard/:roomId/state\` - Retrieves full canvas state upon user joining an ongoing study session.

---

## Acceptance Criteria
- [ ] Sub-50ms latency for drawing strokes and cursor synchronization across multiple squad members.
- [ ] Hand-drawn polygons and circles snap reliably to clean geometry when Magic Pen is active.
- [ ] Board state persists automatically to the database and reloads seamlessly upon page refresh.
- [ ] E2E Playwright test validating multi-user concurrent drawing without state desynchronization.`
  },
  {
    number: 589,
    slug: "ai-socratic-doubt-solver-probing",
    title: "[FEAT]: AI Socratic Doubt Solver with Interactive Stepwise Probing & Anti-Answer Hallucination Guards",
    labels: ["enhancement", "ai", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
When students ask AI tutors for help with difficult homework or exam problems, standard LLMs often output the complete solution immediately. This creates passive illusion of competence rather than deep conceptual mastery.

This feature implements an **AI Socratic Doubt Solver** that guides students through guided inquiry, conceptual hints, and diagnostic probing questions before revealing direct answers.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Socratic Dialogue Interface (\`frontend/src/components/socratic/SocraticChat.jsx\`)**:
   - Interactive conversation stream with progressive hint reveal cards (Level 1: Concept Hint $\\rightarrow$ Level 2: Formula Prompt $\\rightarrow$ Level 3: Intermediate Step $\\rightarrow$ Final Solution).
   - "I'm Stuck" quick-action pills and LaTeX formula input toolbar.
   - Confidence check-in prompts asking students to justify their intermediate reasoning.

2. **Doubt Resolution Summary Card (\`frontend/src/components/socratic/DoubtKeyTakeaway.jsx\`)**:
   - Auto-generated concept summary card capturing core takeaways, common pitfalls to avoid, and 1-click "Add to Flashcards".

### Backend Architecture
1. **Socratic Prompt Pipeline & State Machine (\`backend/services/socraticTutorService.js\`)**:
   - Prompt engineering framework with Gemini 1.5 Flash enforcing Socratic pedagogy rules:
     * Never give the full final answer in the first 2 interactions.
     * Ask 1 targeted probing question about the first necessary theorem or principle.
     * Detect and correct student misconceptions gently.
   - Anti-hallucination guardrail validating generated formulas against verified knowledge bases.

2. **REST Endpoints (\`backend/controllers/socraticController.js\`)**:
   - \`POST /api/socratic/ask\` - Submits a doubt with problem context and gets the next guided probing response.
   - \`POST /api/socratic/hint\` - Requests progressive level-based hint unlocks.
   - \`POST /api/socratic/convert-to-card\` - Converts resolved doubt takeaway into an SM-2 flashcard.

---

## Acceptance Criteria
- [ ] AI tutor actively challenges students with targeted conceptual questions before providing full solutions.
- [ ] Progressive 3-tier hint hierarchy unlocks on demand without revealing subsequent steps prematurely.
- [ ] Doubt resolution generates a concise key-takeaway summary suitable for immediate flashcard creation.
- [ ] Unit tests ensure system prompt compliance and structured JSON schema response validation.`
  },
  {
    number: 590,
    slug: "spaced-repetition-telegram-webpush-digest-notifications",
    title: "[FEAT]: Automated Study Deck Spaced Repetition Notification Engine via Web Push, Telegram Bot & Email Digests",
    labels: ["enhancement", "flashcards", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Spaced repetition algorithms (like SM-2 / FSRS) rely critically on reviewing flashcards at exact optimal intervals. If students forget to log into the web app, their review queues accumulate into intimidating backlogs, leading to study abandonment.

This feature establishes an **Automated Omnichannel Spaced Repetition Notification Engine** supporting Browser Web Push, an interactive Telegram Bot, and morning study email digests.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Background Schedule Worker (\`backend/workers/spacedRepetitionNotificationWorker.js\`)**:
   - BullMQ / Node-Cron worker running hourly to scan users with flashcards whose \`nextReviewDate \\le NOW()\`.
   - Aggregates due counts grouped by Subject and priority level, factoring in user timezone preferences.
2. **Telegram Bot Integration (\`backend/services/telegramBotService.js\`)**:
   - Connects Telegram account via one-click deep link auth code.
   - Commands:
     * \`/due\` - Displays number of due flashcards with quick links.
     * \`/quickreview\` - Sends interactive inline quiz cards directly within Telegram chat with 1-5 quality rating buttons.
3. **Web Push Notification Service (\`backend/services/webPushService.js\`)**:
   - VAPID key exchange, subscription storage in DB, and payload dispatch with actionable notification buttons ("Review Now", "Snooze 1 Hour").
4. **Morning Email Digest Generator (\`backend/services/emailDigestService.js\`)**:
   - Beautiful HTML responsive template summarizing today's revision agenda, active streak status, and motivational quote.

### Frontend Architecture
1. **Notification Preferences Settings (\`frontend/src/components/settings/NotificationPreferences.jsx\`)**:
   - Granular toggles for Web Push, Telegram alerts, and Email digests.
   - Time-of-day picker for morning digest delivery (e.g., 07:30 AM local time).
   - "Connect Telegram" QR code and deep-link launcher.

---

## Acceptance Criteria
- [ ] Web Push notifications trigger accurately at the scheduled user preference time when cards are due.
- [ ] Telegram bot responds to \`/due\` and allows rating flashcards directly through inline keyboard callbacks.
- [ ] Users can toggle individual notification channels and set custom quiet hours in settings.
- [ ] Worker processes batch notifications with rate-limiting to prevent spamming notification providers.`
  },
  {
    number: 591,
    slug: "postgres-indexing-query-optimization-suite",
    title: "[FEAT]: Comprehensive Database Indexing & Query Optimization Suite for High-Concurrency Flashcard & Quiz Queries",
    labels: ["enhancement", "database", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
As OpenPrep AI scales to thousands of active students, database queries for fetching due flashcards, aggregating daily activity streaks, and calculating topic progress percentiles suffer from full table scans and high latency ($> 850\\text{ms}$).

This feature introduces a comprehensive **PostgreSQL Indexing, Partial Indexing, and Query Optimization Suite** with automated slow-query logging and connection pool tuning.

---

## Technical Scope & Architecture

### Database Schema & Indexing Migrations
1. **Composite & Partial Indexes (\`backend/migrations/20260830_add_performance_indexes.sql\`)**:
   - \`CREATE INDEX idx_flashcards_user_due ON "Flashcards" ("userId", "nextReviewDate") WHERE "isArchived" = false;\`
   - \`CREATE INDEX idx_quiz_attempts_user_exam ON "QuizAttempts" ("userId", "examId", "createdAt" DESC);\`
   - \`CREATE INDEX idx_progress_user_subject ON "Progress" ("userId", "subjectId");\`
   - \`CREATE INDEX idx_activity_logs_user_date ON "ActivityLogs" ("userId", "createdAt" DESC);\`
2. **Materialized View for Leaderboards & Analytics (\`backend/migrations/20260830_leaderboard_materialized_view.sql\`)**:
   - Materialized view aggregating user weekly XP, accuracy rate, and active streak with concurrent refresh triggers (\`REFRESH MATERIALIZED VIEW CONCURRENTLY\`).

### Backend Optimization & Monitoring
1. **Database Query Profiler & Slow Query Logger (\`backend/middleware/queryProfiler.js\`)**:
   - Intercepts Sequelize / Prisma / pg queries and logs any database execution exceeding $100\\text{ms}$ threshold with sanitized parameters and stack traces.
2. **Connection Pool & Keep-Alive Tuning (\`backend/config/db.js\`)**:
   - Configures optimal pool settings: \`max: 25\`, \`min: 5\`, \`idleTimeoutMillis: 30000\`, \`connectionTimeoutMillis: 2000\`.

---

## Acceptance Criteria
- [ ] Due flashcard query latency drops below $25\\text{ms}$ under 500 concurrent simulated requests.
- [ ] Materialized views refresh efficiently without locking reads on leaderboard endpoints.
- [ ] Slow query middleware captures and logs queries exceeding $100\\text{ms}$ with full execution plans in development.
- [ ] Automated Jest database benchmark tests confirm index usage using \`EXPLAIN ANALYZE\`.`
  },
  {
    number: 592,
    slug: "ai-audio-flashcard-podcast-daily-recap",
    title: "[FEAT]: AI-Generated Audio Flashcard Podcast & Daily Revision Newsfeed with Text-to-Speech Voice Selection",
    labels: ["enhancement", "ai", "flashcards", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students commuting, exercising, or doing household chores cannot look at visual screens but still want to revise their daily study material. Audio-based active recall provides an effortless way to maintain daily consistency.

This feature introduces an **AI-Generated Audio Revision Podcast Engine** that synthesizes today's weak flashcards and key subject formulas into a 5-minute interactive audio dialogue with multi-voice text-to-speech.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Audio Script Generation Service (\`backend/services/podcastScriptService.js\`)**:
   - Gathers student's weak flashcards and due topics for the day.
   - Utilizes Gemini 1.5 to construct a dynamic, conversational script between two AI personas: "Tutor Alex" (explains concepts, poses questions) and "Student Sam" (answers, asks for clarifications).
2. **Text-to-Speech Audio Synthesizer (\`backend/services/audioSynthesisService.js\`)**:
   - Integrates with Web Speech API / Edge TTS / Google Cloud TTS to render multi-speaker audio tracks with distinct voices, pitch adjustments, and natural pauses.
   - Stitches audio chunks into a unified MP3 stream and caches audio files with TTL.
3. **REST Endpoints (\`backend/controllers/audioPodcastController.js\`)**:
   - \`POST /api/audio-recap/generate\` - Creates a tailored 3-to-7 minute audio recap script.
   - \`GET /api/audio-recap/:id/stream\` - Streams the synthesized audio file.

### Frontend Architecture
1. **Audio Podcast Player Drawer (\`frontend/src/components/audio/AudioPodcastPlayer.jsx\`)**:
   - Floating audio player bar with playback speed controls ($0.75\\times$ to $2.0\\times$), 10s skip forward/backward, and dynamic waveform visualizer.
   - Synchronized live karaoke-style transcript highlighting the spoken sentence in real time.
   - "Voice Selector" dropdown to customize narrator accent and pitch.

---

## Acceptance Criteria
- [ ] Generates coherent dual-speaker conversational audio recap from user's active flashcards within 8 seconds.
- [ ] Audio player streams smoothly with interactive scrubbing and synchronized transcript highlighting.
- [ ] Supports playback speed adjustment and background audio playback on mobile browsers.
- [ ] Unit tests verify script generation formatting and TTS service audio buffer concatenation.`
  },
  {
    number: 593,
    slug: "mock-exam-simulator-fullscreen-offline-recovery",
    title: "[FEAT]: Interactive Mock Exam Simulator with Full-Screen Lock, Sectional Timers & Auto-Save Recovery",
    labels: ["enhancement", "quiz-system", "frontend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Actual competitive examinations (e.g. JEE Main, NEET, SAT, GRE, GATE, USMLE) operate under strict environmental conditions: unchangeable sectional timers, question status palettes (Answered, Marked for Review, Unvisited), and strict anti-distraction policies.

This feature creates a **Proctored Mock Exam Simulator** that mirrors actual testing conditions, complete with full-screen enforcement, sectional time locks, and robust IndexedDB auto-save crash recovery.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Full-Screen Exam Arena (\`frontend/src/components/exam/MockExamArena.jsx\`)**:
   - Fullscreen API lock with warning modals upon window blur, tab switching, or exit attempts (configurable count limit).
   - Split view: Question Display (with zoomable diagrams and formula rendered in KaTeX) and Question Palette navigation grid.
   - Color-coded question states: Green (Answered), Purple (Marked for Review), Violet+Dot (Answered & Marked for Review), Grey (Unvisited), Red (Not Answered).
2. **Sectional Timer Controller (\`frontend/src/components/exam/SectionalTimer.jsx\`)**:
   - Independent countdown timers per section (e.g., Physics: 60m, Chemistry: 60m, Mathematics: 60m) with auto-submission upon timer expiry.
3. **Offline State Persistence Engine (\`frontend/src/utils/examIndexedDBSync.js\`)**:
   - Persists all question responses, bookmarks, and elapsed time locally into IndexedDB every 5 seconds.
   - If the browser crashes, computer restarts, or Wi-Fi drops, the exam state recovers instantly with zero data loss upon reopening.

### Backend Architecture
1. **Exam Session State Synchronizer (\`backend/controllers/mockExamController.js\`)**:
   - \`POST /api/mock-exams/:id/start\` - Secures exam start timestamp on server to prevent client-side clock tampering.
   - \`POST /api/mock-exams/:sessionId/heartbeat\` - Periodic sync payload updating server-side answer state.
   - \`POST /api/mock-exams/:sessionId/submit\` - Grades full mock attempt and produces sectional percentile scorecard.

---

## Acceptance Criteria
- [ ] Fullscreen mode locks into place and tracks tab-switch violations accurately.
- [ ] Sectional timers transition automatically to the next section when time expires.
- [ ] IndexedDB seamlessly restores all selected answers and remaining time after intentional page refresh.
- [ ] Playwright E2E test verifying full mock exam workflow, tab-switch warnings, and final scorecard generation.`
  },
  {
    number: 594,
    slug: "peer-1v1-speed-quiz-battles-elo",
    title: "[FEAT]: Peer-to-Peer 1v1 Live Speed Quiz Battles with Elo Rating & Matchmaking Queue",
    labels: ["enhancement", "quiz-system", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Solo exam revision can quickly become monotonous. Adding a synchronous competitive dynamic boosts motivation, improves speed under time pressure, and drives community engagement through gamified peer challenges.

This feature introduces **1v1 Live Speed Quiz Battles** with real-time WebSocket round synchronization, live health bars, and an Elo/Glicko-2 rating matchmaking queue.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Matchmaking Queue Engine (\`backend/services/battleMatchmakerService.js\`)**:
   - In-memory / Redis matchmaking queue pairing students by selected Subject, Exam Tier, and Elo rating difference ($\\Delta \\text{Elo} \\le 150$, expanding over time).
2. **WebSocket Battle Room Handler (\`backend/services/quizBattleSocketService.js\`)**:
   - Synchronizes 5-round question cycles with strict 15-second per-question countdown clocks.
   - Calculates speed-weighted scoring: faster correct answers yield higher points ($1000 - \\text{ms elapsed} \\times 0.05$).
   - Calculates post-match Elo adjustments for Winner and Loser using standard Elo formula ($K=32$).
3. **REST Endpoints (\`backend/controllers/battleController.js\`)**:
   - \`GET /api/battles/leaderboard\` - Fetches global and squad Elo rankings.
   - \`GET /api/battles/history\` - Retrieves user's head-to-head match history and win rate.

### Frontend Architecture
1. **Matchmaking Lobby (\`frontend/src/components/battle/BattleLobby.jsx\`)**:
   - "Find Match" animated radar spinner with estimated queue wait time and Subject selector.
   - "Challenge a Friend" room code generator with direct invite URL copying.
2. **1v1 Battle Arena Screen (\`frontend/src/components/battle/BattleArena.jsx\`)**:
   - Split duel view: Student vs. Opponent with live avatars, reactive combo streak animations, and real-time HP/score gauges.
   - Instant visual feedback on opponent answer submission without revealing choice until round concludes.
   - Post-match victory/defeat screen showing Elo change (e.g., $+24\\text{ Elo}$) and detailed question review.

---

## Acceptance Criteria
- [ ] Matchmaking pairs available players within $\\pm 200$ Elo points within 10 seconds.
- [ ] WebSocket syncs question start, ticking timer, and score changes with zero drift.
- [ ] Elo ratings calculate deterministically and update immediately in the database upon battle conclusion.
- [ ] Jest tests verify matchmaker timeout expansions and Elo rating calculation math.`
  },
  {
    number: 595,
    slug: "smart-pdf-splitter-chapter-toc-extractor",
    title: "[FEAT]: Smart PDF Splitter & Automated Chapter/Section Bookmark Extractor for Heavy Textbooks",
    labels: ["enhancement", "pyq-analysis", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students regularly upload 500+ page textbook PDFs or multi-year PYQ compendiums (100MB+). Processing entire massive files in a single AI context window exceeds token limits and causes timeouts.

This feature implements a **Smart PDF Splitter & Bookmark Extractor** that parses Table of Contents (TOC) structures, splits textbooks into bite-sized chapter modules, and indexes them against the subject syllabus.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Structure & Outline Parser (\`backend/services/pdfStructureService.js\`)**:
   - Uses \`pdf-lib\` and \`pdfjs-dist\` to extract document outline / bookmarks tree with target page numbers.
   - Fallback OCR/heuristic regex pattern matcher scanning introductory pages for Table of Contents patterns (e.g. \`Chapter 4: Thermodynamics ... Page 142\`).
2. **Chunking & Page Range Splitter (\`backend/services/pdfSplitterService.js\`)**:
   - Slices large PDF files into distinct chapter sub-documents with preserved vector text and embedded figures.
   - Computes page-level word count, density of formulas, and image presence.
3. **REST Endpoints (\`backend/controllers/pdfParserController.js\`)**:
   - \`POST /api/pdf/inspect-toc\` - Uploads PDF and returns extracted chapters and hierarchy tree for user review.
   - \`POST /api/pdf/split-chapters\` - Triggers background job to split selected chapters and generate topic-linked study modules.

### Frontend Architecture
1. **TOC Visual Chapter Selector (\`frontend/src/components/pdf/ChapterSplitSelector.jsx\`)**:
   - Tree-view displaying detected chapters with page range sliders, chapter titles, and size estimates.
   - Checkbox selector enabling users to import only required chapters (e.g. "Only Chapter 3 & 7") into their active Study Plan.

---

## Acceptance Criteria
- [ ] Accurately extracts embedded PDF bookmarks and page ranges from standard textbook files.
- [ ] Successfully splits 300+ page PDF into chapter files within 5 seconds without memory spikes.
- [ ] Users can visually select and import specific chapters directly into their syllabus progress tracker.
- [ ] Unit tests cover various TOC hierarchy formats and edge-case malformed outlines.`
  },
  {
    number: 596,
    slug: "chemical-equation-balancer-2d-molecule-viewer",
    title: "[FEAT]: Multi-Modal Formula & Chemical Equation Auto-Balancer with KaTeX & SMILES 2D Molecule Viewer",
    labels: ["enhancement", "frontend", "backend", "ui/ux", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Chemistry students studying for AP Chemistry, NEET, JEE, and General Chemistry frequently struggle with balancing redox reactions, stoichiometry calculations, and visualizing organic IUPAC structures from SMILES strings.

This feature builds a **Chemical Equation Auto-Balancer and 2D/3D Molecule Visualizer** supporting KaTeX chemical formula notation and interactive SMILES structure rendering.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Chemical Equation Input & Balancer Tool (\`frontend/src/components/chemistry/EquationBalancer.jsx\`)**:
   - Chemical formula input supporting states of matter, charges, and polyatomic ions (e.g., \`KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2\`).
   - Displays balanced coefficients with oxidation states and reaction type classification (Redox, Precipitation, Acid-Base).
2. **2D/3D Organic Molecule Viewer (\`frontend/src/components/chemistry/MoleculeViewer.jsx\`)**:
   - SmilesDrawer / RDKit.js integration rendering 2D skeletal structures from chemical names or SMILES strings (e.g., \`CC(=O)Oc1ccccc1C(=O)O\` for Aspirin).
   - Interactive 3D Ball-and-Stick rotation mode using 3Dmol.js.

### Backend Architecture
1. **Chemical Matrix Balancing Engine (\`backend/services/chemistryEngineService.js\`)**:
   - Matrix null-space linear algebra algorithm balancing stoichiometric equations with integer coefficient minimization.
   - Stoichiometry solver computing limiting reagents, molar masses, and theoretical yields.
2. **REST Endpoints (\`backend/controllers/chemistryController.js\`)**:
   - \`POST /api/chemistry/balance\` - Accepts raw chemical reaction and returns balanced equation + reaction classification.
   - \`POST /api/chemistry/stoichiometry\` - Calculates molar quantities and theoretical yields for given reactant masses.

---

## Acceptance Criteria
- [ ] Balances complex redox and polyatomic reactions accurately with smallest integer coefficients.
- [ ] Renders 2D organic chemical skeletal structures correctly from standard SMILES strings.
- [ ] Stoichiometry solver computes limiting reagents and molar masses accurately with unit conversions.
- [ ] Jest test suite verifying 30+ canonical chemistry exam equations and matrix balancing edge cases.`
  },
  {
    number: 597,
    slug: "zero-trust-rbac-device-fingerprint-security",
    title: "[FEAT]: Zero-Trust RBAC & Session Security Hardening with Device Fingerprinting & Geolocation Anomaly Detection",
    labels: ["enhancement", "authentication", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Student accounts frequently get shared across multiple unauthorized users or subjected to credential stuffing attacks. To safeguard user data and maintain academic integrity, the platform requires robust session management and anomaly detection.

This feature implements **Zero-Trust Role-Based Access Control (RBAC), Device Fingerprint Hashing, Refresh Token Rotation, and Geo-IP Velocity Anomaly Alerts**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Refresh Token Rotation & Revocation (\`backend/services/tokenService.js\`)**:
   - Issues short-lived access tokens (15m) and single-use refresh tokens (7d) stored in \`httpOnly\`, \`secure\`, \`SameSite=Strict\` cookies.
   - If a compromised refresh token is reused, the entire token family is immediately invalidated.
2. **Device Fingerprint & Geo Anomaly Middleware (\`backend/middleware/deviceAnomalyMiddleware.js\`)**:
   - Hashes client characteristics (User-Agent, Canvas hash, IP subnet).
   - Checks Impossible Travel / Velocity anomalies (e.g., login from Mumbai followed by login from New York 10 minutes later) and triggers mandatory OTP re-verification.
3. **Granular RBAC Guard (\`backend/middleware/rbacMiddleware.js\`)**:
   - Hierarchical permission matrix for roles: \`STUDENT\`, \`STUDY_LEADER\`, \`MENTOR\`, \`INSTITUTION_ADMIN\`, \`SUPERADMIN\`.
4. **REST Endpoints (\`backend/controllers/securityController.js\`)**:
   - \`GET /api/security/active-sessions\` - Lists all active device sessions with browser, IP, location, and "Revoke" button.
   - \`POST /api/security/revoke-all\` - Revokes all active sessions except current.

### Frontend Architecture
1. **Security & Active Sessions Dashboard (\`frontend/src/components/settings/ActiveSessionsView.jsx\`)**:
   - Visual device list with OS icons, approximate location flags, login timestamps, and "Log Out Other Devices" button.
   - Suspicious login alert banner prompting immediate password change when an anomalous login is detected.

---

## Acceptance Criteria
- [ ] Refresh token reuse detection revokes all active tokens for that user immediately.
- [ ] Impossible travel velocity triggers step-up authentication via email OTP.
- [ ] RBAC middleware enforces strict route protection based on role permissions.
- [ ] Security test specs verify token rotation, cookie attributes, and session revocation.`
  },
  {
    number: 598,
    slug: "github-actions-docker-trivy-ci-cd-pipeline",
    title: "[FEAT]: Automated GitHub Actions CI/CD Pipeline for Docker Container Builds, Vulnerability Scanning & Deployments",
    labels: ["enhancement", "devops", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As multiple contributors submit PRs for OpenPrep AI, manual validation of Docker images, security vulnerabilities, and deployment health checks slows down release cycles and risks introducing critical CVEs.

This feature establishes an **Automated CI/CD Pipeline using GitHub Actions, Multi-Stage Docker Builds, Trivy Vulnerability Scanning, and Automated Deployment Webhooks**.

---

## Technical Scope & Architecture

### CI/CD Workflow Architecture
1. **GitHub Actions Workflow (\`.github/workflows/ci-cd-pipeline.yml\`)**:
   - **Job 1: Lint & Code Quality**: Runs ESLint, Prettier check, and SonarQube static analysis.
   - **Job 2: Test Matrix**: Runs unit and integration test suites on Node 18, 20, and 22 with Postgres & Redis service containers.
   - **Job 3: Multi-Stage Docker Build**: Builds optimized, non-root Alpine container images with caching (\`docker/build-push-action\`).
   - **Job 4: Trivy Security Scan**: Scans images for CRITICAL / HIGH severity CVE vulnerabilities; blocks merge if unpatched vulnerabilities exist.
   - **Job 5: Auto-Deploy Trigger**: Triggers deploy hooks to staging/production on Render / Vercel upon merge to \`main\`.

2. **Optimized Dockerfiles**:
   - \`backend/Dockerfile\`: Multi-stage build with \`node:20-alpine\`, running as unprivileged \`node\` user.
   - \`frontend/Dockerfile\`: Vite build output served via lightweight Nginx Alpine container with gzip compression.

---

## Acceptance Criteria
- [ ] GitHub Actions workflow passes cleanly on all PRs and runs in under 4 minutes.
- [ ] Trivy vulnerability scanner accurately flags high-severity base image vulnerabilities.
- [ ] Docker images build with multi-stage layers resulting in minimal bundle sizes ($< 150\\text{MB}$).
- [ ] Documentation in \`docs/deployment-guide.md\` explaining the automated CI/CD pipeline.`
  },
  {
    number: 599,
    slug: "ai-subjective-essay-rubric-evaluator",
    title: "[FEAT]: AI Essay & Long-Form Answer Evaluation Engine with Rubric-Based Scoring & Grammatical Feedback",
    labels: ["enhancement", "ai", "pyq-analysis", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Many competitive examinations (UPSC, AP English, IELTS, GRE Analytical Writing, University Semester Exams) require long-form essay and descriptive subjective answers. Unlike MCQs, students receive no automated feedback on argumentation, thesis clarity, or rubric adherence.

This feature introduces an **AI Essay & Subjective Answer Evaluation Engine** providing rubric-based multi-criteria scoring, thesis analysis, and constructive paragraph-by-paragraph feedback.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Rubric Evaluation Service (\`backend/services/essayEvaluatorService.js\`)**:
   - Structured prompt schema utilizing Gemini 1.5 Pro to evaluate submitted essays against customizable rubrics:
     * **Thesis & Argumentation (25%)**: Logic flow, claim strength, and counter-argument handling.
     * **Evidence & Support (25%)**: Relevance of examples, factual grounding, and citations.
     * **Structure & Coherence (25%)**: Paragraph transitions, introduction/conclusion effectiveness.
     * **Language & Mechanics (25%)**: Vocabulary variety, grammar, punctuation, and tone.
   - Generates JSON response with overall score, criterion sub-scores, inline annotations, and actionable rewrite recommendations.
2. **REST Endpoints (\`backend/controllers/essayController.js\`)**:
   - \`POST /api/essays/evaluate\` - Submits essay text + prompt/rubric for comprehensive AI evaluation.
   - \`GET /api/essays/history\` - Returns historical essay submissions and score progression charts.

### Frontend Architecture
1. **Essay Writing Sandbox (\`frontend/src/components/essay/EssayWritingArena.jsx\`)**:
   - Distraction-free text editor with live word count, character count, and optional timed exam countdown.
2. **Rubric Scorecard & Annotation Drawer (\`frontend/src/components/essay/EssayScorecard.jsx\`)**:
   - Radar chart displaying performance across the 4 core rubric criteria.
   - Interactive essay review with highlighted sentences showing positive praise (green) and improvement suggestions (yellow/blue).

---

## Acceptance Criteria
- [ ] Evaluates subjective essays (300-1500 words) and returns structured rubric evaluations within 6 seconds.
- [ ] Highlights specific sentences with contextual improvement suggestions and grammar corrections.
- [ ] Radar chart visually represents strengths and weaknesses across rubric dimensions.
- [ ] Unit tests verify JSON schema validation and handling of edge-case short or off-topic submissions.`
  },
  {
    number: 600,
    slug: "offline-markdown-notes-wiki-links-graph-view",
    title: "[FEAT]: Offline-First Note-Taking System with Markdown, KaTeX, Bidirectional Wiki-Links & Graph View",
    labels: ["enhancement", "frontend", "ui/ux", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Students retain information better when they can create interconnected knowledge webs linking concepts across different subjects (e.g. linking \`[[Thermodynamics]]\` in Physics to \`[[Enthalpy]]\` in Chemistry). Linear notes fail to capture these relationships.

This feature implements an **Obsidian-Style Offline-First Markdown Note-Taking Workspace** with bidirectional wiki-links (\`[[Topic Name]]\`), KaTeX math rendering, and an interactive 2D/3D Force-Directed Knowledge Graph.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Markdown Editor with Live Math (\`frontend/src/components/notes/MarkdownNotesEditor.jsx\`)**:
   - Milkdown / TipTap markdown editor with inline LaTeX preview (\`$...$\` and \`$$...$$\`), code block syntax highlighting, and checklist task items.
   - Autocomplete trigger for bidirectional wiki-links: typing \`[[\` searches existing notes and subjects in real time.
2. **Interactive 2D/3D Knowledge Graph Visualizer (\`frontend/src/components/notes/KnowledgeGraphView.jsx\`)**:
   - Force-directed graph (using \`force-graph\` / \`3d-force-graph\`) displaying interconnected study notes as nodes and wiki-links as edges.
   - Node size scaled by backlink count; color-coded by Subject/Exam category with search and cluster filtering.
3. **Local-First IndexedDB Sync (\`frontend/src/utils/notesOfflineStorage.js\`)**:
   - Automatic local saving with background sync when internet connection is restored.

### Backend Architecture
1. **Bidirectional Link Indexer & Graph Resolver (\`backend/services/noteGraphService.js\`)**:
   - Parses markdown AST to extract wiki-link references and maintains a bidirectional link adjacency table in PostgreSQL.
2. **REST Endpoints (\`backend/controllers/notesController.js\`)**:
   - \`GET /api/notes/graph\` - Returns serialized nodes and edges for the user's entire knowledge base.
   - \`POST /api/notes/sync\` - Batch synchronizes local offline notes with server database.

---

## Acceptance Criteria
- [ ] Typing \`[[Topic]]\` dynamically links related notes and populates bidirectional backlink lists.
- [ ] Interactive Knowledge Graph visualizes note connections with smooth physics simulation and node clicking.
- [ ] Notes save instantly to IndexedDB and function seamlessly with zero network connectivity.
- [ ] Automated tests verify markdown AST wiki-link extraction and graph adjacency serialization.`
  },
  {
    number: 601,
    slug: "ambient-binaural-beats-soundscape-synthesizer",
    title: "[FEAT]: Adaptive Ambient Soundscape & Binaural Beats Generator for Deep Focus Study Sessions",
    labels: ["enhancement", "frontend", "ui/ux", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Auditory distractions in libraries, dorms, or cafes impair student focus. Neuroscientific research shows that auditory masking using colored noise (Brown/Pink noise) and binaural beats (40Hz Gamma for problem-solving, 10Hz Alpha for relaxed memory consolidation) significantly enhances concentration.

This feature creates a **Client-Side Ambient Soundscape & Binaural Beats Synthesizer** powered by the Web Audio API without needing external streaming bandwidth.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Web Audio Sound Generator Engine (\`frontend/src/utils/soundscapeEngine.js\`)**:
   - Web Audio API pure synthesizer generating real-time algorithmic audio streams:
     * **Binaural Beats Generator**: Dual oscillator feeding slightly offset frequencies to Left and Right stereo channels (e.g. Left: 200Hz, Right: 240Hz $\\rightarrow$ 40Hz Gamma beat).
     * **Colored Noise Synthesizers**: Pink, White, and Brown noise buffer generators with biquad lowpass filtering.
     * **Natural Ambience Loops**: Rain on window, crackling fireplace, coffee shop murmur, and gentle forest wind.
2. **Focus Soundscape Drawer (\`frontend/src/components/focus/SoundscapeMixer.jsx\`)**:
   - Multi-channel volume slider mixer allowing students to blend rain + brown noise + 40Hz Gamma beats simultaneously.
   - Presets: "Deep Calculus Sprint", "Late Night Memory Retention", "Calm Reading".
   - Seamless integration with the Pomodoro Study Timer.

---

## Acceptance Criteria
- [ ] Synthesizes pure binaural beats and colored noise on the client without buffering or external audio network requests.
- [ ] Multi-channel mixer allows custom volume blending and saves user sound presets to localStorage.
- [ ] Audio fades out smoothly upon timer pause or completion without clicking artifacts.
- [ ] Verified cross-browser compatibility across Chrome, Firefox, Safari, and mobile browsers.`
  },
  {
    number: 602,
    slug: "opentelemetry-apm-distributed-tracing-prometheus",
    title: "[FEAT]: Comprehensive OpenTelemetry Distributed Tracing & APM Integration with Prometheus / Jaeger",
    labels: ["enhancement", "devops", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
When complex AI generation or multi-step database transactions fail or experience high latency in production, developers lack granular visibility into which micro-operation (DB query, Redis cache lookup, Gemini API call, or network transit) caused the bottleneck.

This feature integrates **OpenTelemetry Distributed Tracing and Prometheus Metrics Telemetry** across backend API routes, database operations, and external AI calls.

---

## Technical Scope & Architecture

### Backend Architecture
1. **OpenTelemetry SDK Initialization (\`backend/config/telemetry.js\`)**:
   - Configures OpenTelemetry Node SDK with auto-instrumentations for Express, \`pg\` / Sequelize, Redis, and HTTP external client requests.
   - Exports traces to OpenTelemetry Collector / Jaeger via OTLP gRPC/HTTP protocol.
2. **Prometheus Metrics Collector (\`backend/middleware/metricsMiddleware.js\`)**:
   - Exposes standard \`/metrics\` endpoint with custom application metrics:
     * \`openprep_http_request_duration_seconds\` (Histogram labeled by route, status code, method).
     * \`openprep_ai_token_usage_total\` (Counter labeled by model and feature).
     * \`openprep_active_websocket_connections\` (Gauge tracking live study squad & battle connections).
     * \`openprep_db_pool_active_connections\` (Gauge tracking DB pool utilization).

---

## Acceptance Criteria
- [ ] \`/metrics\` endpoint outputs Prometheus-compliant telemetry scraping format.
- [ ] Trace spans accurately correlate incoming HTTP requests with downstream database queries and AI API calls.
- [ ] Negligible performance overhead ($< 1.5\\text{ms}$ per request) when telemetry collection is enabled.
- [ ] Docker Compose updated with optional Prometheus & Jaeger services for local observability development.`
  },
  {
    number: 603,
    slug: "ai-flashcard-difficulty-auto-classifier",
    title: "[FEAT]: AI Flashcard Difficulty Auto-Classifier using Linguistic Complexity & Historical Cohort Failure Rates",
    labels: ["enhancement", "ai", "flashcards", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
When students create or import new flashcards, the default SM-2 algorithm assigns an arbitrary initial Ease Factor ($EF = 2.5$). Highly complex anatomical terms or multi-step organic mechanisms are penalized with the same baseline review frequency as trivial one-word definitions.

This feature introduces an **AI Flashcard Difficulty Auto-Classifier** that evaluates linguistic readability, formula density, and anonymized cohort error rates to assign optimal initial Ease Factors.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Linguistic & Structural Analyzer (\`backend/services/cardDifficultyService.js\`)**:
   - Calculates Flesch-Kincaid Grade Level and Dale-Chall readability scores on card text.
   - Analyzes formula complexity (number of LaTeX symbols, sub-indices, matrices).
   - Queries historical cohort failure rate percentiles for cards sharing the same topic tags.
   - Maps composite difficulty score $[0.0, 1.0]$ to initial SM-2 Ease Factor:
     $$EF_{\\text{initial}} = 1.3 + (1 - \\text{Difficulty}) \\times 1.4$$
2. **REST Endpoints (\`backend/controllers/flashcardClassificationController.js\`)**:
   - \`POST /api/flashcards/auto-classify\` - Accepts flashcard front/back content and returns difficulty grade, key concepts, and suggested initial review intervals.

### Frontend Architecture
1. **Difficulty Indicator Badge (\`frontend/src/components/flashcards/DifficultyBadge.jsx\`)**:
   - Visual pill indicator on card preview (Easy: Green, Moderate: Amber, Challenging: Crimson, Hardcore: Purple) with breakdown tooltip explaining factors.

---

## Acceptance Criteria
- [ ] Correctly scores complex multi-clause formula cards with higher difficulty ratings than simple vocabulary terms.
- [ ] Dynamically adjusts initial Ease Factor between $1.30$ and $2.70$ based on calculated complexity.
- [ ] UI displays subtle difficulty rating badge during card creation and deck inspection.
- [ ] Unit tests verify readability formula calculations and edge-case symbol-heavy strings.`
  },
  {
    number: 604,
    slug: "digital-badge-certificate-generator-qr-verification",
    title: "[FEAT]: Micro-Credential Digital Badge & Certificate Generator with Cryptographic Verification & PDF QR Code",
    labels: ["enhancement", "dashboard", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students preparing for certifications, competitive exams, or completing intensive 30-day study sprints value tangible credentials they can share on LinkedIn, portfolios, or with academic mentors.

This feature implements a **Micro-Credential Certificate Generator with Cryptographic Hash Signing and Public QR Code Verification**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Certificate Minting & Signing Service (\`backend/services/certificateService.js\`)**:
   - Mints a unique certificate upon completing milestone criteria (e.g. 100% Subject Syllabus Completion, 30-Day Streak, Scoring $>90\\%$ on Full Mock Exam).
   - Signs certificate payload with SHA-256 HMAC cryptographic signature and stores metadata record with public UUID.
   - Generates high-resolution PDF certificate using \`pdf-lib\` with embedded dynamic QR code linking to verification URL.
2. **Public Verification API (\`backend/controllers/certificateVerificationController.js\`)**:
   - \`GET /api/certificates/verify/:certId\` - Public endpoint returning verified recipient name, issue date, credential title, and authenticity status.

### Frontend Architecture
1. **Certificate Showcase Modal (\`frontend/src/components/credentials/CertificateModal.jsx\`)**:
   - Elegant framed certificate preview with metallic badge foil gradients.
   - "Download PDF", "Share on LinkedIn", and "Copy Verification Link" buttons.
2. **Public Verification Page (\`frontend/src/pages/PublicVerifyCertificate.jsx\`)**:
   - SEO-friendly public landing page displaying cryptographic authenticity checkmark, issuer verification, and student achievement summary.

---

## Acceptance Criteria
- [ ] Mints tamper-proof digital certificates with verifiable cryptographic SHA-256 signatures.
- [ ] Generates clean, print-ready PDF certificates with embedded QR codes.
- [ ] Public verification URL correctly confirms certificate validity without requiring user login.
- [ ] Automated tests cover signature verification and PDF generation performance.`
  },
  {
    number: 605,
    slug: "virtualized-question-grid-infinite-scroll-pyq",
    title: "[FEAT]: High-Performance Virtualized Question Grid & Infinite Scroll for 10,000+ PYQ Question Bank",
    labels: ["enhancement", "pyq-analysis", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
The previous years' question (PYQ) bank contains tens of thousands of questions with math formulas, diagrams, and options. Standard DOM rendering of hundreds of cards simultaneously results in sluggish UI lag, memory consumption exceeding 500MB, and janky scrolling on mobile devices.

This feature implements **DOM Virtualization and Infinite Windowing** (via TanStack Virtual / react-window) delivering silky 60fps scrolling across 10,000+ question repositories.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Virtualized Question Feed (\`frontend/src/components/pyq/VirtualizedQuestionFeed.jsx\`)**:
   - TanStack Virtual (\`useVirtualizer\`) windowing engine rendering only items visible in the current viewport $+ 5$ buffer items.
   - Dynamic item height measurement handling variable-length question stems, diagrams, and KaTeX equations without layout shift.
2. **Multi-Faceted Instant Filter Bar (\`frontend/src/components/pyq/PYQFilterToolbar.jsx\`)**:
   - Multi-criteria filtering (Year range, Subject, Topic, Question Type: MCQ/Numerical, Difficulty, Status: Solved/Unsolved).
   - Debounced instant search query input with URL search params synchronization.
3. **Skeleton Loading & Prefetching**:
   - Smooth skeleton placeholders and intersection-observer prefetching of subsequent paginated cursor batches.

---

## Acceptance Criteria
- [ ] Renders and scrolls smoothly at 60fps across a simulated dataset of 10,000+ question items.
- [ ] Dynamic element height correctly adjusts when KaTeX equations or diagrams finish rendering without visual jitter.
- [ ] Filter changes execute instantly with zero UI freezing.
- [ ] Mobile touch scrolling verified on standard iOS Safari and Android Chrome viewports.`
  },
  {
    number: 606,
    slug: "personalized-spaced-repetition-burnout-prevention-calendar",
    title: "[FEAT]: AI-Powered Personalized Spaced Repetition Revision Calendar with Burnout Prevention & Buffer Days",
    labels: ["enhancement", "study-planner", "ai", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Traditional study planners construct rigid daily timetables that fail when an emergency occurs. If a student misses one day, the accumulated backlog causes anxiety, cognitive overload, and eventual study plan abandonment.

This feature creates an **AI-Powered Adaptive Revision Calendar with Dynamic Workload Smoothing, Burnout Prevention, and Automated Buffer Days**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Adaptive Study Schedule Engine (\`backend/services/adaptiveScheduleService.js\`)**:
   - Calculates cognitive load score per day based on topic difficulty weights, due flashcards, and available user study hours.
   - Workload Smoothing Algorithm: automatically shifts non-urgent review queues forward or backward to prevent daily study spikes exceeding user capacity.
   - Inserts automatic "Catch-Up & Rest Buffer Days" every 5-7 days for consolidation and mental recovery.
2. **REST Endpoints (\`backend/controllers/adaptiveScheduleController.js\`)**:
   - \`POST /api/study-schedule/generate\` - Creates initial optimized schedule based on target exam date and daily hours.
   - \`POST /api/study-schedule/rebalance\` - Dynamically recalculates schedule when user logs missed days or falls behind.

### Frontend Architecture
1. **Interactive Revision Calendar (\`frontend/src/components/planner/AdaptiveCalendarView.jsx\`)**:
   - Month/Week/Day views with color-coded cognitive load heatmap bars (Light: Green, Balanced: Blue, Heavy: Amber, Overload: Red).
   - "Rebalance My Schedule" one-click action button with preview diff modal showing rescheduled topics.
   - Drag-and-drop topic rescheduling with instant daily hour recalculation.

---

## Acceptance Criteria
- [ ] Algorithm automatically redistributes overdue tasks across future buffer days without exceeding daily capacity.
- [ ] Visual cognitive load heatmap clearly indicates daily study intensity.
- [ ] "Rebalance Schedule" adjusts tasks intelligently within 2 seconds.
- [ ] Unit tests cover various exam timeline lengths and capacity constraint edge cases.`
  },
  {
    number: 607,
    slug: "interactive-3d-physics-anatomy-simulation-lab",
    title: "[FEAT]: Interactive 3D Anatomy & Physics Simulation Lab with Three.js & Cannon.js",
    labels: ["enhancement", "frontend", "ui/ux", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Visualizing abstract concepts in 3D (e.g. projectile trajectories with air drag, magnetic Lorentz force vectors, optics ray refraction, or anatomical organ structures) is difficult from 2D textbook drawings alone.

This feature introduces an **Interactive 3D Simulation & Virtual Lab** using Three.js and Cannon.js physics engines, allowing students to tweak parameters and observe physical phenomena interactively.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D WebGL Simulation Viewport (\`frontend/src/components/simulations/SimulationCanvas.jsx\`)**:
   - Three.js WebGL renderer with OrbitControls (pan, rotate, zoom) and responsive canvas resizing.
   - Integrated physics calculation using Cannon.js for rigid body collisions, gravity variations, and kinematic projectile vectors.
2. **Interactive Parameter Control Panel (\`frontend/src/components/simulations/ParameterControls.jsx\`)**:
   - Real-time sliders for physical variables (Velocity $v_0$, Angle $\\theta$, Mass $m$, Friction $\\mu$, Gravitational acceleration $g$, Magnetic field $B$).
   - Live telemetry graphs (Velocity vs. Time, Kinetic vs. Potential Energy curves) updated in sync with simulation steps.
3. **Simulation Modules**:
   - **Physics**: Projectile Motion with Wind Drag, Optics Snell's Law Prism Refraction, Electric Field Lines.
   - **Biology/Anatomy**: Interactive 3D Human Heart and Neuron structure with clickable anatomical region pins.

---

## Acceptance Criteria
- [ ] 3D simulations run smoothly at 60fps on modern desktop and mobile browsers.
- [ ] Parameter sliders update simulation variables and physics equations in real time without lag.
- [ ] Real-time telemetry graphs plot accurate mathematical curves synchronized with visual motion.
- [ ] Fallback graceful degradation for devices without WebGL hardware acceleration.`
  },
  {
    number: 608,
    slug: "redis-ai-rate-limiter-token-budget-gateway",
    title: "[FEAT]: Automated Rate Limiter & Token Budgeting Gateway for Google Gemini AI API with Fallback Queue",
    labels: ["enhancement", "ai", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Uncontrolled concurrent requests to the Google Gemini AI API can quickly exhaust API rate limits (HTTP 429 Too Many Requests), deplete monthly token budgets, and cause sudden service outages during peak study hours.

This feature implements a **Redis Token Bucket Rate Limiter, Intelligent AI Prompt Caching Gateway, and Priority Request Queue**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Redis Sliding Window & Token Bucket Gateway (\`backend/services/aiGatewayService.js\`)**:
   - Tracks per-user and global token consumption per minute (TPM) and requests per minute (RPM).
   - Tiered user budgeting: Free tier ($50\\text{k tokens/day}$), Pro tier ($500\\text{k tokens/day}$).
   - SHA-256 prompt input fingerprinting: identical questions return cached AI responses directly from Redis with zero API cost and $< 10\\text{ms}$ latency.
2. **Resilient Retry & Priority Queue (\`backend/services/aiRequestQueue.js\`)**:
   - BullMQ priority queue: interactive real-time user requests (Chat/Quiz) prioritized over background batch tasks (Summary extraction).
   - Exponential backoff with jitter on HTTP 429 / 503 upstream errors.
3. **Admin Telemetry Endpoint (\`backend/controllers/aiGatewayController.js\`)**:
   - \`GET /api/admin/ai-gateway/metrics\` - Returns real-time token burn rates, cache hit ratios, and queue latency.

---

## Acceptance Criteria
- [ ] Blocks or queues requests exceeding rate limits without throwing unhandled server errors.
- [ ] Prompt cache serves identical queries from Redis with sub-15ms response times.
- [ ] Queue handles upstream 429 spikes gracefully using exponential backoff retries.
- [ ] Unit and load tests confirm token budgeting enforcement under concurrent stress.`
  },
  {
    number: 609,
    slug: "study-squad-habit-tracker-leaderboard",
    title: "[FEAT]: Real-Time Study Squad Habit Tracker & Shared Accountability Leaderboards",
    labels: ["enhancement", "dashboard", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Peer accountability dramatically improves study discipline. When students see their squad teammates completing daily goals, maintaining streaks, and solving PYQs, motivation multiplies.

This feature creates a **Real-Time Study Squad Habit Tracker & Shared Accountability Dashboard** with weekly leaderboards, habit checklists, and celebration notifications.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Squad Habit Grid (\`frontend/src/components/squads/SquadHabitGrid.jsx\`)**:
   - Visual 7-day habit matrix showing live completion checkmarks for all squad members across shared goals (e.g., "50 Flashcards", "1 Mock Quiz", "2 Hours Deep Work").
   - Live presence indicator ("Studying Now" green pulse badge).
2. **Squad Weekly Leaderboard (\`frontend/src/components/squads/SquadLeaderboard.jsx\`)**:
   - Ranked list showing Squad XP, weekly consistency percentage, and streak flame badges.
   - "Nudge Teammate" friendly push notification action when a teammate hasn't checked in by evening.
3. **Celebration Confetti & Squad Level Progress Bar**:
   - Collaborative XP bar that unlocks squad badges when collective study milestones are reached.

### Backend Architecture
1. **Squad Aggregation & Nudge Service (\`backend/services/squadHabitService.js\`)**:
   - Aggregates daily check-ins and calculates collective squad level progress.
   - Rate-limited peer nudge notification dispatcher.
2. **REST Endpoints (\`backend/controllers/squadHabitController.js\`)**:
   - \`GET /api/squads/:squadId/habits\` - Retrieves current week habit matrix for all squad members.
   - \`POST /api/squads/:squadId/nudge\` - Sends a friendly reminder notification to an inactive teammate.

---

## Acceptance Criteria
- [ ] Squad habit matrix updates in real time when members complete daily tasks.
- [ ] Weekly leaderboard accurately computes XP and consistency rankings.
- [ ] Peer nudge system enforces a 1-nudge-per-teammate-per-day rate limit.
- [ ] Unit tests verify squad score aggregation and permission validation.`
  },
  {
    number: 610,
    slug: "internationalization-i18n-rtl-localization-framework",
    title: "[FEAT]: End-to-End Internationalization (i18n) Framework with RTL Support & Dynamic Locale Switching",
    labels: ["enhancement", "frontend", "ui/ux", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
OpenPrep AI aims to support students globally, including non-native English speakers across India, Latin America, Europe, and the Middle East. Hardcoded English strings prevent global adoption and create barriers for students studying in their regional languages.

This feature establishes an **End-to-End Internationalization (i18n) Framework** with support for English, Hindi (हिन्दी), Spanish (Español), French (Français), and Arabic (العربية - Right-to-Left RTL layout).

---

## Technical Scope & Architecture

### Frontend Architecture
1. **i18n Engine & Locale Management (\`frontend/src/i18n/index.js\`)**:
   - \`react-i18next\` / \`i18next\` setup with namespace splitting (\`common\`, \`auth\`, \`quiz\`, \`flashcards\`, \`dashboard\`).
   - Browser language autodetection with localStorage fallback and user profile preference sync.
2. **Dynamic RTL Layout Mirroring (\`frontend/src/styles/rtl.css\`)**:
   - Automatic HTML \`dir="rtl"\` and \`lang\` attribute toggling when switching to Arabic.
   - CSS Logical Properties (\`margin-inline-start\`, \`padding-inline-end\`, flexbox/grid mirroring) ensuring flawless UI rendering across LTR and RTL modes.
3. **Language Switcher Navbar Component (\`frontend/src/components/common/LanguageSwitcher.jsx\`)**:
   - Sleek dropdown menu with native language labels and country flag icons.

### Translation Management & Linting
1. **Missing Key Linter (\`scripts/lint-i18n-keys.js\`)**:
   - Automated CI script scanning JSX files for untranslated raw text strings and verifying that all translation JSON files contain matching keys.

---

## Acceptance Criteria
- [ ] Instant language switching across English, Hindi, Spanish, French, and Arabic without page reload.
- [ ] Arabic locale switches the entire layout to clean Right-to-Left (RTL) alignment.
- [ ] Numbers, dates, and currency format dynamically according to the active locale.
- [ ] CI linting script validates that no hardcoded English strings or missing translation keys exist.`
  }
];

// Helper: Ensure labels exist on GitHub repository
function ensureLabel(name) {
  try {
    // Check if label exists
    const checkCmd = `gh label list --search "${name}" --json name`;
    const result = execSync(checkCmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    const parsed = JSON.parse(result || '[]');
    const match = parsed.find(l => l.name.toLowerCase() === name.toLowerCase());
    if (match) return match.name;

    // Default colors for common labels
    const labelColors = {
      'enhancement': 'a2eeef',
      'ai': 'ff00cc',
      'quiz-system': 'A371F7',
      'flashcards': '14B8A6',
      'backend': '1d76db',
      'frontend': '5319e7',
      'database': '0366d6',
      'ui/ux': 'a2eeef',
      'authentication': 'e11d48',
      'pyq-analysis': 'bfd4f2',
      'study-planner': '1338be',
      'dashboard': '7f00ff',
      'devops': '0052cc',
      'high-priority': 'B60205',
      'medium-priority': 'FBCA04',
      'low-priority': '0E8A16',
      'ECSoC26': 'F9D0C4',
      'ECSoC26-L1': 'EDEDED',
      'ECSoC26-L2': 'D640C6',
      'ECSoC26-L3': 'b60205'
    };

    const color = labelColors[name] || 'ededed';
    console.log(`Creating missing label "${name}" with color #${color}...`);
    execSync(`gh label create "${name}" --color "${color}" --force`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
    return name;
  } catch (err) {
    // If it already exists or failed, fallback to label name
    return name;
  }
}

// Fetch existing open and closed issues to prevent duplicates
console.log('Checking existing issues on GitHub...');
let existingTitles = [];
try {
  const existingRaw = execSync('gh issue list --state all --limit 500 --json title', {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  existingTitles = JSON.parse(existingRaw || '[]').map(i => i.title.toLowerCase().trim());
} catch (e) {
  console.warn('Could not fetch existing issue titles. Proceeding cautiously...');
}

let createdCount = 0;
let skippedCount = 0;

console.log(`\n================================================================================`);
console.log(`Starting Batch Creation of ${newIssues.length} GitHub Issues for OpenPrep AI`);
console.log(`================================================================================\n`);

for (let i = 0; i < newIssues.length; i++) {
  const item = newIssues[i];
  const filename = `issue-${item.number}-${item.slug}.md`;
  const filePath = path.join(issuesDir, filename);

  // 1. Write standalone markdown specification file with frontmatter
  const markdownContent = `---
title: '${item.title.replace(/'/g, "''")}'
labels: '${item.labels.join(', ')}'
assignees: ''
---

${item.body}
`;

  fs.writeFileSync(filePath, markdownContent, 'utf8');
  console.log(`[FILE] Saved specification: issues/${filename}`);

  // 2. Check if already exists on GitHub
  const normalizedTitle = item.title.toLowerCase().trim();
  if (existingTitles.includes(normalizedTitle)) {
    console.log(`[SKIP] Issue already exists on GitHub: "${item.title}"\n`);
    skippedCount++;
    continue;
  }

  // 3. Normalize & ensure labels exist
  const finalLabels = [];
  for (const lbl of item.labels) {
    const valid = ensureLabel(lbl);
    if (valid && !finalLabels.includes(valid)) {
      finalLabels.push(valid);
    }
  }

  // 4. Create Issue on GitHub using temporary body file
  const tempBodyPath = path.join(__dirname, `temp_body_${item.number}.md`);
  fs.writeFileSync(tempBodyPath, item.body, 'utf8');

  const labelArgs = finalLabels.map(l => `--label "${l}"`).join(' ');
  const escapedTitle = item.title.replace(/"/g, '\\"');
  const cmd = `gh issue create --title "${escapedTitle}" --body-file "${tempBodyPath}" ${labelArgs}`;

  console.log(`[${i + 1}/${newIssues.length}] Creating GitHub Issue: "${item.title}"`);
  console.log(`Labels: ${finalLabels.join(', ')}`);

  try {
    const output = execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
    console.log(`[SUCCESS] -> ${output.trim()}\n`);
    createdCount++;
    existingTitles.push(normalizedTitle);
  } catch (err) {
    console.error(`[ERROR] Failed to create issue ${item.number}:`, err.stdout || err.stderr || err.message);
  } finally {
    if (fs.existsSync(tempBodyPath)) {
      fs.unlinkSync(tempBodyPath);
    }
  }

  // Small delay to prevent hitting secondary rate limits
  execSync('node -e "setTimeout(() => {}, 2000)"');
}

console.log(`================================================================================`);
console.log(`Batch Issue Creation Complete!`);
console.log(`- Total Processed: ${newIssues.length}`);
console.log(`- Newly Created on GitHub: ${createdCount}`);
console.log(`- Already Existing (Skipped): ${skippedCount}`);
console.log(`================================================================================`);

