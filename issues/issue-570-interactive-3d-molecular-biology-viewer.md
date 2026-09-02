---
title: '[FEAT]: Interactive 3D Molecular & Biology Structure Viewer with AI Annotation Tooltips'
labels: 'enhancement, frontend, ai, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Chemistry, Biochemistry, and Medical students preparing for competitive exams (NEET, MCAT, AP Chemistry, Pharmacy boards) need to visualize 3D molecular geometries, protein structures, and chemical conformations. 2D textbook drawings fail to convey spatial chirality, binding pockets, and isomerism.

This feature integrates an **Interactive 3D Molecular & Anatomical Structure Viewer** with AI-generated concept annotations.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D Molecular Canvas Viewer (`frontend/src/components/science/Molecule3DViewer.jsx`)**:
   - 3Dmol.js / Three.js canvas rendering for PDB (Protein Data Bank), SDF, and Mol2 file formats.
   - Render styles: Ball-and-Stick, Space-Filling (CPK), Ribbons, Cartoon, and Electrostatic Surface Potential.
   - Interactive mouse controls: 360-degree rotation, zoom, cross-section slicing, and measurement of atom-to-atom distances and bond angles.
2. **AI Interactive Annotation Overlay (`frontend/src/components/science/StructureAnnotations.jsx`)**:
   - Clickable hotspots on functional groups (e.g. hydroxyl, carboxyl, active binding sites) displaying concise exam notes.
   - Instant "Explain this functional group" AI tooltip explaining reactivity, acidity, and resonance.

### Backend Architecture
1. **PDB & Chemical Data Proxy (`backend/services/moleculeService.js`)**:
   - Proxies and caches standard PDB structure files from RCSB Protein Data Bank and PubChem.
2. **REST Endpoints (`backend/controllers/moleculeController.js`)**:
   - `GET /api/science/structures/:pdbId` - Retrieves and caches sanitized 3D structure data.
   - `POST /api/science/explain-structure` - Returns AI-generated breakdown of key exam highlights for the molecule.

---

## Acceptance Criteria
- [ ] 3D molecular structures load and rotate smoothly at 60 FPS on desktop and mobile browsers.
- [ ] Students can toggle between Ball & Stick, Space Filling, and Ribbon representations.
- [ ] Clicking on atoms/residues shows instant chemical information and AI concept notes.
- [ ] Pre-seeded with 50+ high-yield exam molecules (DNA Double Helix, Hemoglobin, Aspirin, Amino Acids, Glucose).
