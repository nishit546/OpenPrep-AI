---
title: '[FEAT]: Peer Study Bounty Board & Q&A Solution Upvoting System'
labels: 'enhancement, community, gamification, frontend, backend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
When students encounter difficult questions that AI explanations don't fully clarify, peer explanations often provide the missing intuitive breakthrough. Rewarding helpful classmates creates a thriving collaborative learning community.

This feature introduces a **Peer Study Bounty Board & Solution Upvoting System**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Bounty & Upvoting Engine (`backend/services/bountyService.js`)**:
   - Allows students to post challenging questions with an attached XP bounty (e.g. 50 XP to 500 XP).
   - Community answers can be upvoted/downvoted.
   - The question author can accept the best answer, which automatically transfers the XP bounty and awards a "Verified Solution" badge.
2. **Database Schema Enhancements**:
   - `Bounties` table (questionId, bountyXP, status, winnerId).
   - `BountySolutions` table (bountyId, authorId, content, upvotesCount, isAccepted).
3. **REST Endpoints**:
   - `POST /api/bounties` - Creates a new question bounty.
   - `POST /api/bounties/:id/solutions` - Submits a community solution.
   - `POST /api/bounties/:id/accept/:solutionId` - Accepts solution and disburses XP bounty.

### Frontend Architecture
1. **Bounty Board Hub (`frontend/src/components/community/BountyBoard.jsx`)**:
   - Filterable list of active bounties sorted by XP Reward, Subject, and Urgency.
2. **Solution Thread & Upvote Controls (`frontend/src/components/community/BountySolutionCard.jsx`)**:
   - Markdown solution viewer with LaTeX math rendering and upvote counter.

---

## Acceptance Criteria
- [ ] Students can post question bounties with XP stakes deducted from their balance.
- [ ] Community members can submit formatted solutions with math formulas.
- [ ] Accepting a solution awards the XP bounty to the author and marks the question solved.
