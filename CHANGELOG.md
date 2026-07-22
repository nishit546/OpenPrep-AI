# 📝 Changelog

All notable changes to the OpenPrep AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Fixed
- **Cascade deletion**: Deleting an Exam, Subject, or Topic now properly cascade-deletes all associated child records (Progress, Flashcards, Notes, Quizzes, QuizAttempts, StudyPlans, PYQs) instead of leaving orphaned records. Previously, the controllers used bulk `Model.destroy()` which bypassed Sequelize's cascade hooks, and the `deleteExam`/`deleteSubject` controllers only manually deleted Subjects/Topics while missing all other child records. The `deleteTopic` controller now also cascade-deletes Flashcards and Notes instead of setting their FK to `NULL`.
- **Model associations**: Changed `Topic.hasMany(Flashcard)` and `Topic.hasMany(Note)` from `onDelete: 'SET NULL'` to `onDelete: 'CASCADE'` for consistency.

### Added
- Spaced Repetition engine logic for Flashcards (`SuperMemo SM-2` adaptation).
- Redux slices for global user auth state and request handling.
- PDF and text processing pipelines in Express backend.
- Security headers via `helmet` middleware (CSP, X-Frame-Options, HSTS, etc.).
- Rate limiting on auth endpoints (login 10/15min, register 5/hr, forgot-password 5/hr, refresh 10/15min).
- Rate limiting on AI endpoints: `aiLimiter` (10 req/min/IP) on `/flashcards/generate-ai`, `/quizzes/generate-ai`, `/study-plans/generate-ai`; `strictAiLimiter` (5 req/min/IP) on `/pyqs/upload` and `/pyqs/:id/analyze`. Rate limiters skip in test environment.
- Input validation middleware via `express-validator` for auth routes.
- Startup validation: server exits if `JWT_SECRET` is not defined.
- Request body size limiting to 10KB.
- Restricted CORS origin via `CORS_ORIGIN` environment variable.
- **Email verification**: New users must verify email before logging in. Registration sends verification link with 24-hour expiry. `POST /api/auth/verify-email/:token` endpoint.
- **Forgot / Reset password**: Real crypto-random tokens (hashed with SHA-256 in DB) with 1-hour expiry. `POST /api/auth/forgot-password` and `POST /api/auth/reset-password/:token` endpoints.
- **Refresh token rotation**: Long-lived 7-day refresh tokens stored as SHA-256 hashes. Each refresh invalidates the old token and issues a new pair. `POST /api/auth/refresh-token` endpoint.
- **Nodemailer email service**: `backend/services/emailService.js` — sends via SMTP when configured (`SMTP_HOST`), falls back to console logging for dev/test.
- **Password complexity rules**: Minimum 8 characters, requires uppercase, lowercase, number, and special character.
- `isEmailVerified` field on User model to gate login access.

### Changed
- **JWT access token lifetime reduced from 30 days to 15 minutes** for improved security. Refresh tokens provide long-lived sessions.
- **Registration response**: No longer returns a JWT token. Returns `{ success, message, isEmailVerified: false }` prompting email verification.
- **Login response**: Returns 403 `Forbidden` if email is not verified. Returns `refreshToken` alongside `token` for session management.
- **User model**: Password `minlength` increased from 6 to 8. Added 7 new fields (`isEmailVerified`, `emailVerificationToken`, `emailVerificationExpire`, `resetPasswordToken`, `resetPasswordExpire`, `refreshTokens`, `refreshTokenExpire`). Added `generateToken(field)` instance method for crypto token generation.
- **Rate limit thresholds adjusted**: Login 5→10/15min, Register 3→5/hr, Forgot-password 3→5/hr (to accommodate legitimate use after verification requirement).

### Fixed
- Intermittent CORS issues when connecting Vite local server to Node.js backend.
- Token expiration handling inside the Redux Thunk loader.
- **Security**: Removed hardcoded JWT fallback secret `supersecret_openprep_key` from `middleware/auth.js` and `controllers/authController.js`. JWT secret must now come exclusively from the `JWT_SECRET` environment variable.
- **Forgot password stub**: `forgotPassword` previously returned fake `{ success: true, data: {} }` with no actual functionality. Now generates real crypto tokens and sends email.
- **Feedback list memory/safety risk**: `GET /api/community/feedback` now paginates and sorts by upvote count at the database level (using `ORDER BY array_length` + `LIMIT`/`OFFSET`) instead of loading all rows into memory. Fixes out-of-memory risk at scale. (#124)

---

## [0.5.0] - 2026-06-21
### Added
- Initialize Vite, React, and Tailwind CSS frontend boilerplate.
- Establish Node.js, Express, and MongoDB backend.
- Design mongoose schemas for Users, Exams, Subjects, Topics, Study Plans, Quizzes, Flashcards, and Activity Logs.
- Setup Docker configurations for local development and Docker Compose file.
- Configure GitHub actions for automated linting and validation.
- Create complete developer documentation system (`docs/`).
