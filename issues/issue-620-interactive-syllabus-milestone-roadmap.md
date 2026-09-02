---
title: '[FEAT]: Interactive Syllabus Milestone Roadmap with Draggable Dependency Graph & Progress Ring'
labels: 'enhancement, frontend, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Static checklist syllabus pages make it difficult for students to visualize dependencies between foundational and advanced chapters (e.g. mastering "Differentiation" before studying "Kinematics" or "Electrodynamics"). Without a visual progression map, students often attempt advanced topics prematurely and get discouraged.

This feature creates an **Interactive Visual Syllabus Dependency Graph & Milestone Roadmap** powered by React Flow / D3.js with dynamic unlocking, branch paths, and predictive syllabus completion milestones.

---

## Technical Scope & Architecture

### Frontend Visual Canvas
1. **Interactive Roadmap Canvas (`frontend/src/components/roadmap/SyllabusRoadmap.jsx`)**:
   - Node-edge directed acyclic graph (DAG) rendered with `@xyflow/react` (React Flow).
   - Node types:
     - **Locked Node**: Grayed out with prerequisite lock badges.
     - **In-Progress Node**: Pulsing neon border with active quiz/flashcard shortcuts.
     - **Mastered Node**: Golden glow with completion checkmark and quiz score badge.
   - Zoom, mini-map navigator, and auto-layout algorithm (Dagre layout) for hierarchical branch viewing.
2. **Milestone Velocity Card (`frontend/src/components/roadmap/MilestoneVelocityCard.jsx`)**:
   - Projects estimated exam readiness date based on student's current weekly chapter completion pace.
   - Visual milestone flags corresponding to target mock exam dates and revision blocks.

### Backend Dependency Model
1. **Syllabus Graph API (`backend/controllers/syllabusGraphController.js`)**:
   - `GET /api/syllabus/:examId/graph` - Returns syllabus nodes, directed prerequisite edges, weightages, and user mastery state.
   - `POST /api/syllabus/node/:nodeId/toggle-complete` - Unlocks dependent downstream nodes and updates overall syllabus progress percentage.

---

## Acceptance Criteria
- [ ] Renders interactive syllabus dependency graph with smooth pan, zoom, and touch gestures.
- [ ] Nodes dynamically unlock only when all prerequisite parent nodes are marked as completed or mastered ($> 75\%$ score).
- [ ] Displays estimated syllabus completion date based on active study velocity.
- [ ] Responsive design supporting both desktop widescreen and mobile vertical tree fallback.
