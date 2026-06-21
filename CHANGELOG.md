# 📝 Changelog

All notable changes to the OpenPrep AI project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]
### Added
- Spaced Repetition engine logic for Flashcards (`SuperMemo SM-2` adaptation).
- Redux slices for global user auth state and request handling.
- PDF and text processing pipelines in Express backend.
- Security headers via `helmet` middleware (CSP, X-Frame-Options, HSTS, etc.).
- Rate limiting on auth endpoints (login 5/15min, register 3/hr, forgot-password 3/hr).
- Input validation middleware via `express-validator` for auth routes.
- Startup validation: server exits if `JWT_SECRET` is not defined.
- Request body size limiting to 10KB.
- Restricted CORS origin via `CORS_ORIGIN` environment variable.

### Fixed
- Intermittent CORS issues when connecting Vite local server to Node.js backend.
- Token expiration handling inside the Redux Thunk loader.
- **Security**: Removed hardcoded JWT fallback secret `supersecret_openprep_key` from `middleware/auth.js` and `controllers/authController.js`. JWT secret must now come exclusively from the `JWT_SECRET` environment variable.

---

## [0.5.0] - 2026-06-21
### Added
- Initialize Vite, React, and Tailwind CSS frontend boilerplate.
- Establish Node.js, Express, and MongoDB backend.
- Design mongoose schemas for Users, Exams, Subjects, Topics, Study Plans, Quizzes, Flashcards, and Activity Logs.
- Setup Docker configurations for local development and Docker Compose file.
- Configure GitHub actions for automated linting and validation.
- Create complete developer documentation system (`docs/`).
