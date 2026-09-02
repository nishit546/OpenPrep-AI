const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const issuesDir = path.join(__dirname, '..', 'issues');
if (!fs.existsSync(issuesDir)) {
  fs.mkdirSync(issuesDir, { recursive: true });
}

const newIssues = [
  {
    number: 536,
    slug: "audio-active-recall-voice-pitch-speed",
    title: "[FEAT]: Adaptive Spaced-Repetition Active Recall Audio Mode with Voice Pitch & Speed Controls",
    labels: ["enhancement", "flashcards", "ai", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students studying on the go (commuting, walking, or resting their eyes) need hands-free audio review capabilities. Currently, flashcards in OpenPrep AI require active touch and visual reading on screen.

This feature implements an **Adaptive Spaced-Repetition Active Recall Audio Mode** featuring dynamic Web Speech API / TTS synthesis, customizable playback speeds (0.75x to 2.5x), audio pitch modulation, and optional voice-driven answer evaluation.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Audio Flashcard Player Engine (\`frontend/src/components/flashcards/AudioFlashcardPlayer.jsx\`)**:
   - Web Speech Synthesis API (\`window.speechSynthesis\`) integration with voice selector (natural sounding localized accents).
   - Audio controller widget with Play, Pause, Skip, Replay Question, and Speed/Pitch sliders.
   - Configurable pause intervals between question readout and answer revelation to allow active mental recall.
2. **Speech Recognition Input Mode (\`frontend/src/components/flashcards/VoiceAnswerRecognizer.jsx\`)**:
   - Web Speech Recognition API (\`webkitSpeechRecognition\`) allowing students to speak their answers.
   - Real-time confidence matching against flashcard back text using fuzzy Levenshtein distance.
3. **Hands-Free Commuter Control Overlay**:
   - Fullscreen minimal UI with large gesture zones (single tap: pause/play, swipe right: mark remembered, swipe left: mark review).

### Backend Architecture
1. **Audio Preferences Persistence**:
   - Persist user audio speed, default voice ID, and auto-advance delay in \`UserSettings\`.
2. **REST Endpoints**:
   - \`PUT /api/users/preferences/audio\` - Updates user TTS speed, pitch, and voice configuration.

---

## Acceptance Criteria
- [ ] Students can trigger "Audio Mode" for any flashcard deck with automatic question-answer speech playback.
- [ ] Users can adjust playback speed from 0.75x to 2.5x and pitch smoothly without audio distortion.
- [ ] Voice input mode captures student verbal responses and computes accuracy percentage.
- [ ] Fully responsive and works smoothly on mobile browsers with background audio session lock.`
  },
  {
    number: 537,
    slug: "ai-multi-doc-pyq-matrix-overlap-analyzer",
    title: "[FEAT]: AI-Powered Multi-Doc Question Paper Matrix & Comparative Overlap Analyzer",
    labels: ["enhancement", "pyq-analysis", "ai", "backend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
When preparing for competitive examinations (JEE, NEET, GATE, UPSC, GRE), analyzing single past-year question papers in isolation gives limited perspective. Students need a multi-year comparative matrix to spot question repetition trends, shifting topic weightages, and emerging exam patterns over time.

This feature implements an **AI-Powered Multi-Doc Question Paper Matrix & Comparative Overlap Analyzer**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Multi-Doc Comparative Embedding Pipeline (\`backend/services/pyqMatrixService.js\`)**:
   - Ingests multiple parsed PYQ documents (up to 10 years / exam shifts).
   - Generates vector semantic embeddings for question stems and calculates cosine similarity clusters across years.
   - Categorizes recurring questions into: Exact Repeats, Conceptually Identical (parameter changes), and High-Probability Variant Patterns.
2. **Shift Weightage & Trend Delta Calculation**:
   - Aggregates topic distribution percentages across successive years and computes year-over-year momentum scores (+/- %).
3. **REST Endpoints**:
   - \`POST /api/pyq/matrix-analysis\` - Ingests array of PYQ IDs and initiates multi-document comparative clustering.
   - \`GET /api/pyq/matrix-analysis/:id\` - Retrieves topic overlap heatmaps, recurring concept clusters, and predicted weightages.

### Frontend Architecture
1. **Interactive Multi-Year Comparison Heatmap (\`frontend/src/components/pyq/PYQMatrixHeatmap.jsx\`)**:
   - Interactive matrix table showing Topics on Y-axis and Exam Years/Shifts on X-axis with color-intensity cells representing frequency.
2. **Recurring Concept Cluster Visualizer (\`frontend/src/components/pyq/RecurringConceptClusters.jsx\`)**:
   - Expandable card groups displaying similar questions asked in 2019, 2021, 2024 with side-by-side solution diffs.

---

## Acceptance Criteria
- [ ] Users can select multiple PYQ exam papers to generate a comparative cross-year matrix.
- [ ] Accurately identifies semantically similar and recurring questions across past examination papers.
- [ ] Heatmap visualizes year-over-year topic weightage trends with filterable difficulty thresholds.`
  },
  {
    number: 538,
    slug: "real-time-collaborative-mindmap-formula-sandbox",
    title: "[FEAT]: Real-Time Multi-User Collaborative Mindmap & Formula Sandbox for Study Squads",
    labels: ["enhancement", "frontend", "ui/ux", "community", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Study squads need interactive visual spaces to co-create revision mindmaps, link interdisciplinary concepts, and construct shared formula cheat-sheets in real time during group study sessions.

This feature builds a **Real-Time Collaborative Mindmap & Formula Sandbox Engine** integrated into Study Squad rooms.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Dynamic Node Tree Canvas (\`frontend/src/components/mindmap/CollaborativeMindmap.jsx\`)**:
   - SVG/HTML5 canvas with interactive force-directed or tree-layout nodes.
   - Node styling: Custom colors, icons, LaTeX equation rendering (KaTeX), markdown formatted notes, and thumbnail links.
   - Multi-cursor presence showing each squad member's avatar and selection state.
2. **Formula Sandbox & Quick LaTeX Pallet (\`frontend/src/components/mindmap/FormulaPaletteModal.jsx\`)**:
   - Visual formula builder with clickable math symbols (integrals, fractions, matrices, Greek symbols) that automatically inserts KaTeX blocks into mindmap nodes.
3. **One-Click Flashcard Deck Generator**:
   - Button to convert any node branch into a structured OpenPrep flashcard deck.

### Backend Architecture
1. **WebSocket Mindmap Sync Service (\`backend/services/mindmapSocketService.js\`)**:
   - Broadcasts node additions, moves, edits, and connector links with debounced snapshot persistence.
2. **REST Endpoints**:
   - \`GET /api/squads/:squadId/mindmaps\` - Retrieves saved mindmap canvas states.
   - \`POST /api/squads/:squadId/mindmaps\` - Creates a new squad mindmap.
   - \`PUT /api/mindmaps/:id\` - Updates serialized node tree state.

---

## Acceptance Criteria
- [ ] Multiple users in a squad can edit nodes, add branches, and link topics simultaneously.
- [ ] KaTeX formulas render sharply within mindmap nodes and update in real time across clients.
- [ ] Squad mindmap can be exported to PNG, SVG, PDF, or converted to a flashcard deck.`
  },
  {
    number: 539,
    slug: "flashcard-auto-tagging-knowledge-graph-explorer",
    title: "[FEAT]: AI Flashcard Deck Auto-Tagging, Taxonomy Clustering & Knowledge Graph Explorer",
    labels: ["enhancement", "flashcards", "ai", "frontend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As students accumulate hundreds of flashcards across subjects, decks become disorganized and siloed. Students struggle to see how concepts in one subject (e.g. Calculus) relate to topics in another (e.g. Physics Mechanics).

This feature implements an **AI Auto-Tagging Engine & Interactive Knowledge Graph Explorer** for student flashcards.

---

## Technical Scope & Architecture

### Backend Architecture
1. **AI Taxonomy Clustering Service (\`backend/services/flashcardTaxonomyService.js\`)**:
   - Analyzes flashcard prompts and answers using Gemini API to extract hierarchical domain tags (e.g., \`STEM > Physics > Electromagnetism > Gauss's Law\`).
   - Identifies prerequisite links between concepts (e.g., "Vector Calculus" is a prerequisite for "Maxwell's Equations").
2. **Knowledge Graph Graph Data Serializer**:
   - Generates node-link JSON datasets representing concept clusters, connection strengths, and mastery colors.
3. **REST Endpoints**:
   - \`POST /api/flashcards/auto-tag\` - Batches untagged cards and applies structured taxonomy tags.
   - \`GET /api/flashcards/knowledge-graph\` - Returns aggregated concept graph for current user.

### Frontend Architecture
1. **Interactive Force-Directed Knowledge Graph (\`frontend/src/components/flashcards/KnowledgeGraphViewer.jsx\`)**:
   - D3.js or Force-Graph 2D/3D visualization with zoomable nodes sized by card count and colored by SM-2 retention score.
   - Clicking a node filters the deck list to that concept cluster.

---

## Acceptance Criteria
- [ ] AI automatically categorizes and tags flashcards with hierarchical subject tags upon creation.
- [ ] Knowledge graph displays interactive nodes showing concept connectivity and student mastery state.
- [ ] Filtering or clicking nodes instantly pulls up corresponding flashcards for focused review.`
  },
  {
    number: 540,
    slug: "exam-countdown-velocity-meter-daily-hours-calculator",
    title: "[FEAT]: Real-Time Exam Countdown Velocity Meter & Daily Target Hours Calculator",
    labels: ["enhancement", "study-planner", "dashboard", "frontend", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Students preparing for milestone examinations often experience anxiety because they do not know whether their current daily study hours are sufficient to cover the remaining syllabus before exam day.

This feature adds a **Real-Time Exam Countdown Velocity Meter & Daily Target Hours Calculator** to the OpenPrep AI dashboard.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Live Exam Countdown Tile (\`frontend/src/components/dashboard/ExamCountdownCard.jsx\`)**:
   - Animated countdown clock showing Days, Hours, Minutes, and Seconds until target exam date.
   - Configurable milestone dates for multiple target exams (e.g. Mains, Advanced, Mock Series).
2. **Velocity & Required Daily Hours Meter (\`frontend/src/components/dashboard/StudyVelocityMeter.jsx\`)**:
   - Gauge visualization displaying:
     - **Current Velocity**: Average hours logged per day over the past 14 days.
     - **Required Velocity**: Dynamic calculation of required hours/day to complete unmastered topics.
     - **Pace Status**: "On Track" (Green), "Moderate Risk" (Amber), or "Critical Pace Deficit" (Red).
3. **Adjustable Study Pace Simulator**:
   - Interactive slider allowing students to simulate: "If I study 4 hrs/day instead of 2 hrs/day, when will I finish syllabus revision?"

### Backend Architecture
1. **Velocity Calculation Logic (\`backend/services/studyVelocityService.js\`)**:
   - Computes syllabus completion velocity based on topic estimated durations, difficulty ratings, and logged study session times.
2. **REST Endpoints**:
   - \`GET /api/study-planner/velocity-summary\` - Returns current velocity, required velocity, and target milestones.

---

## Acceptance Criteria
- [ ] Live countdown displays accurate remaining time to user's specified exam date.
- [ ] Dynamically calculates required study hours/day based on remaining uncompleted syllabus items.
- [ ] Interactive simulator updates projected completion date in real time when slider is adjusted.`
  },
  {
    number: 541,
    slug: "automated-pdf-exam-sheet-watermark-qr-export",
    title: "[FEAT]: Automated PDF Exam Sheet Watermarking, Digital Rights & PDF Export Layout Optimizer",
    labels: ["enhancement", "backend", "study-planner", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Educators and students frequently generate PDF question sheets and revision summaries for offline printouts. Without proper formatting, printouts suffer from awkward page breaks, overflowing equations, and lack of attribution/security watermarks.

This feature implements an **Automated PDF Exam Sheet Watermarking, Digital Rights & Print Layout Optimizer**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **PDF Generation & Formatting Pipeline (\`backend/services/pdfExportService.js\`)**:
   - Utilizes \`pdfkit\` / \`puppeteer-core\` with print stylesheet CSS optimizations (\`@media print\`, \`page-break-inside: avoid\`).
   - Renders LaTeX equations cleanly into vector PDF curves.
2. **Dynamic Watermarking & QR Verification (\`backend/services/watermarkService.js\`)**:
   - Generates subtle diagonal semi-transparent watermarks containing student name, organization/institution, and export timestamp.
   - Embeds a dynamic QR code on the footer of every page linking directly to the live digital solution and interactive quiz on OpenPrep AI.
3. **REST Endpoints**:
   - \`POST /api/export/exam-pdf\` - Ingests quiz ID / revision note ID with customizable layout parameters (Font size, 2-column compact layout, watermark text).

### Frontend Architecture
1. **Print Preview & Export Modal (\`frontend/src/components/export/PdfExportModal.jsx\`)**:
   - Interactive preview showing exact page layout, toggle for Answer Key inclusion, watermark preferences, and QR code placement.

---

## Acceptance Criteria
- [ ] Generates clean, publication-quality 1-column or 2-column PDF sheets without broken question layouts.
- [ ] Embedded QR codes link directly to corresponding OpenPrep online quiz/answers.
- [ ] Watermark text and branding render crisp and semi-transparent across all PDF pages.`
  },
  {
    number: 542,
    slug: "socratic-ai-tutor-live-voice-dialogue-hint-cards",
    title: "[FEAT]: Socratic AI Tutor Live Voice Dialogue Interface with Speech-to-Text & Instant Visual Hint Cards",
    labels: ["enhancement", "ai", "quiz-system", "frontend", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
When students get stuck on difficult questions during practice, giving away direct answers prevents deep learning. A Socratic tutoring model that asks guiding questions and provides tiered hints helps students reach the solution independently.

This feature implements a **Socratic AI Tutor Live Voice Dialogue Interface with Instant Visual Hint Cards**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Socratic Dialogue Engine (\`backend/services/socraticTutorService.js\`)**:
   - Multi-turn conversational prompt orchestration with Gemini API enforcing Socratic pedagogical rules (never reveal answer outright; diagnose misconception; provide Level 1: Conceptual clue, Level 2: Formula hint, Level 3: Step-by-step breakdown).
2. **Contextual Knowledge Injection**:
   - Feeds question stem, options, subject syllabus context, and student's prior incorrect attempts into the prompt payload.
3. **REST Endpoints**:
   - \`POST /api/tutor/socratic-hint\` - Ingests current question state and student voice/text prompt, returning next Socratic guidance step.

### Frontend Architecture
1. **Interactive Tutor Floating Drawer (\`frontend/src/components/quiz/SocraticTutorDrawer.jsx\`)**:
   - Slide-out tutor chat interface with voice speech input and audio voice-back.
   - Tiered "Hint Cards" that unlock progressively on request.
2. **Formula & Diagram Callout Chips**:
   - Displays relevant formula flashchips alongside tutor dialogue when mathematical concepts are referenced.

---

## Acceptance Criteria
- [ ] Socratic tutor guides students without leaking the correct option answer.
- [ ] Supports real-time speech input and natural audio response playback.
- [ ] Tiered hint cards reveal progressive levels of assistance based on student request.`
  },
  {
    number: 543,
    slug: "cross-platform-dark-mode-oled-wcag-aaa",
    title: "[FEAT]: Cross-Platform Dark Mode Contrast Engine with Solarized & OLED Themes (WCAG AAA Compliance)",
    labels: ["enhancement", "ui/ux", "accessibility", "frontend", "good first issue", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Students study for long hours at night and on various devices (OLED mobile screens, laptops in dark rooms). Standard dark themes can suffer from low contrast ratios, causing eye strain and failing accessibility standards.

This feature introduces a **Cross-Platform Dark Mode Contrast Engine with Solarized, Midnight OLED, and High-Contrast WCAG 2.1 AAA Accessibility Themes**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Theme Design System Tokens (\`frontend/src/styles/themeTokens.css\`)**:
   - CSS Custom Properties (\`--bg-canvas\`, \`--text-primary\`, \`--border-subtle\`, \`--accent-glow\`) with 5 curated color schemes:
     - **Light Aurora**: Clean daylight study mode.
     - **Dark Slate**: Standard balanced dark mode.
     - **Midnight OLED**: True pure black (\`#000000\`) for battery savings and high contrast on OLED screens.
     - **Solarized Warm**: Amber sepia tone designed for circadian eye comfort during late-night cram sessions.
     - **High-Contrast AAA**: 7:1 minimum contrast ratio compliant with WCAG 2.1 AAA standards.
2. **Theme Switcher & Quick Keybinding (\`frontend/src/components/common/ThemeSelector.jsx\`)**:
   - Smooth CSS color transitions without flashing (FOUC).
   - Global shortcut (\`Ctrl/Cmd + Shift + T\`) to cycle themes.
   - System preference sync (\`prefers-color-scheme: dark\`) with local storage fallback.

---

## Acceptance Criteria
- [ ] Supports seamless switching between Light, Dark Slate, OLED Midnight, Solarized Warm, and High-Contrast AAA.
- [ ] Zero page flicker (FOUC) on page reload.
- [ ] Complies with WCAG 2.1 AAA contrast requirements on text and interactive elements.`
  },
  {
    number: 544,
    slug: "multi-language-interface-i18n-localization",
    title: "[FEAT]: Multi-Language Interface Localization (i18n) Supporting Hindi, Spanish, French & German",
    labels: ["enhancement", "frontend", "ui/ux", "good first issue", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
OpenPrep AI serves diverse students worldwide, including non-native English speakers taking bilingual national competitive entrance exams. Navigating UI menus, analytics labels, and study planners in their native language significantly improves usability.

This feature implements **Full Multi-Language Interface Localization (i18n)** with initial support for Hindi, Spanish, French, German, and English.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **i18next Framework Setup (\`frontend/src/i18n/index.js\`)**:
   - Configures \`react-i18next\` with lazy-loaded translation JSON namespace bundles (\`common.json\`, \`quiz.json\`, \`flashcards.json\`, \`dashboard.json\`, \`auth.json\`).
2. **Language Selector Component (\`frontend/src/components/common/LanguageSelector.jsx\`)**:
   - Dropdown in navbar and footer with country flags and native script names (e.g., "English", "हिन्दी", "Español", "Français", "Deutsch").
3. **Localized DateTime & Number Formatting**:
   - Format quiz timestamps, countdown timers, and accuracy percentages using native \`Intl.DateTimeFormat\` and \`Intl.NumberFormat\`.
4. **Persistent Locale Preference**:
   - Stored in localStorage and synced with user profile in backend.

---

## Acceptance Criteria
- [ ] All primary UI views (Auth, Dashboard, Quiz, Flashcards, Study Planner) support dynamic language switching.
- [ ] Language selection updates instantly without requiring a full page refresh.
- [ ] Fallback to English if translation key is missing in target locale.`
  },
  {
    number: 545,
    slug: "streak-freeze-inventory-gamified-mystery-box",
    title: "[FEAT]: Dynamic Streak Freeze Inventory & Gamified Mystery Box Rewards Engine",
    labels: ["enhancement", "gamification", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Study streaks are one of the strongest motivators for daily revision. However, unexpected emergencies or illness can cause students to break a 50-day streak, leading to severe demotivation.

This feature introduces a **Gamified Streak Freeze Inventory, XP Reward Shop & Daily Mystery Box System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Gamification & Rewards Engine (\`backend/services/gamificationRewardService.js\`)**:
   - Automatic streak freeze application when a student misses their daily study goal, provided they have available freeze tokens in their inventory.
   - Mystery Loot Box RNG algorithm awarding XP boosters, exclusive avatar badges, and streak repair tokens upon reaching 7, 30, and 100-day milestones.
2. **Database Schema Enhancements**:
   - \`UserInventory\` table tracking items (streak freeze tokens, badge frames, XP multipliers).
3. **REST Endpoints**:
   - \`POST /api/rewards/mystery-box/open\` - Unlocks daily milestone mystery box and credits reward.
   - \`POST /api/rewards/shop/purchase\` - Uses student XP to buy streak freeze tokens.
   - \`GET /api/rewards/inventory\` - Fetches student items and active power-ups.

### Frontend Architecture
1. **Rewards & Item Shop Modal (\`frontend/src/components/gamification/ItemShopModal.jsx\`)**:
   - Interactive card grid showing purchasable perks with XP price tags.
2. **Mystery Box Unboxing Animation (\`frontend/src/components/gamification/MysteryBoxModal.jsx\`)**:
   - 3D / CSS animated treasure chest opening effect with confetti particle burst upon unlocking items.

---

## Acceptance Criteria
- [ ] Streak freeze automatically activates when a daily study goal is missed if student owns a freeze token.
- [ ] Students can purchase streak freezes and cosmetics using earned XP.
- [ ] Opening mystery boxes displays engaging unlock animations and updates user inventory accurately.`
  },
  {
    number: 546,
    slug: "redis-sliding-window-rate-limiting-token-bucket",
    title: "[FEAT]: Granular Rate-Limiting & Sliding Window Token Bucket for AI & Quiz Endpoints",
    labels: ["enhancement", "backend", "security", "infrastructure", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
AI generation routes (Gemini API question generators, note summarizers) and quiz submission endpoints are resource-intensive. Without granular rate limiting, abusive automated scripts or rapid clicks can exhaust API quotas and degrade server performance.

This feature implements a **Redis-Backed Sliding Window Rate Limiter & Token Bucket Strategy** for sensitive endpoints.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Sliding Window Rate Limiter Middleware (\`backend/middleware/rateLimiter.js\`)**:
   - Redis Sorted Set (\`ZADD\`, \`ZREMRANGEBYSCORE\`, \`ZCARD\`) implementation providing millisecond-accurate sliding window rate tracking.
   - Tiered limits based on authentication status and user roles:
     - Anonymous users: 10 requests / min.
     - Authenticated standard users: 60 requests / min (AI routes: 15 / min).
     - Educators / Admins: 180 requests / min.
2. **Standardized Rate Limit Headers**:
   - Attaches \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\` to all API responses.
   - Returns \`429 Too Many Requests\` with structured JSON error containing retry-after seconds.
3. **Graceful Fallback**:
   - In-memory LRU cache fallback if Redis connection is temporarily interrupted.

---

## Acceptance Criteria
- [ ] Accurately limits rapid repeated requests using sliding window algorithms.
- [ ] Returns RFC-compliant rate limit response headers and descriptive 429 JSON messages.
- [ ] Seamless in-memory fallback prevents API failure if Redis is unavailable.`
  },
  {
    number: 547,
    slug: "daily-revision-slack-discord-webhook-study-squads",
    title: "[FEAT]: Automated Daily Revision Slack & Discord Webhook Integration for Study Squads",
    labels: ["enhancement", "backend", "community", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Many student study squads already communicate on Discord servers and Slack workspaces. Bringing OpenPrep AI study notifications, daily challenge reminders, and squad leaderboard changes into these channels keeps squad members accountable and engaged.

This feature builds an **Automated Daily Revision Discord & Slack Webhook Dispatcher**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Webhook Notification Dispatcher (\`backend/services/squadWebhookService.js\`)**:
   - Discord Rich Embed & Slack Block Kit formatter.
   - Dispatches formatted automated messages for:
     - **Morning Daily Target**: Today's high-yield topic to revise and scheduled squad quiz.
     - **Leaderboard Updates**: Weekly XP champions and longest active streaks.
     - **Quiz Battle Invites**: One-click join links when a squad member launches a live quiz challenge.
2. **Scheduled Cron Worker**:
   - Node-cron task scheduled at user-configured local morning time (e.g. 08:00 AM).
3. **REST Endpoints**:
   - \`POST /api/squads/:squadId/webhooks\` - Adds and validates Discord/Slack webhook URLs.
   - \`POST /api/squads/:squadId/webhooks/test\` - Sends a test notification payload to verify connectivity.
   - \`DELETE /api/squads/:squadId/webhooks/:webhookId\` - Removes webhook integration.

### Frontend Architecture
1. **Squad Integrations Settings Tab (\`frontend/src/components/squads/SquadIntegrationsTab.jsx\`)**:
   - Simple configuration form to paste webhook URL, select notification events, and send test ping.

---

## Acceptance Criteria
- [ ] Squad moderators can add Discord and Slack webhooks with one-click test message validation.
- [ ] Rich embed messages render properly with squad colors, avatars, and action links.
- [ ] Webhook failures (e.g., 404/410 from deleted channel) are logged and deactivated gracefully.`
  },
  {
    number: 548,
    slug: "interactive-formula-sheet-builder-mathquill",
    title: "[FEAT]: Interactive Formula Sheet Builder with MathQuill Live Visual Equation Editor",
    labels: ["enhancement", "frontend", "ui/ux", "study-planner", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Formulas in Physics, Mathematics, and Chemistry are challenging to memorize without structured cheat sheets. Typing raw LaTeX is difficult for beginners, while static textbook formulas cannot be customized or reorganized.

This feature creates an **Interactive Formula Sheet Builder with MathQuill Live Visual Equation Editor**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Visual Equation Editor Canvas (\`frontend/src/components/formulaBuilder/VisualFormulaEditor.jsx\`)**:
   - MathQuill / MathLive interactive equation input bar with real-time bidirectional LaTeX synchronization.
   - Clickable math toolbar categorized by: Arithmetic, Calculus (Derivatives, Integrals, Limits), Linear Algebra (Matrices, Vectors), Chemistry Notation (Subscripts, Reaction Arrows).
2. **Drag-and-Drop Formula Grid (\`frontend/src/components/formulaBuilder/FormulaSheetGrid.jsx\`)**:
   - Modular card grid where students can organize formulas into customized sections (e.g., "Thermodynamics Formulas", "Trigonometric Identities").
   - Add notes, variable definitions ($v = \\text{velocity}$, $m = \\text{mass}$), and highlight key exam tricks.
3. **Export Formats**:
   - Export to printable PDF cheat sheet, high-resolution PNG, or raw LaTeX source code.

### Backend Architecture
1. **REST Endpoints**:
   - \`POST /api/formula-sheets\` - Saves custom formula sheet with title, subject, and serialized formula cards.
   - \`GET /api/formula-sheets/:id\` - Retrieves formula sheet.

---

## Acceptance Criteria
- [ ] Students can compose complex mathematical and chemical formulas using a visual point-and-click editor.
- [ ] Formula cards can be rearranged with drag-and-drop into multi-column cheat sheets.
- [ ] Formula sheets can be exported to PDF and synchronized across devices.`
  },
  {
    number: 549,
    slug: "distributed-session-revocation-suspicious-login-alerts",
    title: "[FEAT]: Distributed Session Revocation & Suspicious Concurrent Login Detection",
    labels: ["enhancement", "backend", "authentication", "security", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
To safeguard student accounts, protect premium course materials, and prevent unauthorized credential sharing, OpenPrep AI needs enterprise-grade active session management and suspicious login detection.

This feature implements **Distributed Session Revocation, Active Device Management & Suspicious Login Geolocation Telemetry**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Active Device & Session Tracker (\`backend/services/sessionManagerService.js\`)**:
   - Stores session records in PostgreSQL and Redis with device metadata (Browser, OS, IP address, approximate geolocation, and last active timestamp).
   - Generates unique Session Tokens linked to JWT \`jti\` claims.
2. **Session Revocation & Redis Blacklist**:
   - Single-click "Revoke Device" or "Log Out All Other Devices" that immediately invalidates session tokens in Redis.
3. **Suspicious Login Anomaly Detector**:
   - Flags logins from new IP addresses, unexpected countries, or impossible travel velocity (e.g., logins from two continents within 1 hour).
   - Sends security email alert with confirmation link to block compromised credentials.
4. **REST Endpoints**:
   - \`GET /api/auth/sessions\` - Lists all active devices and sessions for the current user.
   - \`DELETE /api/auth/sessions/:sessionId\` - Terminates a specific device session.
   - \`DELETE /api/auth/sessions/other\` - Revokes all sessions except the current one.

### Frontend Architecture
1. **Security & Active Devices Dashboard (\`frontend/src/components/profile/ActiveSessionsManager.jsx\`)**:
   - Displays device list with desktop/mobile icons, IP, location badge, and "Current Device" indicator.

---

## Acceptance Criteria
- [ ] Users can view all active logged-in sessions with device, browser, and IP location info.
- [ ] Terminating a session immediately revokes access on that target device on subsequent requests.
- [ ] Suspicious concurrent logins trigger automated security alert emails.`
  },
  {
    number: 550,
    slug: "ai-audio-flashcard-podcast-generator-lofi-beats",
    title: "[FEAT]: Interactive Audio Flashcard Podcast Generator for Subtopics with Ambient Background Beats",
    labels: ["enhancement", "ai", "flashcards", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Audio learning is highly effective for auditory retention. Instead of robotic text-to-speech, students benefit from cohesive, conversational podcast-style audio summaries that interweave flashcard concepts with ambient background beats for focused learning.

This feature introduces an **AI Audio Flashcard Podcast Generator with Ambient Lo-Fi & Focus Beats**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Podcast Script Synthesis Engine (\`backend/services/audioPodcastService.js\`)**:
   - Ingests flashcard deck content and prompts Gemini API to structure a 3-5 minute conversational review dialogue between two AI study hosts (Host A: Explainer, Host B: Inquisitive Student).
2. **Multi-Voice Audio Mixing Pipeline**:
   - Converts dialogue into multi-voice speech using neural TTS voices.
   - Mixes voice audio with user-selected background ambient tracks (Lo-Fi Study Beats, Rainy Window, Binaural Alpha Waves) using \`fluent-ffmpeg\`.
3. **REST Endpoints**:
   - \`POST /api/flashcards/:deckId/generate-podcast\` - Queues podcast generation job.
   - \`GET /api/flashcards/podcasts/:id\` - Retrieves audio file URL and timestamped transcript.

### Frontend Architecture
1. **Interactive Podcast Player Widget (\`frontend/src/components/audio/AudioPodcastPlayer.jsx\`)**:
   - Sleek glassmorphic audio player with audio visualizer waveform, ambient music volume slider, and interactive synchronized transcript.

---

## Acceptance Criteria
- [ ] Converts any flashcard deck into a multi-voice conversational audio podcast in under 60 seconds.
- [ ] Integrates background ambient music tracks with independent volume mixing.
- [ ] Synchronized transcript highlights spoken lines in real time during playback.`
  },
  {
    number: 551,
    slug: "automated-database-index-optimization-slow-query-monitor",
    title: "[FEAT]: Automated Database Index Optimization & Slow Query Telemetry Monitor",
    labels: ["enhancement", "backend", "database", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As the volume of quiz attempts, flashcard repetitions, and user activity logs grows, unindexed queries can lead to slow response times (high latency) and database bottlenecks during peak mock-exam hours.

This feature implements **Automated Database Index Optimization, Query Performance Logging & Slow Query Telemetry**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Sequelize Query Telemetry Middleware (\`backend/config/dbTelemetry.js\`)**:
   - Hooks into Sequelize query lifecycle to measure query execution duration in milliseconds.
   - Automatically logs any query taking longer than 150ms to slow-query telemetry logs with exact SQL statement and parameter signatures.
2. **B-Tree Compound Indexing Migrations**:
   - Creates targeted compound indexes on high-throughput lookup columns:
     - \`QuizAttempts (userId, quizId, createdAt DESC)\`
     - \`Flashcards (deckId, nextReviewDate ASC, interval)\`
     - \`ActivityLogs (userId, eventType, timestamp DESC)\`
     - \`Topics (subjectId, confidenceStatus)\`
3. **Admin Query Telemetry Endpoint**:
   - \`GET /api/admin/telemetry/queries\` - Provides administrators with p50, p95, and p99 query latency distributions and slowest running SQL routes.

---

## Acceptance Criteria
- [ ] Queries exceeding 150ms execution time are automatically logged with execution plans.
- [ ] Compound indexes applied via Sequelize migrations reduce quiz history and flashcard due query latency by over 50%.
- [ ] Telemetry endpoint reports p95 query latency accurately.`
  },
  {
    number: 552,
    slug: "real-time-study-squad-webrtc-audio-lounge",
    title: "[FEAT]: Real-Time Study Squad Live Screen & Audio Lounge with WebRTC Mesh",
    labels: ["enhancement", "frontend", "backend", "community", "high-priority", "ECSoC26", "ECSoC26-L3"],
    body: `## Summary & Motivation
Study squad members often want to study "together in silence" or share their screens while solving challenging math problems. Relying on external meeting links (Zoom/Meet) breaks the study flow.

This feature embeds a **Lightweight WebRTC Audio Lounge & Screen Sharing Space** directly inside OpenPrep Study Squads.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **WebRTC Voice & Screen Client (\`frontend/src/components/squads/SquadAudioLounge.jsx\`)**:
   - Full WebRTC peer connection mesh handling peer signaling, ICE candidates, and audio stream tracks.
   - Controls for Mic Mute, Deafen, Push-to-Talk, Screen Share, and Audio Volume sliders per participant.
   - Visual audio waveform indicators showing who is currently speaking.
2. **Focus Mode Minimalist Pip (Picture-in-Picture)**:
   - Floating widget allowing students to browse flashcards or quizzes while keeping squad audio active.

### Backend Architecture
1. **Signaling Server (\`backend/services/webrtcSignalingService.js\`)**:
   - Socket.io signaling layer managing room joins, offers, answers, and ICE candidate exchange.
2. **Room Capacity & State Management**:
   - Limits peer mesh to 8 active voice participants per room to maintain low CPU and bandwidth overhead.

---

## Acceptance Criteria
- [ ] Squad members can enter voice lounge with clear peer-to-peer audio and mute/deafen toggles.
- [ ] Screen sharing allows presenting solutions with sub-second latency across squad members.
- [ ] Seamlessly switches audio device inputs and displays active speaking rings around avatars.`
  },
  {
    number: 553,
    slug: "ai-question-distractor-quality-scoring-evaluator",
    title: "[FEAT]: Intelligent Question Distractor Quality Scoring & Plausibility Metric",
    labels: ["enhancement", "ai", "quiz-system", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Poorly designed multiple-choice questions often contain obviously fake wrong answers (distractors), making it easy for students to guess the right answer by process of elimination without actual understanding. Competitive exams require plausible distractors based on common student misconceptions.

This feature creates an **Intelligent Question Distractor Quality Scoring & Plausibility Metric Engine**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Distractor Evaluation Engine (\`backend/services/distractorScorerService.js\`)**:
   - Evaluates AI-generated and user-created question distractors using multi-point heuristic criteria:
     - **Plausibility Score (0-100)**: Does the wrong option reflect a known conceptual misunderstanding or sign error in calculation?
     - **Grammar & Length Symmetry**: Are all options similar in length and grammatical structure to avoid visual giveaways?
     - **Clue Leakage Detection**: Ensures no option contains "dead giveaway" words (e.g. "always", "never", or hints to other options).
2. **Distractor Auto-Enhancer**:
   - If an option scores low plausibility, Gemini API suggests 3 mathematically derived alternative distractors.
3. **REST Endpoints**:
   - \`POST /api/quiz/evaluate-distractors\` - Evaluates questions and returns diagnostic quality scores.

### Frontend Architecture
1. **Question Quality Diagnostic Panel (\`frontend/src/components/quiz/QuestionQualityBadge.jsx\`)**:
   - Visual gauge showing distractor quality rating with actionable suggestions for test creators.

---

## Acceptance Criteria
- [ ] Accurately identifies low-quality or obvious distractors in multiple-choice questions.
- [ ] Provides AI-suggested alternative options based on realistic calculation mistakes.
- [ ] Visual quality breakdown helps educators refine exam questions before publishing.`
  },
  {
    number: 554,
    slug: "chapter-weightage-bubble-chart-weakness-radar",
    title: "[FEAT]: Interactive Chapter Weightage Bubble Chart & Weakness Radar Visualization",
    labels: ["enhancement", "frontend", "dashboard", "analytics", "good first issue", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
Students need an immediate, intuitive bird's-eye view of where their study time will have the highest return on investment (ROI). Knowing a topic has 15% exam weightage while your mastery is only 20% identifies an urgent priority.

This feature adds an **Interactive Chapter Weightage Bubble Chart & Multi-Dimensional Weakness Radar**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Interactive Weightage Bubble Chart (\`frontend/src/components/analytics/WeightageBubbleChart.jsx\`)**:
   - D3.js / Chart.js bubble chart where:
     - **X-axis**: Topic Weightage in Exam (0% to 20%).
     - **Y-axis**: Student Mastery Level (0% to 100%).
     - **Bubble Size**: Total Questions in Database.
     - **Bubble Color**: Priority Zone (Green = Mastered High-Yield, Red = Critical Danger Zone, Yellow = Low Yield).
2. **Multi-Subject Mastery Radar (\`frontend/src/components/analytics/SubjectMasteryRadar.jsx\`)**:
   - 6-8 axis radar polygon chart comparing student accuracy across different subject domains against benchmark topper averages.

### Backend Architecture
1. **Analytics Aggregator Endpoint**:
   - \`GET /api/analytics/weightage-matrix\` - Computes combined metrics of syllabus weightage, student quiz history, and accuracy.

---

## Acceptance Criteria
- [ ] Bubble chart plots all subject topics categorized into 4 actionable priority quadrants.
- [ ] Radar chart dynamically reflects changes when new quizzes are completed.
- [ ] Fully responsive with interactive tooltips displaying topic stats on hover.`
  },
  {
    number: 555,
    slug: "offline-flashcard-sync-indexeddb-background-sync",
    title: "[FEAT]: Offline Flashcard Sync Engine with Conflict-Free IndexedDB & Background Sync API",
    labels: ["enhancement", "frontend", "pwa", "offline", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Students often study in places with unreliable internet connections (subways, flights, remote campuses). Flashcard reviews done offline must be saved locally and reconciled seamlessly when the device goes back online without losing SM-2 spaced repetition state.

This feature builds a **Conflict-Free Offline Flashcard Sync Engine using IndexedDB & Service Worker Background Sync**.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **IndexedDB Local Storage Layer (\`frontend/src/services/offlineDbService.js\`)**:
   - Stores flashcard decks, cards, and offline review logs in \`idb\` (IndexedDB wrapper).
   - Tracks local mutation queue with timestamps (\`reviewLogQueue\`).
2. **Background Sync Worker (\`frontend/src/sw.js\`)**:
   - Listens to Service Worker \`sync\` events (\`sync-flashcard-reviews\`).
   - Automatically replays pending review logs to backend when network connectivity is restored.
3. **Network Status Indicator (\`frontend/src/components/common/OfflineStatusBadge.jsx\`)**:
   - Clean UI pill showing "Offline Mode - X reviews queued" and "Syncing..." when re-connected.

### Backend Architecture
1. **Batch Review Reconciliation Endpoint**:
   - \`POST /api/flashcards/sync-offline-batch\` - Accepts array of timestamped review events, updates SM-2 intervals using last-write-wins algorithm, and returns updated deck states.

---

## Acceptance Criteria
- [ ] Students can complete flashcard review sessions completely offline.
- [ ] Offline review logs are stored reliably in IndexedDB without data loss.
- [ ] Background Sync flushes queued reviews automatically once internet connection is restored.`
  },
  {
    number: 556,
    slug: "ai-flashcard-cloze-deletion-auto-extractor",
    title: "[FEAT]: AI-Powered Flashcard Cloze Deletion (Fill-in-the-Blank) Auto-Extractor",
    labels: ["enhancement", "ai", "flashcards", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
Cloze deletion (fill-in-the-blank) flashcards are one of the most effective techniques for memorizing medical terminology, historical dates, legal definitions, and chemical formulas. Manually creating cloze deletions from textbook paragraphs is tedious.

This feature implements an **AI-Powered Cloze Deletion Auto-Extractor & Interactive Study Card UI**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Cloze Extraction NLP Pipeline (\`backend/services/clozeExtractionService.js\`)**:
   - Ingests raw text or study notes and prompts Gemini API with specialized cloze extraction schemas.
   - Automatically identifies key keywords, numbers, formula names, and dates, formatting them into Anki-style cloze syntax: \`{{c1::keyword}}\`.
2. **REST Endpoints**:
   - \`POST /api/flashcards/generate-cloze\` - Generates cloze flashcards from text paragraphs with customizable mask density (Light, Medium, Dense).

### Frontend Architecture
1. **Interactive Cloze Card UI (\`frontend/src/components/flashcards/ClozeFlashcard.jsx\`)**:
   - Renders blurred or masked clickable chips \`[ ... ]\` for hidden words.
   - Clicking a masked chip reveals the hidden word with smooth flip animation.
   - Keyboard shortcut (\`Space\` / \`Enter\`) to reveal next mask sequentially.

---

## Acceptance Criteria
- [ ] Ingests study text and automatically creates structured cloze deletion flashcards.
- [ ] Cloze chips remain masked until clicked or toggled via keyboard shortcuts.
- [ ] Cloze cards integrate seamlessly into the standard SM-2 spaced repetition review queue.`
  },
  {
    number: 557,
    slug: "peer-study-bounty-board-qa-solution-upvoting",
    title: "[FEAT]: Peer Study Bounty Board & Q&A Solution Upvoting System",
    labels: ["enhancement", "community", "gamification", "frontend", "backend", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
When students encounter difficult questions that AI explanations don't fully clarify, peer explanations often provide the missing intuitive breakthrough. Rewarding helpful classmates creates a thriving collaborative learning community.

This feature introduces a **Peer Study Bounty Board & Solution Upvoting System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Bounty & Upvoting Engine (\`backend/services/bountyService.js\`)**:
   - Allows students to post challenging questions with an attached XP bounty (e.g. 50 XP to 500 XP).
   - Community answers can be upvoted/downvoted.
   - The question author can accept the best answer, which automatically transfers the XP bounty and awards a "Verified Solution" badge.
2. **Database Schema Enhancements**:
   - \`Bounties\` table (questionId, bountyXP, status, winnerId).
   - \`BountySolutions\` table (bountyId, authorId, content, upvotesCount, isAccepted).
3. **REST Endpoints**:
   - \`POST /api/bounties\` - Creates a new question bounty.
   - \`POST /api/bounties/:id/solutions\` - Submits a community solution.
   - \`POST /api/bounties/:id/accept/:solutionId\` - Accepts solution and disburses XP bounty.

### Frontend Architecture
1. **Bounty Board Hub (\`frontend/src/components/community/BountyBoard.jsx\`)**:
   - Filterable list of active bounties sorted by XP Reward, Subject, and Urgency.
2. **Solution Thread & Upvote Controls (\`frontend/src/components/community/BountySolutionCard.jsx\`)**:
   - Markdown solution viewer with LaTeX math rendering and upvote counter.

---

## Acceptance Criteria
- [ ] Students can post question bounties with XP stakes deducted from their balance.
- [ ] Community members can submit formatted solutions with math formulas.
- [ ] Accepting a solution awards the XP bounty to the author and marks the question solved.`
  },
  {
    number: 558,
    slug: "automated-e2e-api-health-check-latency-slo-monitor",
    title: "[FEAT]: Automated End-to-End API Health Check & Latency SLO Monitor with Status Page",
    labels: ["enhancement", "backend", "devops", "infrastructure", "good first issue", "low-priority", "ECSoC26", "ECSoC26-L1"],
    body: `## Summary & Motivation
To maintain 99.9% platform availability during high-traffic exam seasons, developers and students need visibility into system health, API endpoint latencies, database connections, and external AI provider status.

This feature builds an **Automated Health Check & Latency SLO Telemetry Monitor with a Public Status Dashboard**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Comprehensive Health Check Service (\`backend/services/healthCheckService.js\`)**:
   - Inspects status and ping response times for:
     - PostgreSQL database connectivity (\`SELECT 1\`).
     - Redis cache server heartbeat.
     - Gemini AI API endpoint latency.
     - File storage / disk write capability.
     - Memory usage (RSS, heap total vs heap used) and process uptime.
2. **REST Endpoints**:
   - \`GET /api/health\` - Lightweight 200 OK for load balancers.
   - \`GET /api/health/detailed\` - Detailed JSON metrics with component status badges and ping latency.

### Frontend Architecture
1. **Public System Status Page (\`frontend/src/pages/SystemStatusPage.jsx\`)**:
   - Modern clean status dashboard showing:
     - Overall System Status ("All Systems Operational" / "Partial Outage").
     - Live 24-hour latency chart for core services.
     - Historical uptime percentage badges (99.98%).

---

## Acceptance Criteria
- [ ] \`/api/health/detailed\` returns live ping latencies for database, cache, and external APIs.
- [ ] Status page renders clean real-time status indicators with zero authentication requirement.
- [ ] Fast response time (< 50ms) to ensure health probes do not add server overhead.`
  },
  {
    number: 559,
    slug: "ai-revision-reminder-push-notifications-ebbinghaus",
    title: "[FEAT]: Smart AI Revision Reminder Push Notifications with Optimal Memory Retrieval Scheduling",
    labels: ["enhancement", "study-planner", "backend", "ai", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
According to Ebbinghaus's forgetting curve, reviewing a concept right before it fades from memory yields maximum neural retention. Sending generic notifications at arbitrary times is ineffective.

This feature implements **Smart AI Revision Reminder Push Notifications scheduled at each student's predicted memory decay inflection points**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Optimal Retrieval Dispatcher (\`backend/services/smartNotificationService.js\`)**:
   - Analyzes student flashcard SM-2 review history and quiz error logs.
   - Predicts the exact day and time a concept's retention probability falls below 75%.
   - Schedules a Web Push Notification using \`web-push\` containing a personalized question preview (e.g., "⚡ Quick 30s Check: Do you remember the formula for Carnot Engine Efficiency?").
2. **Notification Queue Worker**:
   - BullMQ / Redis job queue handling scheduled notification delivery with timezone offset calculation.
3. **REST Endpoints**:
   - \`POST /api/notifications/subscribe\` - Registers browser VAPID push subscription.
   - \`PUT /api/notifications/preferences\` - Configures quiet hours and reminder frequencies.

### Frontend Architecture
1. **Push Permission Prompt Banner (\`frontend/src/components/notifications/PushSubscriptionBanner.jsx\`)**:
   - Non-intrusive banner explaining the benefits of smart spaced repetition reminders with one-click enable.

---

## Acceptance Criteria
- [ ] Dispatches Web Push notifications based on student memory decay curves rather than fixed schedules.
- [ ] Respects user quiet hours (e.g., no notifications between 10:00 PM and 07:00 AM).
- [ ] Clicking the notification opens the exact question or flashcard for instant 30-second review.`
  },
  {
    number: 560,
    slug: "playwright-e2e-automated-test-suite-ci",
    title: "[FEAT]: Comprehensive Playwright Automated E2E Testing Suite for Complete Quiz & Flashcard Lifecycles",
    labels: ["enhancement", "backend", "frontend", "devops", "medium-priority", "ECSoC26", "ECSoC26-L2"],
    body: `## Summary & Motivation
As new features and UI components are continuously contributed during open-source programs, regressions in critical user flows (user registration, taking a timed quiz, reviewing flashcards) can go unnoticed without end-to-end automated testing.

This feature introduces a **Comprehensive Playwright E2E Testing Suite for Core Platform Lifecycles in CI/CD**.

---

## Technical Scope & Architecture

### Test Automation Scope
1. **Authentication Flow Specs (\`tests/e2e/auth.spec.js\`)**:
   - User registration, form validation errors, JWT token receipt, and logout.
2. **Quiz Generation & Submission Specs (\`tests/e2e/quiz-flow.spec.js\`)**:
   - Generating a quiz for a subject, answering timed multiple-choice questions, navigating question palette, submitting quiz, and asserting score report visualization.
3. **Flashcard Review Lifecycle Specs (\`tests/e2e/flashcards.spec.js\`)**:
   - Creating a deck, flipping cards, grading difficulty (Again/Hard/Good/Easy), and verifying interval progression.
4. **CI Integration (\`.github/workflows/e2e-tests.yml\`)**:
   - Automated GitHub Actions workflow running Playwright tests against headless Chromium, Firefox, and WebKit on every pull request.
   - Artifact uploading of test traces and failure video recordings.

---

## Acceptance Criteria
- [ ] Playwright test suite covers Auth, Quiz runner, and Flashcard review lifecycles.
- [ ] Tests run successfully in GitHub Actions CI with reproducible results.
- [ ] Clear documentation in \`docs/testing-guide.md\` explaining how to run E2E tests locally.`
  }
];

// Verify we have 25 items
console.log(`Prepared ${newIssues.length} issues.`);

// 1. Write markdown files to issues/ directory
newIssues.forEach(issue => {
  const fileName = `issue-${issue.number}-${issue.slug}.md`;
  const filePath = path.join(issuesDir, fileName);
  const fileContent = `---
title: '${issue.title}'
labels: '${issue.labels.join(', ')}'
assignees: ''
---

${issue.body}
`;
  fs.writeFileSync(filePath, fileContent, 'utf8');
  console.log(`Wrote issue file: ${fileName}`);
});

// 2. Publish to GitHub using gh issue create
async function publishAll() {
  console.log('\n--- Publishing 25 Issues to GitHub ---');
  let createdCount = 0;

  // Get existing issue titles
  let existingTitles = [];
  try {
    const jsonStr = execSync('gh issue list --limit 300 --state all --json title', { encoding: 'utf8' });
    existingTitles = JSON.parse(jsonStr).map(i => i.title.toLowerCase().trim());
  } catch (err) {
    console.warn('Could not fetch existing issue titles:', err.message);
  }

  for (let i = 0; i < newIssues.length; i++) {
    const issue = newIssues[i];
    console.log(`\n[${i + 1}/${newIssues.length}] Processing: "${issue.title}"`);

    if (existingTitles.includes(issue.title.toLowerCase().trim())) {
      console.log(`[SKIP] Already exists on GitHub.`);
      continue;
    }

    const tempFilePath = path.join(__dirname, `temp_issue_body_${issue.number}.md`);
    fs.writeFileSync(tempFilePath, issue.body, 'utf8');

    try {
      const labelsArg = issue.labels.map(l => `--label "${l}"`).join(' ');
      const escapedTitle = issue.title.replace(/"/g, '\\"');
      const cmd = `gh issue create --title "${escapedTitle}" --body-file "${tempFilePath}" ${labelsArg}`;

      const output = execSync(cmd, { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
      console.log(` -> Created Successfully: ${output.trim()}`);
      createdCount++;
      existingTitles.push(issue.title.toLowerCase().trim());
    } catch (err) {
      console.error(` -> Error creating issue:`, err.stdout || err.stderr || err.message);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }

    // Delay 1.5 seconds to prevent hitting GitHub secondary rate limits
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n========================================`);
  console.log(`Finished! Successfully created ${createdCount} new issues on GitHub.`);
  console.log(`========================================\n`);
}

publishAll().catch(console.error);
