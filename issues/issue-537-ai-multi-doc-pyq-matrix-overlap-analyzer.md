---
title: '[FEAT]: AI-Powered Multi-Doc Question Paper Matrix & Comparative Overlap Analyzer'
labels: 'enhancement, pyq-analysis, ai, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
When preparing for competitive examinations (JEE, NEET, GATE, UPSC, GRE), analyzing single past-year question papers in isolation gives limited perspective. Students need a multi-year comparative matrix to spot question repetition trends, shifting topic weightages, and emerging exam patterns over time.

This feature implements an **AI-Powered Multi-Doc Question Paper Matrix & Comparative Overlap Analyzer**.

---

## Technical Scope & Architecture

### Backend Architecture
1. **Multi-Doc Comparative Embedding Pipeline (`backend/services/pyqMatrixService.js`)**:
   - Ingests multiple parsed PYQ documents (up to 10 years / exam shifts).
   - Generates vector semantic embeddings for question stems and calculates cosine similarity clusters across years.
   - Categorizes recurring questions into: Exact Repeats, Conceptually Identical (parameter changes), and High-Probability Variant Patterns.
2. **Shift Weightage & Trend Delta Calculation**:
   - Aggregates topic distribution percentages across successive years and computes year-over-year momentum scores (+/- %).
3. **REST Endpoints**:
   - `POST /api/pyq/matrix-analysis` - Ingests array of PYQ IDs and initiates multi-document comparative clustering.
   - `GET /api/pyq/matrix-analysis/:id` - Retrieves topic overlap heatmaps, recurring concept clusters, and predicted weightages.

### Frontend Architecture
1. **Interactive Multi-Year Comparison Heatmap (`frontend/src/components/pyq/PYQMatrixHeatmap.jsx`)**:
   - Interactive matrix table showing Topics on Y-axis and Exam Years/Shifts on X-axis with color-intensity cells representing frequency.
2. **Recurring Concept Cluster Visualizer (`frontend/src/components/pyq/RecurringConceptClusters.jsx`)**:
   - Expandable card groups displaying similar questions asked in 2019, 2021, 2024 with side-by-side solution diffs.

---

## Acceptance Criteria
- [ ] Users can select multiple PYQ exam papers to generate a comparative cross-year matrix.
- [ ] Accurately identifies semantically similar and recurring questions across past examination papers.
- [ ] Heatmap visualizes year-over-year topic weightage trends with filterable difficulty thresholds.
