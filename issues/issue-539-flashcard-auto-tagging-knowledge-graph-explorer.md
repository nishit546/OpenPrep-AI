---
title: '[FEAT]: AI Flashcard Deck Auto-Tagging, Taxonomy Clustering & Knowledge Graph Explorer'
labels: 'enhancement, flashcards, ai, frontend, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
As students accumulate hundreds of flashcards across subjects, decks become disorganized and siloed. Students struggle to see how concepts in one subject (e.g. Calculus) relate to topics in another (e.g. Physics Mechanics).

This feature implements an **AI Auto-Tagging Engine & Interactive Knowledge Graph Explorer** for student flashcards.

---

## Technical Scope & Architecture

### Backend Architecture
1. **AI Taxonomy Clustering Service (`backend/services/flashcardTaxonomyService.js`)**:
   - Analyzes flashcard prompts and answers using Gemini API to extract hierarchical domain tags (e.g., `STEM > Physics > Electromagnetism > Gauss's Law`).
   - Identifies prerequisite links between concepts (e.g., "Vector Calculus" is a prerequisite for "Maxwell's Equations").
2. **Knowledge Graph Graph Data Serializer**:
   - Generates node-link JSON datasets representing concept clusters, connection strengths, and mastery colors.
3. **REST Endpoints**:
   - `POST /api/flashcards/auto-tag` - Batches untagged cards and applies structured taxonomy tags.
   - `GET /api/flashcards/knowledge-graph` - Returns aggregated concept graph for current user.

### Frontend Architecture
1. **Interactive Force-Directed Knowledge Graph (`frontend/src/components/flashcards/KnowledgeGraphViewer.jsx`)**:
   - D3.js or Force-Graph 2D/3D visualization with zoomable nodes sized by card count and colored by SM-2 retention score.
   - Clicking a node filters the deck list to that concept cluster.

---

## Acceptance Criteria
- [ ] AI automatically categorizes and tags flashcards with hierarchical subject tags upon creation.
- [ ] Knowledge graph displays interactive nodes showing concept connectivity and student mastery state.
- [ ] Filtering or clicking nodes instantly pulls up corresponding flashcards for focused review.
