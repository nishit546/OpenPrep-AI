---
title: '[FEAT]: AI Socratic Doubt Solver with Interactive Stepwise Probing & Anti-Answer Hallucination Guards'
labels: 'enhancement, ai, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When students ask AI tutors for help with difficult homework or exam problems, standard LLMs often output the complete solution immediately. This creates passive illusion of competence rather than deep conceptual mastery.

This feature implements an **AI Socratic Doubt Solver** that guides students through guided inquiry, conceptual hints, and diagnostic probing questions before revealing direct answers.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Socratic Dialogue Interface (`frontend/src/components/socratic/SocraticChat.jsx`)**:
   - Interactive conversation stream with progressive hint reveal cards (Level 1: Concept Hint $\rightarrow$ Level 2: Formula Prompt $\rightarrow$ Level 3: Intermediate Step $\rightarrow$ Final Solution).
   - "I'm Stuck" quick-action pills and LaTeX formula input toolbar.
   - Confidence check-in prompts asking students to justify their intermediate reasoning.

2. **Doubt Resolution Summary Card (`frontend/src/components/socratic/DoubtKeyTakeaway.jsx`)**:
   - Auto-generated concept summary card capturing core takeaways, common pitfalls to avoid, and 1-click "Add to Flashcards".

### Backend Architecture
1. **Socratic Prompt Pipeline & State Machine (`backend/services/socraticTutorService.js`)**:
   - Prompt engineering framework with Gemini 1.5 Flash enforcing Socratic pedagogy rules:
     * Never give the full final answer in the first 2 interactions.
     * Ask 1 targeted probing question about the first necessary theorem or principle.
     * Detect and correct student misconceptions gently.
   - Anti-hallucination guardrail validating generated formulas against verified knowledge bases.

2. **REST Endpoints (`backend/controllers/socraticController.js`)**:
   - `POST /api/socratic/ask` - Submits a doubt with problem context and gets the next guided probing response.
   - `POST /api/socratic/hint` - Requests progressive level-based hint unlocks.
   - `POST /api/socratic/convert-to-card` - Converts resolved doubt takeaway into an SM-2 flashcard.

---

## Acceptance Criteria
- [ ] AI tutor actively challenges students with targeted conceptual questions before providing full solutions.
- [ ] Progressive 3-tier hint hierarchy unlocks on demand without revealing subsequent steps prematurely.
- [ ] Doubt resolution generates a concise key-takeaway summary suitable for immediate flashcard creation.
- [ ] Unit tests ensure system prompt compliance and structured JSON schema response validation.
