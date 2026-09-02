---
title: '[FEAT]: Interactive Peer-to-Peer Study Bounty Board & Verified Community Solution Upvoting'
labels: 'enhancement, community, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When students encounter exceptionally difficult past-year exam questions or proof-based problems that automated AI answers don't fully explain, they benefit from human peer explanations. A bounty board incentivizes top students to post detailed step-by-step solutions in exchange for XP and badges.

This feature introduces a **Peer-to-Peer Question Bounty Board with Community Solution Upvoting & Escrow**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Bounty & Solution Model (`backend/models/BountyQuestion.js`, `backend/models/BountyAnswer.js`)**:
   - Tracks question title, problem LaTeX, attached diagrams, bounty XP amount, expiration date, and status (`OPEN`, `SOLVED`, `EXPIRED`).
2. **XP Escrow Transaction Handler (`backend/services/bountyEscrowService.js`)**:
   - Holds offered bounty XP in escrow upon question posting; transfers reward to the author of the accepted solution.
   - Automated upvoting reputation algorithm: Top-upvoted solutions get pinned; downvoted spam answers are flagged for squad moderators.
3. **REST Endpoints (`backend/controllers/bountyController.js`)**:
   - `GET /api/bounties` - Filterable list of active bounties by subject and XP value.
   - `POST /api/bounties` - Creates a new bounty with XP escrow deduction.
   - `POST /api/bounties/:id/answers` - Submits a peer solution.
   - `PUT /api/bounties/:id/accept/:answerId` - Accepts solution and disburses escrowed XP.

### Frontend Architecture
1. **Bounty Board Hub (`frontend/src/components/community/BountyBoard.jsx`)**:
   - Filter by: "Highest Bounty", "Unanswered", "Subject Tag", "Expiring Soon".
2. **Rich Solution Editor with Markdown & KaTeX Preview**:
   - Full math and code formatting support for posting mathematical proofs and code explanations.

---

## Acceptance Criteria
- [ ] Students can post question bounties with XP escrow deducted safely from their balance.
- [ ] Peers can post rich markdown/LaTeX solutions and upvote helpful answers.
- [ ] Accepting a solution awards escrowed XP and marks the bounty as solved.
- [ ] Concurrency-safe transactions prevent duplicate XP payouts.
