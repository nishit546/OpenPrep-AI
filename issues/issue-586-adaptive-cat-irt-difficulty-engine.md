---
title: '[FEAT]: Adaptive Dynamic Question Difficulty Adjustment (CAT/IRT Engine) with Item Response Theory Calibration'
labels: 'enhancement, ai, quiz-system, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Static quizzes present either uniformly easy or excessively difficult questions, failing to match individual student ability. High-stakes exams (GRE, GMAT, Adaptive SAT) use **Computerized Adaptive Testing (CAT)** to dynamically measure latent student ability $(\theta)$ and select the most informative next item.

This feature implements a **3-Parameter Logistic (3PL) Item Response Theory (IRT) Adaptive Testing Engine** that calibrates question discrimination $(a)$, difficulty $(b)$, and guessing parameter $(c)$ in real time.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Adaptive Quiz Runner (`frontend/src/components/quiz/AdaptiveQuizRunner.jsx`)**:
   - Real-time ability estimation gauge showing student proficiency $(\theta \in [-3.0, +3.0])$ with confidence interval bands.
   - Dynamic question loader fetching the mathematically optimal next question based on Fisher Information Maximization.
   - Convergence criteria indicator displaying test termination condition (standard error $< 0.25$ or max items reached).

2. **IRT Diagnostic Ability Report (`frontend/src/components/quiz/IRTAbilityReport.jsx`)**:
   - Visual Item Characteristic Curve (ICC) overlays comparing student response trajectory against cohort benchmarks.
   - Sub-domain mastery breakdown with Bayesian expected a posteriori (EAP) ability scores.

### Backend Architecture
1. **IRT Math Calculation Engine (`backend/services/irtEngineService.js`)**:
   - Implementation of 3PL probability model:
     $$P_i(\theta) = c_i + \frac{1 - c_i}{1 + e^{-D a_i (\theta - b_i)}}$$
   - Newton-Raphson and Bayesian EAP ability updating algorithms executed after each item response.
   - Maximum Fisher Information item selection algorithm to pick the most informative unserved item from the question pool.

2. **REST Endpoints (`backend/controllers/adaptiveQuizController.js`)**:
   - `POST /api/adaptive-quiz/start` - Initializes an adaptive session, returning the initial baseline question.
   - `POST /api/adaptive-quiz/submit-item` - Accepts item response, updates $\theta$, checks stopping conditions, and returns the next calibrated item.
   - `GET /api/adaptive-quiz/:sessionId/report` - Computes final ability estimate, percentile rank, and detailed IRT diagnostic curves.

---

## Acceptance Criteria
- [ ] Adaptive test algorithm reliably converges ability estimate within 15-20 questions with standard error $\le 0.28$.
- [ ] Next question selection accurately queries items with maximum Fisher information relative to current estimated $\theta$.
- [ ] Live UI shows smooth transitions without exposing raw formula parameters directly to test takers.
- [ ] Comprehensive unit tests verifying 3PL probability calculation, EAP updates, and edge-case response patterns.
