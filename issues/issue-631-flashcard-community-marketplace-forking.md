---
title: '[FEAT]: Community Flashcard Deck Marketplace with Public Forking, Reviews & Verified Badges'
labels: 'enhancement, fullstack, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Students often spend tens of hours crafting high-quality flashcards for specific exams (e.g. MCAT, USMLE, JEE, CFA, Bar Exam). Enabling a community-driven deck hub allows top students and educators to publish curated decks, receive feedback, and allows other learners to clone (fork) and adapt decks to their own syllabi.

This feature implements a **Community Flashcard Deck Marketplace & Hub** with deck versioning, forking lineage tracking, community star ratings, and verified educator badges.

---

## Technical Scope & Architecture

### Backend Data Models & Controller
1. **Deck Marketplace Schema (`backend/models/DeckMarketplace.js`)**:
   - `is_public` (BOOLEAN), `forked_from_deck_id` (UUID foreign key), `downloads_count`, `fork_count`, `average_rating`, `exam_tags` (TEXT[]).
   - Rating & Review model: `deck_reviews` (`user_id`, `deck_id`, `rating` 1–5, `review_text`, `created_at`).
2. **Marketplace API Endpoints (`backend/controllers/marketplaceController.js`)**:
   - `GET /api/marketplace/decks`: Filter by exam tag, subject, popularity, and recent trending.
   - `POST /api/marketplace/decks/:id/fork`: Clones deck and creates independent user copy while preserving lineage attribution to the original author.
   - `POST /api/marketplace/decks/:id/review`: Submits rating and recalculates Bayesian average rating score.

### Frontend Marketplace UI
1. **Marketplace Explorer (`frontend/src/components/marketplace/DeckMarketplaceHub.jsx`)**:
   - Grid cards displaying deck cover, author avatar, verified badge, card count, star rating, and one-click "Fork Deck" or "Preview Cards" modal.

---

## Acceptance Criteria
- [ ] Students can publish public flashcard decks with exam tags and subject categories.
- [ ] One-click forking replicates cards into student's personal library while maintaining attribution.
- [ ] Interactive 5-star rating and text review system with aggregated rating calculation.
- [ ] Search and filtering by syllabus, exam, rating, and download popularity.
