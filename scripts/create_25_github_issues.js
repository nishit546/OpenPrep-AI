const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const issues = [
  {
    title: "[FEAT]: Real-Time Collaborative Whiteboard & Mind-Mapping Canvas for Study Squads",
    labels: ["enhancement", "frontend", "ui/ux", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Study squads on OpenPrep AI need an interactive space where members can visually brainstorm, sketch concept maps, and solve complex multi-step problems together in real time. Currently, students are limited to text-based chat and static notes.

This feature introduces a **Real-Time Collaborative Whiteboard & Mind-Mapping Canvas** embedded directly within Study Squad rooms.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Canvas Engine (\`frontend/src/components/whiteboard/WhiteboardCanvas.jsx\`)**:
   - HTML5 Canvas / SVG rendering with pan, zoom, grid snapping, and freehand pen smoothing (Catmull-Rom spline or Perfect Freehand).
   - Tool pallet: Freehand pen, highlighter, sticky notes, geometric shapes (rectangles, circles, arrows), and LaTeX math formula blocks.
   - Real-time multi-user cursor indicators showing squad member names and designated avatar colors.
2. **Mind-Mapping Node Tree (\`frontend/src/components/whiteboard/MindMapEngine.jsx\`)**:
   - Auto-layout hierarchical mind-mapping tree with collapsible subtopics.
   - Quick convert: Ability to convert selected mindmap branches directly into flashcard decks or study plan milestones.
3. **Export Tools**:
   - High-resolution export to PNG, SVG, and vector PDF.

### Backend Architecture
1. **WebSocket Collaboration Layer (\`backend/services/whiteboardSocketService.js\`)**:
   - Broadcasts drawing stroke events, shape mutations, and cursor movement coordinates with debouncing/throttling.
   - Room-based state synchronization and operational transform / CRDT snapshotting for conflict-free reconciliation.
2. **Persistence & REST API (\`backend/controllers/whiteboardController.js\`)**:
   - \`GET /api/squads/:squadId/whiteboards\` - Fetches saved boards for a squad.
   - \`POST /api/squads/:squadId/whiteboards\` - Creates a new board instance.
   - \`PUT /api/whiteboards/:id/snapshot\` - Saves serialized canvas JSON snapshots.
   - \`DELETE /api/whiteboards/:id\` - Archives or deletes a board.

---

## Acceptance Criteria
- [ ] Multiple users in the same squad room can draw simultaneously with sub-100ms latency.
- [ ] Mindmap nodes can be created, linked with directional connectors, and exported to flashcards.
- [ ] Canvas state is automatically debounced and saved to database without lag.
- [ ] Unit tests for coordinate normalization and socket event handling.`
  },
  {
    title: "[FEAT]: Automated Voice-to-Text Multi-Language Audio Lecture Transcriber & Note Summarizer",
    labels: ["enhancement", "ai", "backend", "frontend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students frequently record college lectures, online tutorials, and study group discussions. Manually typing notes from audio is tedious and time-consuming. 

This feature implements an **Automated Audio Lecture Transcriber & AI Note Summarizer** that ingests MP3/M4A/WAV audio recordings, transcribes the speech with speaker diarization, generates structured notes with key definitions and LaTeX formulas, and creates flashcards automatically.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Audio Ingestion & Chunking Pipeline (\`backend/services/audioProcessingService.js\`)**:
   - Handles multi-part file uploads (MP3, WAV, M4A, AAC) up to 100MB using Multer with streaming disk storage.
   - Audio preprocessing with \`fluent-ffmpeg\` (converting to 16kHz mono WAV and chunking long audio files).
2. **AI Transcription & Diarization Engine (\`backend/services/transcriptionService.js\`)**:
   - Processes audio chunks through Gemini Audio API / Whisper endpoint with timestamped segments.
   - Distinguishes between Professor / Student questions (speaker diarization).
3. **AI Structured Note Generator (\`backend/services/noteSummarizerService.js\`)**:
   - Formats transcription into hierarchical Markdown summaries: Key Concepts, Formula Cheat-sheet, Exam Tips, and auto-generated Q&A flashcards.
4. **REST Endpoints**:
   - \`POST /api/lectures/upload\` - Ingests audio file and initiates asynchronous transcription job.
   - \`GET /api/lectures/jobs/:jobId\` - Polls processing status and progress percentage.
   - \`GET /api/lectures/:id/notes\` - Retrieves generated notes, transcript, and flashcard payloads.

### Frontend Architecture
1. **Audio Player & Synchronized Transcript Viewer (\`frontend/src/components/lectures/AudioTranscriptPlayer.jsx\`)**:
   - Interactive waveform audio player (WaveSurfer.js) synchronized with clickable transcript lines.
2. **Markdown Note Editor & Flashcard Exporter (\`frontend/src/components/lectures/LectureNotesEditor.jsx\`)**:
   - Side-by-side view of AI notes with one-click "Add to Subject Flashcards".

---

## Acceptance Criteria
- [ ] Users can upload lecture audio files (MP3/M4A/WAV) with upload progress indicators.
- [ ] Transcription produces timestamped text and structured notes with key points and formulas.
- [ ] Flashcards generated from lecture can be exported to user decks with a single click.`
  },
  {
    title: "[FEAT]: Intelligent Spaced-Repetition Leitner Box Visualizer with Retention Decay Curves",
    labels: ["enhancement", "flashcards", "frontend", "ui/ux", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students using flashcards need clear visual feedback on how well they are retaining knowledge across time. While OpenPrep AI tracks repetition intervals, students lack an intuitive overview of their learning progress across difficulty tiers.

This feature adds an **Interactive Leitner Box Visualizer & Ebbinghaus Retention Decay Curve Dashboard** to flashcard decks.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **5-Box Leitner Visualizer (\`frontend/src/components/flashcards/LeitnerBoxVisualizer.jsx\`)**:
   - 3D-styled or glassmorphic 5-tier card box representation (Box 1: Daily, Box 2: Every 3 Days, Box 3: Weekly, Box 4: Bi-Weekly, Box 5: Mastered / Monthly).
   - Animated card transitions: Cards smoothly fly between boxes when answered correctly or incorrectly during review sessions.
2. **Ebbinghaus Forgetting Curve Simulation (\`frontend/src/components/flashcards/RetentionDecayChart.jsx\`)**:
   - Dynamic retention curve chart showing predicted memory retention percentage (R = e^(-t/S)) over the coming 30 days.
   - Visual warnings for cards entering the "High Risk of Forgetting" zone.
3. **Deck Health Index Gauge**:
   - Real-time mastery score (0-100%) indicating overall deck maturity.

### Backend Architecture
1. **Leitner & Decay Aggregation Service (\`backend/services/leitnerAnalyticsService.js\`)**:
   - Aggregates flashcards grouped by interval tiers and calculates historical memory stability parameters.
2. **REST Endpoints**:
   - \`GET /api/flashcard-decks/:id/leitner-stats\` - Returns card counts per Leitner box and retention decay projections.

---

## Acceptance Criteria
- [ ] Interactive 5-tier Leitner box graphic displays real-time card counts for any deck.
- [ ] Forgetting curve graph accurately reflects the decay function based on last review timestamp.
- [ ] Responsive design with dark/light theme support and smooth CSS animations.`
  },
  {
    title: "[FEAT]: AI-Powered Dynamic Exam Simulator with Computer Adaptive Testing (CAT) Difficulty Scaling",
    labels: ["enhancement", "quiz-system", "ai", "backend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Standard static mock tests present a fixed set of questions regardless of whether a student finds them too easy or impossibly difficult. Real competitive examinations (GRE, GMAT, adaptive entrance tests) adjust question difficulty on-the-fly to pinpoint the candidate's exact ability level.

This feature implements a **Computer Adaptive Testing (CAT) Exam Simulator** utilizing Item Response Theory (IRT).

---

## Technical Scope & Architecture

### Backend Architecture
1. **Item Response Theory (IRT) Engine (\`backend/services/adaptiveTestingService.js\`)**:
   - Employs a 3-Parameter Logistic (3PL) IRT model: Discrimination (a), Difficulty (b), and Guessing (c).
   - Calculates real-time Student Ability Estimate (Theta $\\theta$) using Maximum Likelihood Estimation (MLE) and Bayesian updates after each answer submission.
   - Dynamically selects the next optimal question that maximizes Fisher Information at the candidate's current $\\theta$.
2. **AI Question Calibrator**:
   - Evaluates and tags uncalibrated question bank items with initial difficulty parameters based on past student response accuracy.
3. **REST API Endpoints**:
   - \`POST /api/adaptive-exams/start\` - Initializes an adaptive exam session with baseline ability estimate.
   - \`POST /api/adaptive-exams/:sessionId/submit-answer\` - Evaluates answer, recalculates ability $\\theta$, and returns next question.
   - \`GET /api/adaptive-exams/:sessionId/score-report\` - Generates comprehensive percentile and topic ability breakdown.

### Frontend Architecture
1. **Adaptive Exam Interface (\`frontend/src/components/adaptiveExam/AdaptiveExamRunner.jsx\`)**:
   - Distraction-free exam room with live question timer, formula sheet modal, and question flagger.
2. **Ability Trajectory Chart (\`frontend/src/components/adaptiveExam/AbilityTrajectoryGraph.jsx\`)**:
   - Post-exam visual chart tracing how student ability estimation evolved question-by-question throughout the test.

---

## Acceptance Criteria
- [ ] Dynamic next-question selection adjusts difficulty higher on correct answers and lower on incorrect answers.
- [ ] Ability estimation converges accurately to student mastery level.
- [ ] Comprehensive diagnostic post-exam report with percentile rankings.`
  },
  {
    title: "[FEAT]: Smart Syllabus Coverage Tracker & Burn-down Chart with AI Exam Readiness Score",
    labels: ["enhancement", "study-planner", "dashboard", "frontend", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students preparing for target exams need a clear, realistic projection of whether they will finish their syllabus in time. Traditional checklists do not account for chapter weightage, learning speed, or remaining days before exam.

This feature introduces a **Syllabus Coverage Burn-down Engine & AI Exam Readiness Score** for the student study dashboard.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Agile-Style Syllabus Burn-down Chart (\`frontend/src/components/studyPlanner/SyllabusBurndownChart.jsx\`)**:
   - Visual plot comparing "Ideal Syllabus Progress Line" vs "Actual Study Trajectory" over the target timeframe.
   - Dynamic forecast cone predicting projected completion date based on 7-day trailing velocity.
2. **Topic Weightage Treemap (\`frontend/src/components/studyPlanner/TopicWeightageTreemap.jsx\`)**:
   - Interactive hierarchical treemap coloring topics by mastery status (Completed, In-Progress, Unvisited, Critical Weakness) sized by exam marks weightage.
3. **AI Readiness Score Dial (\`frontend/src/components/studyPlanner/ExamReadinessGauge.jsx\`)**:
   - Circular animated gauge (0-100%) synthesizing quiz accuracy, syllabus coverage %, revision recency, and past PYQ topic frequencies.

### Backend Architecture
1. **Readiness Calculation Engine (\`backend/services/readinessScoreService.js\`)**:
   - Multi-factor scoring algorithm weighting high-yield topics from PYQ analysis.
   - Computes recommended study hours/day needed to recover if the student is falling behind schedule.
2. **REST Endpoints**:
   - \`GET /api/study-plans/:id/burndown\` - Retrieves daily progress datapoints and projected completion dates.
   - \`GET /api/study-plans/:id/readiness-score\` - Returns synthesized readiness score and actionable recovery recommendations.

---

## Acceptance Criteria
- [ ] Burn-down chart dynamically plots planned vs actual progress.
- [ ] Treemap highlights topics by exam weightage and student confidence.
- [ ] AI Exam Readiness Score updates automatically after study tasks or quizzes are completed.`
  },
  {
    title: "[FEAT]: PDF Question Paper Auto-Cropper & OCR LaTeX Formula Parser for Instant Quiz Generation",
    labels: ["enhancement", "pyq-analysis", "ai", "backend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students and teachers frequently possess past year exam papers as scanned PDFs or multi-column documents. Extracting individual questions and mathematical equations manually is exhausting.

This feature creates an **Automated PDF Question Paper Cropper & OCR LaTeX Formula Parser** that segments multi-column exam PDFs into standalone digital questions ready for quiz creation.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Document Layout Analysis & Cropping Pipeline (\`backend/services/pdfCroppingService.js\`)**:
   - Uses PDF parsing and layout analysis to detect question boundaries, numbered headers (e.g. \`Q1.\`, \`Question 2:\`), option sub-lists (\`(A)\`, \`(B)\`, \`(C)\`, \`(D)\`), and accompanying diagrams/figures.
   - Crops diagram regions as standalone optimized WebP images.
2. **Math OCR & LaTeX Formula Parser (\`backend/services/mathOcrService.js\`)**:
   - Translates mathematical formulas, chemical equations, and integrals from image segments into clean LaTeX strings (e.g. \`\\int_{0}^{\\infty} e^{-x^2} dx\`).
3. **AI Question Structuring Engine**:
   - Packages detected questions, options, diagram image URLs, and correct answer candidates into standard OpenPrep Quiz JSON schemas.
4. **REST Endpoints**:
   - \`POST /api/pyq/auto-segment\` - Uploads raw PDF, triggers OCR and bounding-box segmentation.
   - \`GET /api/pyq/segmented-questions/:jobId\` - Fetches parsed questions for review and editing before publishing.

### Frontend Architecture
1. **Interactive Segmentation Reviewer (\`frontend/src/components/pyq/QuestionSegmentationReviewer.jsx\`)**:
   - Split-screen UI: PDF page preview on left with highlighted bounding boxes, editable question cards with live LaTeX preview on right.

---

## Acceptance Criteria
- [ ] Successfully segments multi-page single and dual-column exam PDFs into individual questions.
- [ ] Accurately extracts diagrams and associates them with the correct question item.
- [ ] Converts complex mathematical formulas into renderable LaTeX.`
  },
  {
    title: "[FEAT]: Offline-First PWA Support with IndexedDB Sync Engine & Service Worker Caching",
    labels: ["enhancement", "frontend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students frequently study during commutes, in libraries with spotty Wi-Fi, or in low-connectivity areas. Losing access to flashcards, study notes, or losing quiz progress when the internet drops causes severe frustration.

This feature transforms OpenPrep AI into a full **Offline-First Progressive Web App (PWA)** with background synchronization and IndexedDB local caching.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Service Worker & Caching Strategy (\`frontend/public/sw.js\` or Workbox)**:
   - Cache-First strategy for static assets, fonts, icons, and UI stylesheets.
   - Network-First with Cache Fallback for API calls (Active study plans, flashcard decks, subject catalogs).
   - Web App Manifest configured with icons, standalone display mode, and theme color.
2. **IndexedDB Local Data Engine (\`frontend/src/services/offlineStorageService.js\`)**:
   - Stores flashcard decks, user notes, and pending quiz answers locally using Dexie.js / IndexedDB.
3. **Background Sync & Conflict Resolution (\`frontend/src/services/syncManager.js\`)**:
   - Queues offline actions (flashcard reviews, quiz submissions, study plan status toggles) in an offline mutations queue.
   - Automatically flushes queue with optimistic UI updates once network connectivity is restored.
4. **Offline Status Banner (\`frontend/src/components/common/OfflineStatusBanner.jsx\`)**:
   - Non-intrusive banner notifying users when operating in offline mode and showing pending sync counts.

---

## Acceptance Criteria
- [ ] Users can install OpenPrep AI as a standalone desktop/mobile PWA.
- [ ] Flashcard reviews and offline quiz attempts function completely without internet.
- [ ] Completed offline reviews synchronize reliably with backend on reconnect without data loss.`
  },
  {
    title: "[FEAT]: Multi-Modal Visual Diagram Question Generator with Interactive SVG Hotspot Answering",
    labels: ["enhancement", "quiz-system", "ai", "frontend", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Subjects such as Biology, Medicine, Physics (circuit diagrams), Geography, and Mechanical Engineering rely heavily on visual diagrams where students must identify specific parts, circuits, or anatomical structures. Text-only MCQs cannot adequately test spatial and structural knowledge.

This feature introduces **Multi-Modal Visual Diagram Questions with Interactive SVG Hotspots**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive SVG Hotspot Viewer (\`frontend/src/components/quiz/DiagramHotspotQuestion.jsx\`)**:
   - Interactive zoomable image container rendering SVG clickable target zones (polygons, circles, pins).
   - Answering modes:
     - **Click to Identify**: "Click on the Mitochondria in the diagram below."
     - **Drag-and-Drop Pinning**: Drag labels to their corresponding diagram anchors.
   - Visual feedback: Pulse ripple animation on click, green glow on correct region, red outline on incorrect region.
2. **Hotspot Editor for Educators/Admins (\`frontend/src/components/quiz/DiagramHotspotEditor.jsx\`)**:
   - Visual bounding box / polygon drawing tool to define answer coordinates on uploaded images.

### Backend Architecture
1. **AI Diagram Parsing Service (\`backend/services/diagramQuestionService.js\`)**:
   - Utilizes multi-modal AI to automatically detect labeled parts in uploaded diagrams and suggest hotspot coordinates and question prompts.
2. **Coordinate Validation Engine**:
   - Point-in-polygon algorithm to validate if user click coordinates fall within the defined tolerance radius of the target region.
3. **Database & API**:
   - Updates \`Question\` schema to support \`type: 'DIAGRAM_HOTSPOT'\`, image URLs, and coordinate polygon arrays.

---

## Acceptance Criteria
- [ ] Students can interactively answer questions by clicking on diagram regions with precise coordinate verification.
- [ ] Educators can upload diagrams and visually define target hotspot zones.
- [ ] AI can generate suggested diagram questions and hotspot regions automatically from textbook figures.`
  },
  {
    title: "[FEAT]: Granular Role-Based Access Control (RBAC) & Multi-Tenant Classroom Management for Educators",
    labels: ["enhancement", "backend", "authentication", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
OpenPrep AI is expanding from individual student self-study to institutional and classroom usage where teachers, professors, and teaching assistants manage cohorts of students, assign custom study tracks, and monitor class-wide performance.

This feature implements **Granular Role-Based Access Control (RBAC) and Multi-Tenant Classroom Management**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **RBAC Middleware & Permissions Matrix (\`backend/middleware/rbacMiddleware.js\`)**:
   - Roles: \`SUPER_ADMIN\`, \`INSTITUTION_ADMIN\`, \`EDUCATOR\`, \`TEACHING_ASSISTANT\`, \`STUDENT\`.
   - Fine-grained permission checks (e.g. \`canCreateClassroom\`, \`canAssignQuiz\`, \`canViewAnalytics\`, \`canManageRoster\`).
2. **Classroom Multi-Tenancy Engine (\`backend/models/Classroom.js\` & \`ClassroomEnrollment.js\`)**:
   - Unique 6-character alphanumeric classroom join codes and QR code invite URLs.
   - Bulk student onboarding via CSV file upload.
3. **Assignment Dispatcher (\`backend/services/classroomAssignmentService.js\`)**:
   - Schedule and dispatch study plans, quizzes, and PYQ sets to classrooms with strict due dates and late submission policies.
4. **REST Endpoints**:
   - \`POST /api/classrooms\` - Creates a new classroom.
   - \`POST /api/classrooms/join\` - Student enrolls via join code.
   - \`POST /api/classrooms/:id/roster/import-csv\` - Bulk roster import.
   - \`GET /api/classrooms/:id/mastery-heatmap\` - Aggregated class topic mastery matrix.

### Frontend Architecture
1. **Educator Classroom Dashboard (\`frontend/src/pages/ClassroomManagementPage.jsx\`)**:
   - Roster table, assignment tracker, and class-wide average score distribution charts.

---

## Acceptance Criteria
- [ ] RBAC middleware protects restricted endpoints based on user role and classroom membership.
- [ ] Educators can create classrooms, generate invite codes, and import students via CSV.
- [ ] Class-wide analytics display aggregate topic strengths and weaknesses.`
  },
  {
    title: "[FEAT]: AI Academic Doubt Solver Chatbot with Multi-Turn Context & Step-by-Step Socratic Hints",
    labels: ["enhancement", "ai", "frontend", "backend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
When students get stuck on difficult problems, jumping directly to the full answer bypasses the active recall learning process. Students learn best when guided by Socratic hints that nudge them toward deriving the answer themselves.

This feature creates an **AI Academic Doubt Solver Chatbot** with multi-turn conversation memory, LaTeX formula rendering, code execution assistance, and progressive Socratic hints.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Socratic AI Conversation Engine (\`backend/services/doubtSolverService.js\`)**:
   - System prompts optimized for pedagogical guidance: Evaluates student doubt, identifies underlying conceptual gaps, and provides graduated assistance (Level 1: Concept Prompt, Level 2: Formula Hint, Level 3: Step Breakdown, Level 4: Full Solution).
   - Retains multi-turn conversation history per doubt session.
2. **Context Enrichment Pipeline**:
   - Automatically injects current subject syllabus, related topic definitions, and relevant PYQ references into the LLM context window.
3. **REST Endpoints**:
   - \`POST /api/doubts/start\` - Initiates a new doubt resolution thread linked to a specific topic or question.
   - \`POST /api/doubts/:id/message\` - Sends student reply and returns AI guidance.
   - \`POST /api/doubts/:id/reveal-step\` - Reveals the next sequential hint level.

### Frontend Architecture
1. **Doubt Solver Chat Drawer (\`frontend/src/components/chat/DoubtSolverDrawer.jsx\`)**:
   - Slide-over floating chat drawer accessible from any quiz or study plan screen.
   - Rich Markdown, KaTeX math formatting, syntax highlighted code snippets, and "Hint 1/3", "Hint 2/3" reveal buttons.
2. **Voice Query Input**:
   - Web Speech API integration for asking questions via voice.

---

## Acceptance Criteria
- [ ] Chatbot guides students through progressive hints before revealing final answers.
- [ ] KaTeX renders mathematical expressions and chemical formulas cleanly in chat bubbles.
- [ ] Conversation history is saved and accessible under student's revision history.`
  },
  {
    title: "[FEAT]: Real-Time Study Squad Pomodoro Timer & Synchronized Lo-Fi Audio Lounge",
    labels: ["enhancement", "frontend", "ui/ux", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
Studying in isolation often leads to procrastination and burnout. Study squads provide accountability, but students need synchronized study/break intervals and a calming audio environment to maintain deep focus together.

This feature introduces a **Synchronized Squad Pomodoro Timer & Ambient Lo-Fi Audio Lounge**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Synchronized Pomodoro Clock (\`frontend/src/components/squads/SquadPomodoroTimer.jsx\`)**:
   - Classic 25/5 min or custom interval timer synchronized across all connected squad members in the room.
   - Circular SVG progress ring with smooth countdown animations and sound chimes on phase switch (Focus -> Short Break -> Long Break).
2. **Ambient WebAudio Soundscape Lounge (\`frontend/src/components/squads/AmbientAudioLounge.jsx\`)**:
   - Built-in multi-channel ambient audio mixer: Lo-Fi Study Beats, Rain on Window, Coffee Shop Murmur, White Noise, and Forest Breeze.
   - Individual volume sliders allowing users to craft custom personalized background soundscapes.
3. **Live Study Presence Avatars**:
   - Displays real-time squad member statuses (e.g. "Focusing on Thermodynamics", "Taking a 5 min break").

### Backend Architecture
1. **Timer Synchronization Hub (\`backend/services/pomodoroSocketService.js\`)**:
   - Server-authoritative timer clock broadcasting sync ticks and state transitions to prevent client clock drift.

---

## Acceptance Criteria
- [ ] Squad members in the same room see synchronized countdown timers with drift correction.
- [ ] Ambient sound mixer allows simultaneous blending of multiple audio tracks with volume control.
- [ ] Sound notifications play when focus and break sessions end.`
  },
  {
    title: "[FEAT]: Automated Daily Revision Email Digest & WhatsApp/Telegram Notification Dispatcher",
    labels: ["enhancement", "backend", "study-planner", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Consistent daily study habits are critical for exam success. Without automated external reminders, students often forget their scheduled revision tasks or let their study streaks expire.

This feature builds an **Automated Daily Revision Digest & Multi-Channel Notification Dispatcher** supporting Email (Nodemailer), Telegram Bot, and WhatsApp Webhooks.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Scheduled Notification Dispatcher (\`backend/services/notificationSchedulerService.js\`)**:
   - Cron daemon (running daily at 07:00 AM user local time) querying active study plans and overdue flashcard queues.
   - Generates personalized briefings: Scheduled daily topics, overdue flashcards count, active streak count, and daily motivational quote.
2. **Multi-Channel Delivery Providers**:
   - **Email Provider (\`backend/services/emailDigestService.js\`)**: Responsive HTML email templates with direct "Start Today's Review" action buttons.
   - **Telegram Bot Provider (\`backend/services/telegramBotService.js\`)**: Telegram webhook bot delivering summary text messages with inline action links.
   - **Webhook Dispatcher**: Generic outgoing webhook support for Discord and WhatsApp integrations.
3. **User Notification Preferences (\`backend/models/NotificationSettings.js\`)**:
   - Granular toggles: Daily Digest time, Streak freeze warnings, Overdue flashcard alerts, Channel preferences (Email, Telegram, In-App).

---

## Acceptance Criteria
- [ ] Scheduled cron job generates and dispatches daily digests to opted-in users.
- [ ] Email template renders cleanly across desktop and mobile email clients.
- [ ] Users can customize notification channels and delivery times in their profile settings.`
  },
  {
    title: "[FEAT]: AI-Powered Flashcard Distractor (Misconception-Based Wrong Answer) Generator",
    labels: ["enhancement", "quiz-system", "ai", "backend", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Creating high-quality multiple choice questions (MCQs) requires generating plausible "distractors" (incorrect options) that reflect common student misconceptions, typical sign errors, or confusion between related terms. Naive random distractors make quizzes unrealistically easy.

This feature implements an **AI Misconception-Based Distractor Generator** for multiple-choice quiz creation.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Distractor Generation Engine (\`backend/services/distractorGeneratorService.js\`)**:
   - Specialized prompt architecture targeting cognitive error patterns (e.g. calculation sign flips, inverted formulas, false cognates, historical date misalignments).
   - Generates 3 plausible distractors along with a "Why is this incorrect?" explanation note for every option.
2. **Distractor Plausibility & Semantic Distance Scorer**:
   - Calculates embedding distance to ensure distractors are neither identical to the correct answer nor completely absurd.
3. **REST Endpoints**:
   - \`POST /api/quizzes/generate-distractors\` - Takes a question stem and correct answer, returns 3 tailored distractors with misconception annotations.

### Frontend Architecture
1. **Interactive Distractor Inspector (\`frontend/src/components/quiz/DistractorReviewModal.jsx\`)**:
   - UI for educators and students to review AI-generated distractors, see the rationale behind each, and regenerate individual options with a click.

---

## Acceptance Criteria
- [ ] Generates 3 pedagogically meaningful distractors with misconception explanations.
- [ ] Validates that distractors do not duplicate the correct answer or each other.
- [ ] Integrated seamlessly into the quiz creation and AI question generation workflows.`
  },
  {
    title: "[FEAT]: Interactive Code Sandbox & Automated Multi-Language Test Runner for CS Practice Exams",
    labels: ["enhancement", "backend", "quiz-system", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Computer Science, Software Engineering, and Data Structures exam preparation requires executing and validating real code submissions against edge cases, unit tests, and runtime constraints.

This feature integrates an **Interactive Code Sandbox & Automated Test Runner** supporting Python, JavaScript, Java, C++, and C.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Isolated Code Execution Sandbox (\`backend/services/codeExecutionService.js\`)**:
   - Secure execution engine utilizing isolated containers / Piston API / WebAssembly execution wrappers.
   - Enforces strict execution guardrails: 2.0s CPU time limit, 128MB memory limit, disabled network access, and sanitized standard I/O.
2. **Test Case Assertion & Grading Engine (\`backend/services/gradingService.js\`)**:
   - Runs submissions against visible sample test cases and hidden evaluation test cases.
   - Generates detailed execution reports: Passed/Failed counts, execution time (ms), peak memory (MB), and stdout/stderr diffs.
3. **REST Endpoints**:
   - \`POST /api/code/run-sample\` - Executes code against sample visible test cases.
   - \`POST /api/code/submit\` - Grades code against complete hidden test suite and logs submission score.

### Frontend Architecture
1. **Monaco Code Editor Component (\`frontend/src/components/codeRunner/CodeEditorPane.jsx\`)**:
   - Full-featured Monaco code editor with syntax highlighting, auto-complete, language selector, and dark theme.
2. **Test Results & Console Terminal (\`frontend/src/components/codeRunner/TestResultsConsole.jsx\`)**:
   - Tabbed console showing Test Cases, Expected vs Actual Output diffs, Execution Time, and Memory usage badges.

---

## Acceptance Criteria
- [ ] Supports Python, JavaScript, C++, and Java execution with resource limits.
- [ ] Validates submissions against both public and hidden test cases.
- [ ] Safely prevents infinite loops and malicious system calls via timeout and sandboxing.`
  },
  {
    title: "[FEAT]: Comprehensive Security Audit Logging & Threat Telemetry Engine",
    labels: ["enhancement", "backend", "authentication", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
To safeguard student privacy and maintain compliance with data security standards, OpenPrep AI requires comprehensive security audit logging, brute-force detection, suspicious activity alerting, and exportable compliance trails.

This feature implements a **Security Audit Logging & Threat Telemetry Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Security Event Interceptor Middleware (\`backend/middleware/auditLogMiddleware.js\`)**:
   - Intercepts and records critical security events: Failed logins, password reset requests, JWT refresh anomalies, role modifications, account deletions, and API rate-limit breaches.
   - Captures contextual metadata: Masked IP address, Geolocation lookup (country/city), User-Agent, request payload hash, and HTTP status code.
2. **Audit Trail Data Model (\`backend/models/SecurityAuditLog.js\`)**:
   - High-throughput indexing on \`userId\`, \`eventType\`, \`timestamp\`, and \`severity (INFO, WARNING, CRITICAL)\`.
   - Immutable audit logs with retention policy cleanup daemons.
3. **Admin Threat Telemetry Dashboard Endpoints**:
   - \`GET /api/admin/security/logs\` - Paginated, filterable query interface for security events.
   - \`GET /api/admin/security/export\` - Exports compliance reports in CSV and JSON formats.
   - \`GET /api/admin/security/threat-summary\` - Summary metrics: Failed login spikes, geo-velocity anomalies, top rate-limited IPs.

---

## Acceptance Criteria
- [ ] Critical auth and access events are logged with IP, timestamp, and severity levels.
- [ ] Admins can filter, search, and export security logs by date range and event type.
- [ ] Zero performance degradation on authenticated user API requests.`
  },
  {
    title: "[FEAT]: Smart Web Clipper & Browser Extension API for One-Click Article-to-Note Conversion",
    labels: ["enhancement", "frontend", "backend", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students constantly discover valuable educational articles, documentation, research papers, and tutorials while browsing the web. Manually copying and formatting this content into OpenPrep AI is cumbersome.

This feature creates a **Smart Web Clipper API & Browser Extension Integration** that cleans web articles and imports them as structured study notes.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Web Scraping & Readability Pipeline (\`backend/services/webClipperService.js\`)**:
   - Extracts core article content using \`@mozilla/readability\` and \`cheerio\`, stripping ads, navigation bars, sidebars, and tracking scripts.
2. **AI Article Distiller & Note Formatter**:
   - Generates a concise summary, key takeaways list, and auto-tags corresponding subjects/topics in the user's library.
3. **REST API Endpoints**:
   - \`POST /api/clipper/ingest-url\` - Ingests a web URL, parses clean text, extracts images, and returns structured draft notes.
   - \`POST /api/clipper/save-note\` - Saves the clipped note directly into the user's chosen Subject notebook.

### Frontend Architecture
1. **Web Clipper Bookmarklet & Modal (\`frontend/src/components/notes/WebClipperModal.jsx\`)**:
   - URL import modal inside the web app allowing instant URL pasting.
   - Preview pane with editable title, subject selector, and generated AI bullet summary.

---

## Acceptance Criteria
- [ ] Ingests public web URLs and extracts clean article text and key figures without website clutter.
- [ ] AI generates bullet-point summaries and maps content to relevant user subjects.
- [ ] Clipped notes appear immediately in student notebooks.`
  },
  {
    title: "[FEAT]: Interactive 3D Molecular & Geometry Concept Visualizer (Three.js / WebGL)",
    labels: ["enhancement", "frontend", "ui/ux", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
Visualizing abstract 3D spatial concepts—such as chemical molecular orbitals, crystal lattices, complex polyhedra, and 3D coordinate geometry vectors—is difficult using static 2D textbook images.

This feature embeds an **Interactive 3D Molecular & Geometry Concept Visualizer** powered by Three.js and WebGL directly inside study notes and flashcards.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Three.js WebGL Viewport (\`frontend/src/components/visualizer3d/ThreeDViewer.jsx\`)**:
   - High-performance canvas with OrbitControls (rotate, pan, zoom, reset view).
   - Renderers:
     - **Chemistry**: PDB (Protein Data Bank) and MOL file loader rendering ball-and-stick and space-filling molecular models.
     - **Mathematics & Physics**: 3D Cartesian vectors, parametric surfaces, planes, and conic sections.
2. **Interactive Flashcard 3D Card Embed (\`frontend/src/components/flashcards/Flashcard3DModel.jsx\`)**:
   - Lightweight preview mode with touch-friendly 360-degree interactive rotation on the reverse side of flashcards.
3. **Preset Educational Asset Library**:
   - Bundled presets for fundamental concepts (Benzene, DNA Double Helix, Methane, Tetrahedron, Magnetic Field Lines).

---

## Acceptance Criteria
- [ ] WebGL viewport renders 3D molecules and geometric coordinate shapes smoothly at 60 FPS.
- [ ] Touch and mouse gestures support rotation, zooming, and panning.
- [ ] Flashcards can embed 3D interactive models without slowing down card flip animations.`
  },
  {
    title: "[FEAT]: Hybrid Full-Text & Semantic Vector Search Engine for Question Banks and Notes",
    labels: ["enhancement", "backend", "database", "ai", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
As OpenPrep AI scales to thousands of questions, notes, flashcards, and past year papers, standard exact string matching (\`LIKE %query%\`) fails to find relevant content when students search using synonyms, natural language questions, or conceptual phrases.

This feature implements a **Hybrid Search Engine combining BM25 Full-Text Indexing and Vector Semantic Embeddings**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Hybrid Retrieval Pipeline (\`backend/services/hybridSearchService.js\`)**:
   - **Keyword Channel**: BM25 / SQLite FTS5 / PostgreSQL full-text search with stemming and fuzzy matching for exact terms and formula strings.
   - **Semantic Channel**: Dense vector embeddings (OpenAI / Gemini Embeddings) stored and queried via vector cosine similarity.
   - **Reciprocal Rank Fusion (RRF)**: Merges and re-ranks keyword and semantic search results into a unified relevance score.
2. **Search Indexing Worker (\`backend/services/searchIndexService.js\`)**:
   - Background worker indexing new questions, notes, and flashcard cards on creation or update.
3. **REST Endpoints**:
   - \`GET /api/search?q=:query&type=:filter&subject=:subjectId\` - Returns ranked hybrid search matches with highlighted text snippets.

### Frontend Architecture
1. **Global Search Modal / Spotlight Palette (\`frontend/src/components/search/GlobalSearchModal.jsx\`)**:
   - Keyboard shortcut (\`Cmd+K\` / \`Ctrl+K\`) spotlight modal with instant autocomplete, category filters (Questions, Flashcards, Notes, Formulas), and highlighted snippets.

---

## Acceptance Criteria
- [ ] Global search responds in under 150ms with ranked results across questions, flashcards, and notes.
- [ ] Supports both exact keyword matching and semantic natural language queries.
- [ ] \`Ctrl+K\` / \`Cmd+K\` keyboard shortcut opens the spotlight search overlay from any page.`
  },
  {
    title: "[FEAT]: Distributed Redis Caching & Cache Invalidation Strategy for Dashboard & PYQ Analytics",
    labels: ["enhancement", "backend", "database", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
Aggregation endpoints—such as dashboard progress summaries, subject syllabus completion stats, leaderboard rankings, and PYQ chapter weightage matrices—require complex database aggregations and joins that degrade response times under high concurrency.

This feature builds a **Distributed Redis Caching Layer with Event-Driven Cache Invalidation**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Redis Cache Manager (\`backend/services/cacheService.js\`)**:
   - Centralized Redis client wrapper with connection pooling, graceful fallback to database on cache miss/downtime, and automatic JSON serialization.
   - Cache key namespacing (e.g. \`user:{userId}:dashboard\`, \`exam:{examId}:pyq-stats\`, \`leaderboard:global\`).
2. **Cache-Aside Pattern & Middleware (\`backend/middleware/cacheMiddleware.js\`)**:
   - Route-level caching middleware with configurable Time-To-Live (TTL).
   - ETag and HTTP \`304 Not Modified\` header support to eliminate redundant network payloads.
3. **Event-Driven Invalidation Hooks**:
   - Invalidation emitter: Automatically clears relevant cache keys when a user completes a quiz, updates a study plan task, or uploads a new PYQ.

---

## Acceptance Criteria
- [ ] Dashboard and analytics API response times decrease by >70% for cached requests.
- [ ] Modifying data immediately invalidates corresponding cache keys to prevent stale reads.
- [ ] Seamless fallback to direct database queries if Redis service is unreachable.`
  },
  {
    title: "[FEAT]: Peer Review & Discussion Forum Thread System for Controversial Exam Questions",
    labels: ["enhancement", "frontend", "backend", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Competitive exam questions often feature ambiguous wording, alternative solution techniques, or controversial official answer keys. Students benefit greatly from community discussions where peers and verified mentors debate solutions and share shortcuts.

This feature adds a **Nested Discussion Forum & Peer Solution Review System** directly attached to questions.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Thread & Comment Models (\`backend/models/QuestionComment.js\` & \`CommentVote.js\`)**:
   - Nested hierarchical tree comments (up to 3 levels deep).
   - Fields: \`questionId\`, \`authorId\`, \`content\`, \`latexContent\`, \`upvotes\`, \`downvotes\`, \`isVerifiedSolution\`, \`isPinned\`.
2. **Moderation & Flagging System**:
   - Content flagging for spam/incorrect answers and automated shadow-banning for reported abuse.
3. **REST Endpoints**:
   - \`GET /api/questions/:id/comments\` - Fetches nested comment thread with user vote statuses.
   - \`POST /api/questions/:id/comments\` - Submits a new comment or reply.
   - \`POST /api/comments/:id/vote\` - Upvotes/downvotes a comment.
   - \`PUT /api/comments/:id/verify\` - Educator/Mentor marks answer as "Verified Expert Solution".

### Frontend Architecture
1. **Discussion Thread Pane (\`frontend/src/components/quiz/QuestionDiscussionThread.jsx\`)**:
   - Collapsible comment trees, Markdown/LaTeX editor with live preview, and "Verified Solution" highlighted badge.

---

## Acceptance Criteria
- [ ] Students can post comments, replies, and vote on explanations for any question.
- [ ] KaTeX formulas and Markdown render accurately in discussion posts.
- [ ] Educators can mark authoritative comments with a "Verified Solution" badge.`
  },
  {
    title: "[FEAT]: Dark/Light/OLED Theme Engine with High-Contrast Accessibility Mode (WCAG 2.1 AA Compliance)",
    labels: ["enhancement", "frontend", "ui/ux", "good first issue", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
Students study at all hours of the day and night. Providing optimal contrast modes (such as Midnight OLED to save battery, Sepia for long reading sessions, and High-Contrast for visually impaired or dyslexic students) ensures inclusivity and reduces eye fatigue.

This feature implements a comprehensive **Theme & Accessibility Engine conforming to WCAG 2.1 AA Standards**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Design System Token Architecture (\`frontend/src/styles/themes.css\` / CSS Variables)**:
   - Themes: \`System Default\`, \`Light\`, \`Dark\`, \`Midnight OLED (#000000)\`, \`Sepia Warm Reading\`, \`High Contrast\`.
   - CSS custom property design tokens for surfaces, text, borders, focus rings, and chart color palettes.
2. **Accessibility Settings Modal (\`frontend/src/components/settings/AccessibilitySettingsModal.jsx\`)**:
   - Font scale slider (90% to 140%).
   - OpenDyslexic / Lexend font toggle for improved reading comprehension.
   - Reduced motion toggle (\`prefers-reduced-motion\`) to disable non-essential animations.
3. **ARIA & Keyboard Navigation Audit**:
   - Full keyboard focus rings, skip-to-content navigation links, and screen-reader accessible ARIA labels for interactive elements.

---

## Acceptance Criteria
- [ ] Seamless theme switching with no flash of unstyled content (FOUC) and persistence in localStorage.
- [ ] Color contrast ratios meet or exceed WCAG 2.1 AA minimum ratio of 4.5:1.
- [ ] Keyboard navigation allows complete site operation using Tab, Enter, and Arrow keys.`
  },
  {
    title: "[FEAT]: Automated PDF Study Guide & Revision Booklet Generator with Custom Watermarks",
    labels: ["enhancement", "backend", "frontend", "medium-priority", "ECSoC26"],
    body: `## Summary & Motivation
Many students prefer offline paper-based revision right before an exam to avoid screen distractions. Compiling flashcards, formula cheat-sheets, and high-yield notes into a printer-ready booklet manually is cumbersome.

This feature creates an **Automated PDF Study Guide & Revision Booklet Generator** that exports customized, beautifully formatted A4 printable revision books.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Document Layout & PDF Generation Engine (\`backend/services/pdfGenerationService.js\`)**:
   - Uses Puppeteer / PDFKit / HTML-to-PDF rendering to construct print-optimized A4 booklets.
   - Generates structured Table of Contents with page numbers, subject headers, QR code deep links to online quiz practice, and two-column formula cheat-sheets.
2. **Custom Branding & Watermark Support**:
   - Allows users/educators to include custom title, student name, institution logo, and watermark.
3. **REST Endpoints**:
   - \`POST /api/study-guides/export-pdf\` - Compiles selected flashcard decks, notes, and formula sheets into a downloadable PDF document stream.

### Frontend Architecture
1. **Printable Booklet Builder Dialog (\`frontend/src/components/export/StudyGuideExportModal.jsx\`)**:
   - Selection checklist (Include Flashcards, Include Formulas, Include High-Yield Notes).
   - Live page preview showing estimated page count and layout options.

---

## Acceptance Criteria
- [ ] Generates clean, printer-ready A4 PDF study booklets with pagination and Table of Contents.
- [ ] Mathematical equations render crisply as vector graphics in the PDF.
- [ ] Downloadable within seconds with proper MIME streaming headers.`
  },
  {
    title: "[FEAT]: Study Squad Tournament & Bracket-Style Knockout Quiz Competition System",
    labels: ["enhancement", "quiz-system", "backend", "frontend", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
Gamification and competitive peer matches boost student engagement and revision retention. Study squads currently lack structured tournament competitions where members or squads face off in knockout rounds.

This feature builds a **Tournament & Bracket-Style Knockout Quiz Competition System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Tournament Bracket Manager (\`backend/services/tournamentService.js\`)**:
   - Supports Single Elimination and Double Elimination bracket generation for 4, 8, 16, or 32 participants/squads.
   - Automated seeding based on previous quiz XP and matchmaking rating (MMR).
2. **Live Match Synchronization via WebSockets**:
   - Real-time head-to-head quiz room: Both competitors receive the same questions with synchronized countdown timers.
   - Live score calculation factoring in both accuracy and speed (bonus points for faster correct answers).
   - Automated match winner resolution and bracket progression.
3. **REST Endpoints**:
   - \`POST /api/tournaments\` - Creates a new tournament event.
   - \`GET /api/tournaments/:id/bracket\` - Returns live bracket tree structure and match statuses.
   - \`POST /api/tournaments/:id/join\` - Registers student or squad for tournament.

### Frontend Architecture
1. **Interactive Tournament Bracket Visualizer (\`frontend/src/components/tournaments/TournamentBracketView.jsx\`)**:
   - Pan-and-zoom bracket tree visualization highlighting active matches, winners, and upcoming rounds.
2. **Live Match Arena & Spectator Mode (\`frontend/src/components/tournaments/LiveMatchArena.jsx\`)**:
   - Side-by-side player health/score bars, real-time question arena, and spectator live reaction emojis.

---

## Acceptance Criteria
- [ ] Generates valid single/double elimination brackets and advances winners automatically.
- [ ] Synchronized 1v1 live quiz matches update scores in real time via WebSockets.
- [ ] Spectators can watch ongoing matches with live leaderboards.`
  },
  {
    title: "[FEAT]: AI Handwriting Recognition & Diagram Interpretation for Handwritten Exam Submissions",
    labels: ["enhancement", "ai", "pyq-analysis", "backend", "high-priority", "ECSoC26"],
    body: `## Summary & Motivation
In STEM, Humanities, and competitive examinations, students frequently write descriptive multi-line mathematical proofs, chemical mechanisms, and long-form essays by hand. OpenPrep AI needs to support photo uploads of handwritten homework and mock exam answer sheets.

This feature creates an **AI Handwriting Recognition & Descriptive Answer Evaluation Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Image Preprocessing & Vision OCR Pipeline (\`backend/services/handwritingOcrService.js\`)**:
   - Image orientation correction, perspective deskewing, and contrast normalization.
   - Multi-modal vision AI processing (Gemini Vision / Vision OCR) extracting handwritten mathematical proofs, diagram annotations, and essay text.
2. **Automated Rubric-Based Grading Engine (\`backend/services/rubricGradingService.js\`)**:
   - Compares transcribed student proof/solution against the official model answer key.
   - Computes partial-credit breakdown across key criteria (Step Method, Calculation Accuracy, Final Answer, Diagram Accuracy).
   - Generates line-by-line constructive feedback with highlighted error points.
3. **REST Endpoints**:
   - \`POST /api/submissions/handwritten-upload\` - Uploads multi-page answer sheet photos.
   - \`GET /api/submissions/:id/evaluation\` - Returns transcribed text, rubric score, and feedback annotations.

### Frontend Architecture
1. **Answer Sheet Photo Reviewer (\`frontend/src/components/submissions/HandwrittenSubmissionViewer.jsx\`)**:
   - Side-by-side viewer with original image photo on left and AI transcription + step-by-step grading rubric on right.

---

## Acceptance Criteria
- [ ] Transcribes handwritten math equations and essay text from uploaded photos with high accuracy.
- [ ] Evaluates submissions against reference answer rubrics and awards partial credit.
- [ ] Highlights specific error steps and offers detailed constructive feedback.`
  },
  {
    title: "[FEAT]: End-to-End Synthetic Data Generator & Load Testing Suite for Platform Benchmarking",
    labels: ["enhancement", "backend", "good first issue", "low-priority", "ECSoC26"],
    body: `## Summary & Motivation
To ensure OpenPrep AI remains robust and performant during peak exam seasons when thousands of students submit quizzes concurrently, developers need reproducible synthetic test datasets and automated load testing suites.

This issue implements an **End-to-End Synthetic Data Generator & k6 Performance Benchmarking Suite**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Synthetic Data Seeder Script (\`backend/scripts/seedSyntheticData.js\`)**:
   - Utilizes \`@faker-js/faker\` to generate realistic, relational test fixtures:
     - 500+ diverse student and educator accounts.
     - 20+ complete exam curricula (JEE, NEET, GATE, UPSC, GRE, SAT) with subjects, topics, and subtopics.
     - 5,000+ realistic MCQs with LaTeX formulas and misconception distractors.
     - 10,000+ historical quiz attempts, SM-2 flashcard intervals, and activity logs.
2. **k6 Load Testing Scenarios (\`tests/load/k6-scenarios.js\`)**:
   - **Scenario A (Peak Quiz Submissions)**: Simulates 200 concurrent users submitting answers simultaneously.
   - **Scenario B (Dashboard Aggregation)**: Simulates 500 concurrent requests hitting analytics endpoints.
   - **Scenario C (WebSocket Sync)**: Simulates 50 concurrent study squad rooms with live timer and chat broadcasts.
3. **Benchmark Automation & CI Integration**:
   - Generates latency distribution reports (p50, p95, p99) and flags queries exceeding 200ms threshold.

---

## Acceptance Criteria
- [ ] Seeder script populates database with relational synthetic data in under 30 seconds.
- [ ] k6 test scripts validate platform stability under 200+ simulated concurrent virtual users.
- [ ] Comprehensive documentation added to \`docs/load-testing.md\`.`
  }
];

async function createIssues() {
  console.log(`Starting creation of ${issues.length} GitHub issues...`);
  
  const created = [];
  
  for (let i = 0; i < issues.length; i++) {
    const item = issues[i];
    console.log(`[${i + 1}/${issues.length}] Creating: ${item.title}`);
    
    // Write body to temporary file to avoid shell escape issues on Windows
    const tempFilePath = path.join(__dirname, `temp_issue_body_${i}.md`);
    fs.writeFileSync(tempFilePath, item.body, 'utf-8');
    
    try {
      const labelsArg = item.labels.map(l => `--label "${l}"`).join(' ');
      const cmd = `gh issue create --title "${item.title.replace(/"/g, '\\"')}" --body-file "${tempFilePath}" ${labelsArg}`;
      
      const stdout = execSync(cmd, { encoding: 'utf-8', cwd: path.join(__dirname, '..') });
      const url = stdout.trim();
      console.log(` -> Success: ${url}`);
      created.push({ title: item.title, url, index: i + 1 });
    } catch (err) {
      console.error(` -> Error creating issue "${item.title}":`, err.message);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
    
    // Sleep 1.5 seconds between issues to avoid secondary rate limits
    await new Promise(r => setTimeout(r, 1500));
  }
  
  console.log(`\nFinished! Created ${created.length} issues.`);
  console.log(JSON.stringify(created, null, 2));
}

createIssues().catch(console.error);
