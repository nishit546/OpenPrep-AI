const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issuesDir = path.join(__dirname, '..', 'issues');
if (!fs.existsSync(issuesDir)) {
  fs.mkdirSync(issuesDir, { recursive: true });
}

// 25 Comprehensive, High-Impact GitHub Issues for OpenPrep AI
const curatedIssues = [
  {
    number: 561,
    slug: "real-time-ai-math-equation-step-by-step-solver",
    title: "[FEAT]: Real-Time AI Math Equation Step-by-Step Solver with Interactive Graphing & Scratchpad",
    labels: ["enhancement", "ai", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students preparing for STEM exams (Calculus, Linear Algebra, Physics) frequently get stuck on complex algebraic equations and differential calculus problems. Static solution keys often skip intermediate algebraic transformations, leaving students confused about how a solution was derived.

This feature implements a **Real-Time AI Math Equation Step-by-Step Solver** with interactive 2D function curve plotting, KaTeX equation rendering, and an interactive digital scratchpad for manual derivation verification.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Math Input & Scratchpad (\`frontend/src/components/math/MathScratchpad.jsx\`)**:
   - MathQuill / KaTeX live math expression editor supporting Greek symbols, integrals, limits, matrices, and fractions.
   - Digital stylus/mouse freehand drawing canvas overlaid on top of LaTeX steps for quick rough work.
2. **Dynamic 2D Function Plotter (\`frontend/src/components/math/FunctionPlotter.jsx\`)**:
   - Function-plot / Plotly.js integration for real-time visualization of algebraic functions, tangents, derivatives, and roots.
   - Interactive slider controls for variables (e.g. varying parameters $a, b, c$ in $f(x) = ax^2 + bx + c$).
3. **Step-by-Step Breakdown Accordion (\`frontend/src/components/math/SolutionStepsAccordion.jsx\`)**:
   - Collapsible sub-steps with "Why this step?" AI hints explaining underlying theorems (e.g., L'Hôpital's Rule, Integration by Parts).

### Backend Architecture
1. **AI Mathematical Reasoning Pipeline (\`backend/services/mathSolverService.js\`)**:
   - Structured prompt chaining with Google Gemini 1.5 Flash / Pro to generate verifiable step-by-step LaTeX derivations and JSON-encoded plot coordinates.
   - Validation filter ensuring intermediate equations preserve mathematical equality.
2. **REST Endpoints (\`backend/controllers/mathSolverController.js\`)**:
   - \`POST /api/math/solve\` - Submits a raw LaTeX math equation or problem statement; returns structured steps, formulas, and plot functions.
   - \`POST /api/math/verify-step\` - Evaluates a student's intermediate attempt against the canonical solution step.

---

## Acceptance Criteria
- [ ] Users can type or paste complex LaTeX mathematical expressions and receive structured step-by-step breakdowns within 3 seconds.
- [ ] Graphs are plotted smoothly with pan, zoom, and root/intercept markers.
- [ ] Students can click "Verify My Step" to check if their intermediate working is algebraically correct.
- [ ] Unit and integration tests verify equation parsing and prompt schema validation.`
  },
  {
    number: 562,
    slug: "collaborative-real-time-code-interview-sandbox",
    title: "[FEAT]: Collaborative Real-Time Code Interview & Pair-Programming Sandbox for CS Exams",
    labels: ["enhancement", "frontend", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Computer Science and Engineering students need an interactive coding environment to practice Data Structures & Algorithms (DSA), competitive programming, and technical interview problems together with study squad peers.

This feature introduces a **Collaborative Real-Time Code Sandbox** equipped with Monaco Editor, WebSocket operational transformation, multi-language execution, and custom unit-test runners.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Monaco Code Editor (\`frontend/src/components/code/CodeEditorSandbox.jsx\`)**:
   - Monaco Editor integration with multi-language syntax highlighting (Python, JavaScript, C++, Java, Go, Rust).
   - Theme toggle (VS Code Dark, GitHub Light, Monokai, Nord).
   - Real-time peer cursor indicators with collaborator name tags and colored selection highlights.
2. **Test Case & Console Output Drawer (\`frontend/src/components/code/ExecutionConsole.jsx\`)**:
   - Tabbed interface for Standard Input (stdin), Standard Output (stdout), Error Trace (stderr), and Execution Time/Memory benchmarks.
   - Visual test case validation badges (Passed / Failed / Time Limit Exceeded).

### Backend Architecture
1. **WebSocket Collaboration Handler (\`backend/services/codeRoomSocketService.js\`)**:
   - Yjs / CRDT room binding for real-time conflict-free collaborative editing over WebSockets.
   - Awareness states for tracking user presence, active line numbers, and typing locks.
2. **Isolated Code Execution Engine (\`backend/services/codeRunnerService.js\`)**:
   - Sandboxed execution wrapper (Docker container / Piston API integration) with strict memory limits (128MB) and timeout thresholds (5s).
3. **REST Endpoints (\`backend/controllers/codeSandboxController.js\`)**:
   - \`POST /api/code/run\` - Executes code against standard test cases and returns execution metrics.
   - \`POST /api/code/rooms\` - Creates a persistent collaborative coding session with shareable invite link.

---

## Acceptance Criteria
- [ ] Multiple users can write and edit code in the same session simultaneously without race conditions.
- [ ] Supported languages (Python, JavaScript, C++, Java) compile and run with output streamed back to the console.
- [ ] Execution sandbox safely handles infinite loops and memory leaks with timeouts.
- [ ] Automated Jest test suite covering WebSocket room join/leave and sandbox security isolation.`
  },
  {
    number: 563,
    slug: "ai-flashcard-auto-generator-youtube-lectures",
    title: "[FEAT]: AI Flashcard Auto-Deck Generator from YouTube Lecture URLs & Timestamps",
    labels: ["enhancement", "ai", "flashcards", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students spend hours watching educational video lectures on YouTube (e.g. MIT OpenCourseWare, Khan Academy, CrashCourse, NPTEL) but struggle to retain key concepts without active recall. Manually creating flashcards while pausing videos disrupts study flow.

This feature implements an **AI Flashcard Auto-Deck Generator from YouTube URLs** that ingests lecture transcripts, sections content by video chapters, and generates review-ready spaced repetition flashcards linked to exact timestamps.

---

## Technical Scope & Architecture

### Backend Architecture
1. **YouTube Ingestion & Transcript Extractor (\`backend/services/youtubeService.js\`)**:
   - Extracts YouTube Video ID, metadata (title, channel, duration, chapter markers) via YouTube Data API / \`youtube-transcript\`.
   - Parses timed caption tracks with language fallback and tokenization.
2. **AI Flashcard Distillation Pipeline (\`backend/services/aiFlashcardExtractor.js\`)**:
   - Chunks transcript segments into coherent semantic modules based on timestamp chapter markers.
   - Prompts Gemini 1.5 to generate high-yield question-answer pairs, definitions, and formulas tagged with the video timestamp.
3. **REST Endpoints (\`backend/controllers/youtubeFlashcardController.js\`)**:
   - \`POST /api/flashcards/generate-from-youtube\` - Ingests YouTube URL, fetches transcript, and streams AI generated flashcard objects.
   - \`POST /api/flashcards/save-youtube-deck\` - Persists generated deck into user's flashcard library with video reference links.

### Frontend Architecture
1. **YouTube Ingestion Modal (\`frontend/src/components/flashcards/YouTubeDeckModal.jsx\`)**:
   - URL input with instant video preview thumbnail, title, and detected chapter list.
   - Granular options: "Generate full lecture", "Generate specific chapters", or "Card count limit".
2. **Flashcard Preview & Editor with Timestamp Player**:
   - Interactive preview table allowing students to edit card front/back and click a timestamp to jump directly to that point in an embedded YouTube player.

---

## Acceptance Criteria
- [ ] Users can paste any valid YouTube educational video link with captions and generate 10-30 high-quality flashcards.
- [ ] Each generated flashcard contains a clickable timestamp linking directly to the relevant video moment.
- [ ] Robust error handling for videos without closed captions or private/restricted videos.
- [ ] Full unit test coverage for YouTube URL regex parsing and transcript chunking logic.`
  },
  {
    number: 564,
    slug: "dynamic-pdf-watermarking-digital-signature-notes-export",
    title: "[FEAT]: Dynamic PDF Watermarking, Digital Signature & Chapter-Wise Export for Custom Study Notes",
    labels: ["enhancement", "backend", "frontend", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Students creating comprehensive revision notes on OpenPrep AI often want to export clean, printable PDF documents for offline studying, binder printing, or sharing with study squad peers. To maintain academic ownership and prevent unauthorized redistribution, documents need customizable watermarks and clean formatting.

This feature adds **Dynamic PDF Watermarking, Custom Headers/Footers, and Chapter-Wise Export** for student study notes.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Generation Service (\`backend/services/pdfExportService.js\`)**:
   - Utilizes \`pdf-lib\` / headless Chrome rendering for high-fidelity vector PDF generation from Markdown/HTML.
   - Injects student username, university/exam title, generated date, and customizable diagonal opacity watermarks across pages.
   - Embeds a dynamic QR code on the title page linking back to the live interactive note on OpenPrep AI.
2. **REST Endpoints (\`backend/controllers/noteExportController.js\`)**:
   - \`POST /api/notes/:id/export-pdf\` - Generates and streams branded PDF binary with custom layout options (Page Size: A4/Letter, Theme: Light/Dark/Print-Friendly).

### Frontend Architecture
1. **PDF Export Dialog (\`frontend/src/components/notes/PdfExportModal.jsx\`)**:
   - Live PDF layout preview showing margin sizes, font typography, and watermark preview.
   - Checkbox controls for: "Include Table of Contents", "Include AI Summaries", "Include QR Code Link", "Print-Optimized Black & White".

---

## Acceptance Criteria
- [ ] Users can export any study note or study plan into an A4 PDF within 2 seconds.
- [ ] Exported PDFs render LaTeX math formulas, code snippets, and tables with sharp vector quality.
- [ ] Optional watermark (text, opacity, angle) renders cleanly across all pages without obscuring text.
- [ ] QR code on cover page scans directly to the note URL on OpenPrep AI.`
  },
  {
    number: 565,
    slug: "spaced-repetition-leitner-box-visualizer",
    title: "[FEAT]: Spaced-Repetition Leitner Box Visualizer with Interactive Card Drift & Review Forecast",
    labels: ["enhancement", "flashcards", "frontend", "ui/ux", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
While OpenPrep AI uses the SuperMemo SM-2 algorithm to schedule flashcard reviews, students often lack visual intuition on their memory retention status. A visual Leitner Box representation gives learners immediate clarity on how many cards are in learning, reviewing, or mastered states.

This feature implements an **Interactive Leitner Box Visualizer & 30-Day Retention Forecast Chart**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D/2D Leitner Box Interactive Deck Stage (\`frontend/src/components/flashcards/LeitnerBoxVisualizer.jsx\`)**:
   - 5 distinct visual boxes representing proficiency levels (Box 1: Daily -> Box 5: Monthly).
   - Animated cards transitioning between boxes upon completion of review sessions (moving forward on success, returning to Box 1 on forgotten).
   - Clickable box trays that allow filtering and reviewing cards belonging to a specific mastery tier.
2. **30-Day Review Load Forecasting Graph (\`frontend/src/components/flashcards/ReviewLoadForecast.jsx\`)**:
   - Bar chart showing predicted daily card review volume over the upcoming 30 days based on SM-2 intervals.
   - Visual warnings for upcoming "heavy workload" days to help students balance study schedules.

### Backend Architecture
1. **Leitner & Forecast Calculation Service (\`backend/services/spacedRepetitionAnalytics.js\`)**:
   - Aggregates user's flashcard deck database into Leitner box buckets based on repetition counts and easiness factors ($EF$).
   - Computes daily due date histogram projection for the next 30 calendar days.
2. **REST Endpoints (\`backend/controllers/flashcardAnalyticsController.js\`)**:
   - \`GET /api/flashcards/analytics/leitner-distribution\` - Returns count and percentage of cards per Leitner stage.
   - \`GET /api/flashcards/analytics/due-forecast\` - Returns daily projected review loads.

---

## Acceptance Criteria
- [ ] Visual Leitner boxes display accurate real-time card counts for all user decks.
- [ ] Interactive animations show card promotion/demotion between boxes after review sessions.
- [ ] 30-day forecast chart correctly reflects scheduled SM-2 due dates.
- [ ] Responsive layout with smooth touch drag-and-drop interactions on mobile.`
  },
  {
    number: 566,
    slug: "redis-distributed-token-bucket-rate-limiter",
    title: "[FEAT]: Redis-Backed Distributed Token Bucket Rate Limiter with Tiered User Quotas",
    labels: ["enhancement", "backend", "security", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
As OpenPrep AI expands its AI-powered features (quiz generation, question paper analysis, oral vivas), unauthenticated or abusive automated requests can quickly exhaust upstream Gemini API quotas and degrade server performance for legitimate students.

This feature implements a **High-Performance Redis Token Bucket Rate Limiter** with role-based tiered quotas and standardized RFC-6585 HTTP 429 response headers.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Redis Atomic Lua Rate Limit Script (\`backend/middleware/rateLimiter.js\`)**:
   - Executes atomic Redis Lua script implementing the Token Bucket algorithm (burst allowance + smooth replenishment rate).
   - Key partitioning by User ID for authenticated users and SHA-256 hashed Client IP + User-Agent for guests.
2. **Tiered Policy Configuration Matrix (\`backend/config/rateLimitTiers.js\`)**:
   - **Guest / Unauthenticated**: 10 requests / min (AI endpoints locked).
   - **Standard Student**: 60 requests / min; 30 AI generations / hour.
   - **Squad Moderator / Admin**: 120 requests / min; 100 AI generations / hour.
3. **Standardized Header Injection**:
   - \`X-RateLimit-Limit\`: Maximum tokens in bucket.
   - \`X-RateLimit-Remaining\`: Tokens remaining in current window.
   - \`X-RateLimit-Reset\`: Unix timestamp when bucket fully refills.
   - \`Retry-After\`: Seconds to wait before retrying on 429 responses.

---

## Acceptance Criteria
- [ ] High-frequency burst traffic is smoothly throttled without blocking legitimate student interactions.
- [ ] Redis Lua scripts execute atomically in sub-2ms latency without race conditions.
- [ ] HTTP 429 responses include clear \`Retry-After\` headers and user-friendly JSON error payloads.
- [ ] Stress-tested with k6 / Jest load scripts simulating 100+ concurrent requests.`
  },
  {
    number: 567,
    slug: "pwa-offline-sync-indexeddb-service-worker",
    title: "[FEAT]: Cross-Platform Progressive Web App (PWA) Offline Sync with IndexedDB & Service Worker Cache",
    labels: ["enhancement", "pwa", "offline", "frontend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Students frequently study in environments with unstable or nonexistent internet connectivity (subways, rural areas, airplane travel). Currently, losing internet connection interrupts flashcard reviews and quiz attempts in OpenPrep AI.

This feature converts OpenPrep AI into a **Fully Capable Offline-First Progressive Web App (PWA)** with Workbox service worker caching, IndexedDB persistence, and background sync.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Workbox Service Worker & Caching Strategy (\`frontend/src/service-worker.js\`)**:
   - App shell (HTML, CSS, JS bundles, fonts) cached via Stale-While-Revalidate strategy.
   - Subject icons and static assets cached via Cache-First strategy with TTL expiration.
2. **IndexedDB Local Data Store (\`frontend/src/services/offlineStorage.js\`)**:
   - Uses \`idb\` wrapper to persist active flashcard decks, study notes, and in-progress quiz questions locally on device.
   - Mutation queue store for recording offline flashcard reviews and quiz submissions.
3. **Background Sync & Online Reconciliation (\`frontend/src/services/syncManager.js\`)**:
   - Listens for \`window.addEventListener('online')\` and utilizes Service Worker Background Sync API (\`sync\` event).
   - Replays queued mutations to backend endpoints in FIFO order and reconciles local state with server response.
4. **Offline Mode Status Indicator & Banner**:
   - Non-intrusive floating indicator indicating offline mode and count of pending mutations waiting to sync.

---

## Acceptance Criteria
- [ ] Students can install OpenPrep AI to desktop and mobile home screens via PWA install prompt.
- [ ] Flashcards and active quizzes remain 100% playable while completely disconnected from the internet.
- [ ] Offline review attempts are automatically synced to the backend when connection is restored.
- [ ] Offline status banner updates smoothly with zero data loss.`
  },
  {
    number: 568,
    slug: "ai-oral-exam-viva-voce-examiner-speech",
    title: "[FEAT]: AI-Powered Mock Viva Voce & Technical Oral Exam Examiner with Speech Synthesis",
    labels: ["enhancement", "ai", "frontend", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
University practical exams, medical board vivas, and engineering thesis defenses require students to articulate technical concepts verbally under pressure. Most prep platforms only offer multiple-choice quizzes, leaving students unprepared for verbal cross-examination.

This feature implements an **AI-Powered Mock Viva Voce Simulator** that speaks technical questions, listens to verbal responses, evaluates concept depth, and conducts dynamic follow-up questioning.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Viva Examiner Interface (\`frontend/src/components/viva/VivaExamRoom.jsx\`)**:
   - Realistic examiner avatar with animated speech indicators and audio waveform visualizer.
   - Web Speech API (\`SpeechSynthesis\`) audio question readout with natural pacing and accent options.
   - Push-to-talk / Voice-activity-detection (VAD) audio recorder capturing student responses.
2. **Live Transcription & Answer Canvas**:
   - Real-time Speech-to-Text captioning showing transcribed student speech for confirmation.
   - Follow-up question dialogue history thread.
3. **Viva Performance Scorecard & Rubric Analysis**:
   - Post-session evaluation report grading Technical Accuracy, Conceptual Clarity, Vocabulary Precision, and Answer Conciseness.

### Backend Architecture
1. **Dynamic Viva Dialogue Engine (\`backend/services/vivaExaminerService.js\`)**:
   - Multi-turn conversation state tracking student syllabus, difficulty level, and prior answers.
   - Generates probing follow-up questions when a student's answer is vague or incomplete.
2. **REST Endpoints (\`backend/controllers/vivaController.js\`)**:
   - \`POST /api/viva/start\` - Initializes viva session for selected subject and topic.
   - \`POST /api/viva/respond\` - Ingests student verbal response transcript; returns examiner verdict and next question.
   - \`POST /api/viva/finish\` - Finalizes score report and saves feedback in student portfolio.

---

## Acceptance Criteria
- [ ] Students can conduct a full 5 to 10 question oral examination using microphone and speakers.
- [ ] The AI examiner dynamically probes deeper when student answers are incomplete.
- [ ] Comprehensive rubric score and detailed feedback generated at end of session.
- [ ] Cross-browser support for Chrome, Edge, Safari, and Firefox.`
  },
  {
    number: 569,
    slug: "rbac-study-squad-audit-logs",
    title: "[FEAT]: Granular Role-Based Access Control (RBAC) & Audit Log Explorer for Study Squad Admins",
    labels: ["enhancement", "backend", "security", "authentication", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As Study Squads on OpenPrep AI grow into active communities with dozens of members, squad leaders need granular permissions to manage moderators, prevent deck tampering, and audit group activities (such as member bans, note edits, and quiz assignments).

This feature implements a **Granular RBAC System and Searchable Audit Log Explorer for Study Squads**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Role & Permission Matrix (\`backend/models/SquadMember.js\`)**:
   - Defined roles: \`OWNER\`, \`ADMIN\`, \`MODERATOR\`, \`CONTRIBUTOR\`, \`VIEWER\`.
   - Granular permission flags: \`CAN_EDIT_DECKS\`, \`CAN_DELETE_NOTES\`, \`CAN_INVITE_MEMBERS\`, \`CAN_BAN_MEMBERS\`, \`CAN_VIEW_AUDIT_LOGS\`.
2. **Squad Authorization Middleware (\`backend/middleware/squadAuth.js\`)**:
   - Reusable middleware \`requireSquadPermission(permissionKey)\` for route-level authorization checks.
3. **Audit Log Persistence & Service (\`backend/services/squadAuditService.js\`)**:
   - Captures timestamped events: \`MEMBER_JOINED\`, \`ROLE_CHANGED\`, \`DECK_CREATED\`, \`DECK_MODIFIED\`, \`NOTE_DELETED\`, \`INVITE_REVOKED\`.
4. **REST Endpoints (\`backend/controllers/squadAdminController.js\`)**:
   - \`GET /api/squads/:id/audit-logs\` - Paginated, filterable audit log stream.
   - \`PUT /api/squads/:id/members/:userId/role\` - Updates squad member role with audit logging.

### Frontend Architecture
1. **Squad Member Management Table (\`frontend/src/components/squads/SquadMemberManagement.jsx\`)**:
   - Role dropdowns, permission switches, and member kick/ban dialogs.
2. **Audit Log Timeline Viewer (\`frontend/src/components/squads/SquadAuditLogViewer.jsx\`)**:
   - Filterable chronological feed with search by actor, action type, and date range.

---

## Acceptance Criteria
- [ ] Squad permissions are strictly enforced on backend REST endpoints; unauthorized actions return 403 Forbidden.
- [ ] All critical squad mutations are recorded in audit logs with actor ID, action name, IP, and target metadata.
- [ ] Squad owners and admins can filter and search audit logs effortlessly.
- [ ] Unit tests for permission bitmask verification and audit log recording.`
  },
  {
    number: 570,
    slug: "interactive-3d-molecular-biology-viewer",
    title: "[FEAT]: Interactive 3D Molecular & Biology Structure Viewer with AI Annotation Tooltips",
    labels: ["enhancement", "frontend", "ai", "ui/ux", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Chemistry, Biochemistry, and Medical students preparing for competitive exams (NEET, MCAT, AP Chemistry, Pharmacy boards) need to visualize 3D molecular geometries, protein structures, and chemical conformations. 2D textbook drawings fail to convey spatial chirality, binding pockets, and isomerism.

This feature integrates an **Interactive 3D Molecular & Anatomical Structure Viewer** with AI-generated concept annotations.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D Molecular Canvas Viewer (\`frontend/src/components/science/Molecule3DViewer.jsx\`)**:
   - 3Dmol.js / Three.js canvas rendering for PDB (Protein Data Bank), SDF, and Mol2 file formats.
   - Render styles: Ball-and-Stick, Space-Filling (CPK), Ribbons, Cartoon, and Electrostatic Surface Potential.
   - Interactive mouse controls: 360-degree rotation, zoom, cross-section slicing, and measurement of atom-to-atom distances and bond angles.
2. **AI Interactive Annotation Overlay (\`frontend/src/components/science/StructureAnnotations.jsx\`)**:
   - Clickable hotspots on functional groups (e.g. hydroxyl, carboxyl, active binding sites) displaying concise exam notes.
   - Instant "Explain this functional group" AI tooltip explaining reactivity, acidity, and resonance.

### Backend Architecture
1. **PDB & Chemical Data Proxy (\`backend/services/moleculeService.js\`)**:
   - Proxies and caches standard PDB structure files from RCSB Protein Data Bank and PubChem.
2. **REST Endpoints (\`backend/controllers/moleculeController.js\`)**:
   - \`GET /api/science/structures/:pdbId\` - Retrieves and caches sanitized 3D structure data.
   - \`POST /api/science/explain-structure\` - Returns AI-generated breakdown of key exam highlights for the molecule.

---

## Acceptance Criteria
- [ ] 3D molecular structures load and rotate smoothly at 60 FPS on desktop and mobile browsers.
- [ ] Students can toggle between Ball & Stick, Space Filling, and Ribbon representations.
- [ ] Clicking on atoms/residues shows instant chemical information and AI concept notes.
- [ ] Pre-seeded with 50+ high-yield exam molecules (DNA Double Helix, Hemoglobin, Aspirin, Amino Acids, Glucose).`
  },
  {
    number: 571,
    slug: "db-schema-migration-health-deadlock-monitor",
    title: "[FEAT]: Automated Database Schema Migration Health-Check & Deadlock Monitoring Dashboard",
    labels: ["enhancement", "backend", "database", "devops", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
During high-traffic exam seasons and continuous deployment of new database migrations, database connection pooling issues, table lock contentions, and slow unindexed queries can cause latency spikes and 500 errors across the application.

This feature implements a **Database Health Monitoring & Migration Status Verification Pipeline** for PostgreSQL and SQLite.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Database Health Metrics Collector (\`backend/services/dbHealthService.js\`)**:
   - Checks active vs idle client connections against \`pool.max\` settings.
   - Queries \`pg_stat_activity\` and \`pg_stat_statements\` (on PostgreSQL) to detect queries running longer than 1000ms and active lock waits.
   - Calculates database table bloat and index cache hit ratios ($>99\%$ target).
2. **Migration Verifier (\`backend/services/migrationVerifier.js\`)**:
   - Compares executed migrations in \`SequelizeMeta\` table with local migration files in \`backend/migrations/\` to detect pending or out-of-sync migrations on server boot.
3. **REST Endpoints (\`backend/controllers/dbAdminController.js\`)**:
   - \`GET /api/admin/db/status\` - Secured admin endpoint returning pool statistics, migration sync status, and slow query diagnostics.
   - \`POST /api/admin/db/vacuum-analyze\` - Triggers non-blocking maintenance analyze on high-traffic tables.

---

## Acceptance Criteria
- [ ] Server boot log reports database connection pool health and confirms zero pending migrations.
- [ ] Admin endpoint provides JSON diagnostics of pool saturation, average query latency, and slow query logs.
- [ ] Graceful connection drain handling during SIGTERM server shutdown.
- [ ] Automated Jest tests for connection pooling edge cases and reconnection resilience.`
  },
  {
    number: 572,
    slug: "multi-language-i18n-localization",
    title: "[FEAT]: Multi-Language User Interface Localization (i18n) Supporting 10+ Global & Regional Languages",
    labels: ["enhancement", "frontend", "accessibility", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
OpenPrep AI is used by students worldwide. To democratize education and make exam preparation accessible to non-native English speakers, the entire user interface needs seamless multi-language translation and localization support.

This feature adds a **Complete i18n Localization Architecture with 10+ Language Catalogs** (English, Hindi, Spanish, French, German, Japanese, Arabic, Bengali, Portuguese, Indonesian).

---

## Technical Scope & Architecture

### Frontend Architecture
1. **i18next Core Framework (\`frontend/src/i18n/index.js\`)**:
   - Integrates \`i18next\`, \`react-i18next\`, and \`i18next-browser-languagedetector\`.
   - Lazy-loading translation namespaces for lighter initial bundle size.
   - Number, currency, and date formatting using standard \`Intl.DateTimeFormat\` and \`Intl.NumberFormat\`.
2. **Right-to-Left (RTL) Layout Adaptation (\`frontend/src/styles/rtl.css\`)**:
   - Dynamic document direction switching (\`dir="rtl"\` for Arabic/Hebrew) with inverted margin and padding rules.
3. **Language Switcher Widget (\`frontend/src/components/common/LanguageSelector.jsx\`)**:
   - Header dropdown with country flag icons and native language names (e.g., "English", "हिन्दी", "Español", "العربية").
   - Persists user language preference in \`localStorage\` and backend user profile.

---

## Acceptance Criteria
- [ ] All navigation items, buttons, modal prompts, and quiz runner UI strings translate accurately across selected languages.
- [ ] Switching languages takes effect instantly across all open views without requiring full page reload.
- [ ] RTL layouts render correctly without clipped text or broken responsive alignments.
- [ ] Missing translation fallback gracefully defaults to English with zero runtime crashes.`
  },
  {
    number: 573,
    slug: "ai-subject-weakness-heatmap-daily-recommendation",
    title: "[FEAT]: AI-Driven Subject Weakness Heatmap & Daily Revision Recommendation Engine",
    labels: ["enhancement", "ai", "study-planner", "dashboard", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students preparing for exams often fall into the trap of repeatedly studying topics they already know well while neglecting challenging concepts. Without automated diagnostic feedback, syllabus blind spots remain unaddressed until exam day.

This feature implements an **AI Subject Weakness Heatmap and Intelligent Daily Revision Action Card Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Student Topic Mastery Evaluation Engine (\`backend/services/weaknessEngine.js\`)**:
   - Calculates weighted Mastery Score $M \in [0, 100]$ for each syllabus topic using:
     - Quiz accuracy on topic-specific questions ($40\%$).
     - Spaced repetition retention stability & forgotten card frequency ($30\%$).
     - Days elapsed since last active review ($20\%$).
     - Historical PYQ exam weightage of the chapter ($10\%$).
   - Categorizes topics into **Critical Vulnerability** ($<40\%$), **Moderate** ($40-75\%$), and **Mastered** ($>75\%$).
2. **Daily Action Recommendation Generator**:
   - Generates 3 high-impact daily study targets: e.g., *"Review Organic Chemistry Reaction Mechanisms (Accuracy 32% - High Exam Weightage)"*.
3. **REST Endpoints (\`backend/controllers/weaknessAnalyticsController.js\`)**:
   - \`GET /api/analytics/weakness-heatmap/:subjectId\` - Returns hierarchical topic tree with calculated mastery scores.
   - \`GET /api/analytics/daily-recommendations\` - Returns prioritized action items for the day.

### Frontend Architecture
1. **Interactive Mastery Heatmap Grid (\`frontend/src/components/dashboard/SubjectWeaknessHeatmap.jsx\`)**:
   - Color-coded matrix grid (Red -> Amber -> Green) with chapter breakdown.
   - Hover tooltips showing quiz accuracy stats, cards due, and last studied timestamp.
2. **"Fix My Weaknesses" One-Click Quick Action**:
   - Button that instantly generates a targeted 10-question diagnostic quiz focused exclusively on the student's weakest topics.

---

## Acceptance Criteria
- [ ] Heatmap visualizes student mastery across all enrolled subjects with smooth color transitions.
- [ ] Daily recommendations dynamically update based on new quiz results and flashcard reviews.
- [ ] One-click "Targeted Weakness Quiz" launches seamlessly with topic-specific questions.
- [ ] Unit tests for mastery score weighting formula.`
  },
  {
    number: 574,
    slug: "real-time-study-squad-webrtc-audio-lounge",
    title: "[FEAT]: Real-Time Study Squad Live Audio Lounge with WebRTC Mesh & Active Speaker Highlight",
    labels: ["enhancement", "frontend", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Study Squads thrive on interactive peer accountability and study-with-me co-working sessions. Switching between OpenPrep AI and third-party voice apps (Discord, Google Meet) causes tab clutter and distracts students.

This feature builds a **Native Low-Latency Audio Lounge** embedded directly inside Study Squad rooms using WebRTC mesh networking and WebSocket signaling.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Audio Lounge Control Bar & Dock (\`frontend/src/components/squads/AudioLounge.jsx\`)**:
   - Persistent bottom floating bar with Mute/Unmute microphone, Deafen, Push-to-Talk, and Audio Device Selector (Input/Output).
   - Audio visualizer with animated pulsing glowing avatar ring indicating when a squad member is speaking.
2. **WebRTC Client Connection Manager (\`frontend/src/services/webrtcClient.js\`)**:
   - Peer connection mesh management using \`RTCPeerConnection\`.
   - Audio track gain nodes and Web Audio API \`AnalyserNode\` for local voice activity detection (VAD).

### Backend Architecture
1. **WebRTC Signaling Gateway (\`backend/services/audioSignalingSocket.js\`)**:
   - Handles SDP offer/answer exchanges, ICE candidate relays, and room participant roster events over WebSockets.
   - Room occupancy management (up to 8 concurrent peers per audio lounge).
2. **REST Endpoints**:
   - \`GET /api/squads/:id/audio-status\` - Returns active participants in the audio lounge.

---

## Acceptance Criteria
- [ ] Squad members can join the Audio Lounge and communicate with crystal-clear, low-latency (<150ms) audio.
- [ ] Glowing ring visualizer illuminates around active speakers in real-time.
- [ ] Mute and deafen toggles work instantaneously.
- [ ] Clean peer cleanup when users disconnect or close the tab.`
  },
  {
    number: 575,
    slug: "automated-sentry-error-tracking-telemetry",
    title: "[FEAT]: Automated Sentry Error Tracking & Frontend Breadcrumb Telemetry Integration",
    labels: ["enhancement", "devops", "frontend", "backend", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
In production, unexpected client-side JavaScript crashes and unhandled backend API rejections can disrupt student exam sessions without maintainers being alerted.

This feature integrates **Sentry Error Tracking and Performance Monitoring** across both the React frontend and Express backend.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Sentry React SDK Integration (\`frontend/src/utils/sentry.js\`)**:
   - Initializes \`@sentry/react\` with configurable sample rate, environment tagging, and release versioning.
   - Captures user navigation breadcrumbs and console error logs.
2. **React Error Boundary Component (\`frontend/src/components/common/SentryErrorBoundary.jsx\`)**:
   - Graceful fallback UI when a component throws an error, featuring an "Oops! Something went wrong" modal with a "Reload Page" button and an optional user feedback crash dialog.

### Backend Architecture
1. **Express Sentry Middleware (\`backend/utils/sentry.js\`)**:
   - Configures \`@sentry/node\` and \`@sentry/profiling-node\`.
   - Request handler middleware capturing incoming route context, omitting sensitive headers (Authorization tokens, passwords, cookies).
   - Global error handler middleware dispatching unhandled 500 exceptions directly to Sentry.

---

## Acceptance Criteria
- [ ] Unhandled exceptions in React components and Express routes are reported to Sentry with complete stack traces.
- [ ] Sensitive user data (passwords, JWTs) is automatically sanitized and excluded from error payloads.
- [ ] Error boundary gracefully renders a recovery UI without crashing the entire single-page application.
- [ ] Environment variables \`VITE_SENTRY_DSN\` and \`SENTRY_DSN\` configure logging cleanly.`
  },
  {
    number: 576,
    slug: "adaptive-pomodoro-timer-ambient-audio-lofi",
    title: "[FEAT]: Adaptive Pomodoro Timer with Brain-Wave Ambient Audio & Lofi Focus Backgrounds",
    labels: ["enhancement", "frontend", "ui/ux", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Maintaining sustained focus during multi-hour exam study marathons is difficult. Students benefit from the proven Pomodoro Technique (25m study / 5m break) combined with calming ambient background noise (lofi beats, rain, binaural focus frequencies) to enter deep work states.

This feature adds a **Full-Screen Adaptive Pomodoro Focus Mode with Built-In Ambient Soundscapes**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Focus Mode Timer Overlay (\`frontend/src/components/pomodoro/PomodoroModal.jsx\`)**:
   - Circular countdown progress ring with custom cycle options (25/5 Standard, 50/10 Deep Work, or Custom Intervals).
   - Audio chimes and browser desktop notifications when focus/break sessions complete.
   - Minimalist zen mode hiding all distracting navigation elements.
2. **Web Audio Ambient Synthesizer (\`frontend/src/services/ambientAudioService.js\`)**:
   - Multi-track audio mixer: Rain, Campfire, Coffee Shop, White Noise, Alpha Wave (40Hz Binaural Beat), and Lofi Piano.
   - Independent volume sliders allowing students to create customized ambient sound mixes.
3. **Session Logging & Daily Progress Integration**:
   - Automatically records completed focus intervals and adds tracked study minutes to student daily activity logs.

---

## Acceptance Criteria
- [ ] Timer runs accurately in background tabs without pausing or drifting out of sync.
- [ ] Ambient sound tracks loop seamlessly with smooth fading and individual volume controls.
- [ ] Browser notifications alert students when study/break intervals conclude.
- [ ] Tracked focus time automatically syncs to the user's daily study streak.`
  },
  {
    number: 577,
    slug: "two-way-calendar-sync-google-outlook-ical",
    title: "[FEAT]: Two-Way Calendar Synchronization with Google Calendar, Outlook, and Apple iCal (.ics)",
    labels: ["enhancement", "study-planner", "backend", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students create detailed AI study plans on OpenPrep AI but often miss scheduled milestones because their daily schedules live inside Google Calendar, Microsoft Outlook, or Apple Calendar on their mobile phones.

This feature implements **Two-Way Study Plan Calendar Synchronization and Live iCal (.ics) Webcal Feeds**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **iCalendar (.ics) Feed Generator (\`backend/services/icalService.js\`)**:
   - Generates standardized RFC 5545 \`.ics\` calendar feeds for a student's active study milestones and exam deadlines.
   - Secure unique subscription URL with token authentication allowing one-click subscription in Apple Calendar, Outlook, and Google Calendar.
2. **Google Calendar API Integration (\`backend/services/googleCalendarService.js\`)**:
   - OAuth2 flow for Google Calendar integration.
   - Creates a dedicated "OpenPrep AI Study Plan" sub-calendar and syncs daily study tasks with reminders.
3. **REST Endpoints (\`backend/controllers/calendarSyncController.js\`)**:
   - \`GET /api/calendar/feed/:syncToken/study-plan.ics\` - Public authenticated iCal stream endpoint.
   - \`POST /api/calendar/google/sync\` - Triggers two-way push to connected Google account.

### Frontend Architecture
1. **Calendar Sync Hub (\`frontend/src/components/study-plan/CalendarSyncModal.jsx\`)**:
   - One-click "Add to Google Calendar", "Add to Outlook", and "Copy iCal Feed URL" buttons with step-by-step setup guides.

---

## Acceptance Criteria
- [ ] Study plan goals and exam countdown dates export accurately to \`.ics\` calendar feeds.
- [ ] Google Calendar integration pushes study events with proper start times, titles, and descriptions.
- [ ] Modifying a study plan task updates the synced calendar feed automatically.
- [ ] Unit tests for iCal formatting and timezone offset handling.`
  },
  {
    number: 578,
    slug: "ai-distractor-quality-evaluator-plausibility-scorer",
    title: "[FEAT]: AI Distractor Quality Evaluator & Plausibility Scorer for Multiple-Choice Questions",
    labels: ["enhancement", "ai", "quiz-system", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
When generating multiple-choice quizzes, low-quality AI prompts often produce trivial or absurd wrong answer choices ("distractors"). Obvious giveaways allow students to guess the correct answer by elimination without mastering the underlying concept.

This feature implements an **Automated Distractor Quality Evaluator & Plausibility Scorer** for the quiz generation pipeline.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Distractor Evaluation Engine (\`backend/services/distractorEvaluator.js\`)**:
   - Evaluates each multiple-choice question against psychometric exam standards:
     - **Option Length Symmetry**: Ensures the correct answer is not disproportionately longer or more detailed than distractors.
     - **Semantic Plausibility**: Computes semantic embedding similarity between question stem and options to ensure all distractors represent common student misconceptions.
     - **Absoluteness Detection**: Flags extreme distractor keywords ("always", "never", "all of the above") that signal weak questions.
2. **Automatic Regeneration Loop**:
   - If a generated question fails quality scoring (Plausibility Index $< 0.75$), the pipeline automatically requests Gemini to replace the weak distractors with plausible alternatives.
3. **Admin Diagnostic View**:
   - Returns distractor quality metrics in quiz generation debug payloads.

---

## Acceptance Criteria
- [ ] All AI-generated quiz questions pass automated distractor plausibility validation before being presented to users.
- [ ] Distractor options exhibit balanced lengths and avoid giveaway phrasing.
- [ ] System automatically regenerates low-scoring distractors with zero user interruption.
- [ ] Unit tests covering distractor symmetry, similarity scoring, and keyword heuristics.`
  },
  {
    number: 579,
    slug: "gamified-streak-freeze-xp-reward-chests",
    title: "[FEAT]: Gamified Streak Freeze Inventory, XP Reward Chests & Unlockable Avatar Cosmetics",
    labels: ["enhancement", "gamification", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Habit building requires both positive reinforcement and forgiveness mechanisms. When students inevitably face emergencies or travel and break a 30-day streak, the abrupt loss of progress can be demotivating.

This feature introduces a **Gamified PrepCoin Economy, Streak Freeze Inventory, and XP Mystery Chest Unboxing System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Gamification & Rewards Engine (\`backend/services/gamificationService.js\`)**:
   - Awards PrepCoins upon completing daily goals, scoring $>80\%$ on quizzes, and reviewing due flashcards.
   - Manages user inventory (Streak Freezes, 2x XP Boosters, Custom Avatar Frames).
   - Automated Streak Maintenance Cron: When a student misses a calendar day, consumes 1 available Streak Freeze instead of resetting the streak counter to zero.
2. **REST Endpoints (\`backend/controllers/gamificationController.js\`)**:
   - \`GET /api/gamification/inventory\` - Retrieves user balances, active freezes, and owned cosmetics.
   - \`POST /api/gamification/shop/buy\` - Purchases inventory items using earned PrepCoins.
   - \`POST /api/gamification/chest/open\` - Unlocks a mystery chest and returns randomized XP or cosmetic loot.

### Frontend Architecture
1. **Rewards & Shop View (\`frontend/src/components/gamification/RewardsShop.jsx\`)**:
   - Storefront displaying item prices, current PrepCoin balance, and active booster timers.
2. **3D Mystery Chest Unboxing Animation (\`frontend/src/components/gamification/ChestUnboxingModal.jsx\`)**:
   - CSS 3D transform chest-shake and gold sparkle particle animation upon opening rewards.

---

## Acceptance Criteria
- [ ] Streak Freeze automatically preserves a student's streak if they miss a single day, provided they hold a freeze in inventory.
- [ ] PrepCoins are earned reliably through quizzes and flashcards without exploit vulnerabilities.
- [ ] Chest opening animations render smoothly with confetti and particle effects.
- [ ] Unit tests for streak freeze auto-consumption and inventory transaction safety.`
  },
  {
    number: 580,
    slug: "ocr-hand-drawn-diagram-handwritten-formula-solver",
    title: "[FEAT]: Optical Character Recognition (OCR) Hand-Drawn Diagram & Handwritten Formula Solver",
    labels: ["enhancement", "ai", "pyq-analysis", "frontend", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Students often take photos of handwritten lecture notes, whiteboard sketches, and printed textbook diagrams with their smartphones. Standard text-only OCR struggles to parse multi-line algebraic fractions, organic chemistry benzene rings, and circuit schematics.

This feature implements a **Multimodal OCR Diagram & Handwritten Math Solver** capable of transcribing handwritten STEM notes directly into formatted LaTeX and editable flashcards.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Image Capture & Cropper Canvas (\`frontend/src/components/ocr/DiagramImageCropper.jsx\`)**:
   - Drag-and-drop image uploader with camera capture support on mobile.
   - Interactive bounding-box cropper with contrast, brightness, and perspective-correction filters to enhance faint pencil handwriting.
2. **OCR Result Reviewer & LaTeX Editor (\`frontend/src/components/ocr/OcrResultViewer.jsx\`)**:
   - Split-screen comparison: Original handwritten image on left, extracted LaTeX and rendered KaTeX formula on right.
   - "Add to Flashcards" or "Solve with AI" direct action buttons.

### Backend Architecture
1. **Multimodal OCR Processing Pipeline (\`backend/services/multimodalOcrService.js\`)**:
   - Image pre-processing via \`sharp\` (grayscale conversion, adaptive threshold binarization, noise reduction).
   - Google Gemini 1.5 Pro Multimodal Vision API ingestion with specialized prompt engineering for mathematical syntax and scientific diagrams.
2. **REST Endpoints (\`backend/controllers/ocrController.js\`)**:
   - \`POST /api/ocr/parse-diagram\` - Ingests multipart image; returns transcribed LaTeX, step-by-step solution, and concept tags.

---

## Acceptance Criteria
- [ ] Accurately transcribes complex handwritten math formulas (integrals, Greek symbols, matrices) into valid LaTeX.
- [ ] Image cropper provides intuitive touch controls for selecting specific regions of a textbook page.
- [ ] Users can convert extracted formula cards directly into flashcard decks with one click.
- [ ] Integration tests verify image resizing, MIME type validation, and error handling for blurry images.`
  },
  {
    number: 581,
    slug: "prometheus-telemetry-metrics-grafana-telemetry",
    title: "[FEAT]: Prometheus Telemetry Metrics Exporter & Grafana Dashboard for API Latency & AI Token Counts",
    labels: ["enhancement", "devops", "backend", "infrastructure", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
To maintain 99.9% uptime during peak exam hours and optimize operational costs, engineering maintainers need real-time visibility into server CPU/RAM usage, API endpoint latencies, database query times, and upstream AI token expenditures.

This feature sets up a **Prometheus Metrics Exporter and Ready-to-Import Grafana Telemetry Dashboard**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Prometheus Metrics Middleware (\`backend/services/metricsService.js\`)**:
   - Uses \`prom-client\` to track core telemetry metrics:
     - \`http_request_duration_seconds\`: Histogram of response latencies bucketed by route and status code.
     - \`http_requests_total\`: Counter of total HTTP requests labeled by method, path, and HTTP status.
     - \`db_query_duration_seconds\`: Histogram of database execution times.
     - \`ai_tokens_consumed_total\`: Counter of input/output tokens used across Gemini models.
     - \`active_websocket_connections\`: Gauge tracking live connected study squad sockets.
2. **Secured Metrics Endpoint**:
   - \`GET /metrics\` - Exposes standard Prometheus scrape format, secured via internal Bearer token / IP whitelist.
3. **Grafana Dashboard JSON Specification (\`docs/telemetry/grafana-openprep-dashboard.json\`)**:
   - Pre-configured dashboard panels for P95/P99 latency, requests per second (RPS), error rates ($4xx/5xx$), and AI cost estimations.

---

## Acceptance Criteria
- [ ] \`/metrics\` endpoint exposes Prometheus-formatted gauges, counters, and histograms with sub-1ms overhead.
- [ ] AI token consumption is tracked accurately per endpoint and model.
- [ ] Grafana JSON dashboard imports smoothly and visualizes API traffic in real-time.
- [ ] Unit tests confirm metrics counters increment correctly across HTTP request lifecycles.`
  },
  {
    number: 582,
    slug: "wcag-accessibility-high-contrast-keyboard-traps",
    title: "[FEAT]: WCAG 2.1 AAA Accessibility Overhaul: High-Contrast Theme, Keyboard Traps & Screen Reader Live Regions",
    labels: ["enhancement", "accessibility", "ui/ux", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Education must be accessible to all students, including those with visual impairments, motor disabilities, or situational constraints. All student-facing flows in OpenPrep AI should meet WCAG 2.1 Level AAA standards.

This feature performs a comprehensive **Accessibility (a11y) Overhaul with High-Contrast Themes, Full Keyboard Navigation, and Screen Reader Optimization**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Focus Trap & Keyboard Navigation (\`frontend/src/hooks/useFocusTrap.js\`)**:
   - Ensures all modals, dropdowns, and quiz dialogs trap focus correctly and release upon pressing \`Escape\`.
   - Full keyboard shortcuts across platform: \`Alt + Q\` (Next Question), \`Alt + F\` (Flip Flashcard), \`Space\` (Mark Known), \`/\` (Global Search).
   - Visible high-contrast focus rings (\`:focus-visible\`) with customized outline offsets.
2. **Screen Reader ARIA Live Regions (\`frontend/src/components/common/AriaAnnouncer.jsx\`)**:
   - \`aria-live="polite"\` announcements for dynamic countdown timer ticks, quiz score updates, and live squad notifications.
   - Proper \`aria-expanded\`, \`aria-controls\`, and \`aria-describedby\` attributes on all interactive elements.
3. **High-Contrast & OLED Black Theme**:
   - 7:1 minimum contrast ratio across all text and icons compliant with WCAG AAA.

---

## Acceptance Criteria
- [ ] 100% of platform flows (Registration, Quiz Runner, Flashcards, Study Planner) are fully navigable via keyboard alone.
- [ ] Screen readers (NVDA, VoiceOver, JAWS) announce dynamic updates clearly without duplicate chatter.
- [ ] Zero critical or serious accessibility violations reported by automated \`axe-core\` test runs.
- [ ] High-contrast mode toggle available in user accessibility settings.`
  },
  {
    number: 583,
    slug: "omr-bubble-sheet-pdf-qr-verification",
    title: "[FEAT]: Automated PDF Exam Answer Sheet Generator with OMR Bubble Sheet & QR Code Verification",
    labels: ["enhancement", "backend", "quiz-system", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Many major competitive examinations (UPSC, SAT, NEET, GRE) are administered on physical Optical Mark Recognition (OMR) bubble sheets. Students preparing digitally often struggle with physical time-management and bubbling accuracy on real exam day.

This feature implements an **Automated OMR Bubble Sheet PDF Generator with Question QR Code Integration**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **OMR Sheet Layout Generator (\`backend/services/omrPdfService.js\`)**:
   - Generates standardized printable A4 PDF bubble sheets corresponding to any generated quiz.
   - Grid layout of numbered bubbles (A, B, C, D) with alignment corner marks for future scanner evaluation.
   - Injects student ID, exam code, and dynamic verification QR code containing encrypted quiz metadata.
2. **REST Endpoints (\`backend/controllers/omrController.js\`)**:
   - \`GET /api/quizzes/:id/omr-sheet.pdf\` - Generates and streams printable OMR bubble sheet.
   - \`GET /api/quizzes/:id/answer-key.pdf\` - Generates printable examiner answer key with colored correct bubble markers and detailed solutions.

### Frontend Architecture
1. **Quiz Print & OMR Modal (\`frontend/src/components/quiz/OmrPrintModal.jsx\`)**:
   - Allows students to select "Print Offline Exam Package" (Question Booklet + OMR Bubble Sheet + Answer Key).

---

## Acceptance Criteria
- [ ] Generates crisp, perfectly aligned A4 OMR bubble sheets suitable for home/office printing.
- [ ] Number of bubble rows matches the exact question count of the generated quiz.
- [ ] QR code on the header scans instantly and links directly to the digital quiz on OpenPrep AI.
- [ ] Unit tests for PDF layout coordinate precision and bounding box alignments.`
  },
  {
    number: 584,
    slug: "peer-study-bounty-board-verified-solution-upvoting",
    title: "[FEAT]: Interactive Peer-to-Peer Study Bounty Board & Verified Community Solution Upvoting",
    labels: ["enhancement", "community", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
When students encounter exceptionally difficult past-year exam questions or proof-based problems that automated AI answers don't fully explain, they benefit from human peer explanations. A bounty board incentivizes top students to post detailed step-by-step solutions in exchange for XP and badges.

This feature introduces a **Peer-to-Peer Question Bounty Board with Community Solution Upvoting & Escrow**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Bounty & Solution Model (\`backend/models/BountyQuestion.js\`, \`backend/models/BountyAnswer.js\`)**:
   - Tracks question title, problem LaTeX, attached diagrams, bounty XP amount, expiration date, and status (\`OPEN\`, \`SOLVED\`, \`EXPIRED\`).
2. **XP Escrow Transaction Handler (\`backend/services/bountyEscrowService.js\`)**:
   - Holds offered bounty XP in escrow upon question posting; transfers reward to the author of the accepted solution.
   - Automated upvoting reputation algorithm: Top-upvoted solutions get pinned; downvoted spam answers are flagged for squad moderators.
3. **REST Endpoints (\`backend/controllers/bountyController.js\`)**:
   - \`GET /api/bounties\` - Filterable list of active bounties by subject and XP value.
   - \`POST /api/bounties\` - Creates a new bounty with XP escrow deduction.
   - \`POST /api/bounties/:id/answers\` - Submits a peer solution.
   - \`PUT /api/bounties/:id/accept/:answerId\` - Accepts solution and disburses escrowed XP.

### Frontend Architecture
1. **Bounty Board Hub (\`frontend/src/components/community/BountyBoard.jsx\`)**:
   - Filter by: "Highest Bounty", "Unanswered", "Subject Tag", "Expiring Soon".
2. **Rich Solution Editor with Markdown & KaTeX Preview**:
   - Full math and code formatting support for posting mathematical proofs and code explanations.

---

## Acceptance Criteria
- [ ] Students can post question bounties with XP escrow deducted safely from their balance.
- [ ] Peers can post rich markdown/LaTeX solutions and upvote helpful answers.
- [ ] Accepting a solution awards escrowed XP and marks the bounty as solved.
- [ ] Concurrency-safe transactions prevent duplicate XP payouts.`
  },
  {
    number: 585,
    slug: "automated-visual-regression-testing-playwright",
    title: "[FEAT]: Automated End-to-End Visual Regression Testing Suite Using Playwright & Percy/Pixelmatch",
    labels: ["enhancement", "devops", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As new UI components, dark theme tweaks, and responsive layouts are contributed across different pull requests, unintended CSS regressions (broken margins, overlapping text, color contrast glitches) can slip into production without automated visual comparison.

This feature establishes an **Automated Visual Regression Testing Pipeline in CI/CD using Playwright and Pixelmatch**.

---

## Technical Scope & Architecture

### Test Automation Architecture
1. **Visual Snapshot Test Suite (\`tests/visual/visual-regression.spec.js\`)**:
   - Captures baseline screenshots across key viewports (Mobile: 375x812, Tablet: 768x1024, Desktop: 1440x900).
   - Test targets:
     - Dashboard Analytics & Heatmap widgets.
     - Quiz Runner & Question Palette in Light & Dark modes.
     - Flashcard 3D flip card animations.
     - Study Squad Whiteboard canvas.
2. **Pixel-by-Pixel Diff Comparison Engine**:
   - Compares pull request visual captures against golden baseline snapshots with a configurable threshold tolerance ($<0.2\%$ mismatch).
   - Generates visual side-by-side diff artifacts highlighting altered pixels in magenta.
3. **GitHub Actions Workflow (\`.github/workflows/visual-regression.yml\`)**:
   - Runs automatically on pull requests targeting \`main\`; uploads visual diff report artifacts when mismatches occur.

---

## Acceptance Criteria
- [ ] Playwright visual test suite covers primary views across desktop and mobile viewports.
- [ ] Generates clear visual diff artifacts whenever unintended styling changes occur.
- [ ] Workflow runs deterministically in headless CI with consistent font rendering.
- [ ] Developer guide in \`docs/visual-testing.md\` explaining how to update baseline snapshots.`
  }
];

// Verify repository labels before creation
let validRepoLabels = [];
try {
  const labelsJson = execSync('gh label list --json name --limit 200', { encoding: 'utf8' });
  validRepoLabels = JSON.parse(labelsJson).map(l => l.name);
} catch (e) {
  console.warn('Warning: Could not fetch GitHub labels via CLI:', e.message);
}

function ensureLabel(name) {
  const matched = validRepoLabels.find(vl => vl.toLowerCase() === name.toLowerCase());
  if (matched) return matched;

  try {
    console.log(`Creating missing label on GitHub: "${name}"`);
    execSync(`gh label create "${name}" --color "a2eeef" --description "${name} related tasks"`, { stdio: 'ignore' });
    validRepoLabels.push(name);
    return name;
  } catch (err) {
    return null;
  }
}

// Fetch existing issue titles to avoid duplicate creations
let existingTitles = [];
try {
  const issuesJson = execSync('gh issue list --limit 500 --state all --json title', { encoding: 'utf8' });
  existingTitles = JSON.parse(issuesJson).map(i => i.title.toLowerCase().trim());
} catch (e) {
  console.warn('Warning: Could not fetch existing issues:', e.message);
}

console.log(`Starting publication of ${curatedIssues.length} high-quality GitHub issues...`);
console.log(`================================================================================`);

let createdCount = 0;
let skippedCount = 0;

for (let i = 0; i < curatedIssues.length; i++) {
  const item = curatedIssues[i];
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

  console.log(`[${i + 1}/${curatedIssues.length}] Creating GitHub Issue: "${item.title}"`);
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
console.log(`- Total Processed: ${curatedIssues.length}`);
console.log(`- Newly Created on GitHub: ${createdCount}`);
console.log(`- Already Existing (Skipped): ${skippedCount}`);
console.log(`================================================================================`);
