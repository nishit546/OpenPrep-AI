---
title: '[FEAT]: Interactive Chemical Equation Balancer & Organic Reaction Mechanism Animator with Smiles Viewer'
labels: 'enhancement, frontend, edtech, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Chemistry students studying for competitive exams frequently struggle with stoichiometric redox equation balancing and visualizing electron-pushing arrow mechanisms in organic chemistry reactions ($S_N1$, $S_N2$, $E1$, $E2$, Electrophilic Aromatic Substitution).

This feature introduces an **Interactive Chemistry Laboratory Suite** containing an automated algebraic chemical equation balancer, oxidation state tracker, and an animated 2D/3D organic reaction mechanism visualizer using SMILES/Molfile parsing.

---

## Technical Scope & Architecture

### Algorithmic Engine & Frontend Visualizer
1. **Chemical Stoichiometry & Redox Balancer (`frontend/src/utils/chemistry/balancer.js`)**:
   - Parses chemical formula strings (e.g. `KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2`).
   - Constructs atom matrix and computes null space using Gaussian elimination to determine integer stoichiometric coefficients.
   - Calculates oxidation states for each atom and highlights reduction/oxidation half-reactions.
2. **Organic Mechanism & SMILES Renderer (`frontend/src/components/chemistry/MechanismViewer.jsx`)**:
   - Integrates `smiles-drawer` and `rdkit.js` WebAssembly for crisp vector molecular structure rendering.
   - Displays step-by-step reaction mechanisms with animated curved arrows showing electron pair movements, nucleophilic attacks, and leaving group departures.
   - Interactive 3D Ball-and-Stick molecule viewer with rotational controls.

---

## Acceptance Criteria
- [ ] Correctly balances complex redox and precipitation equations in $< 50\text{ms}$.
- [ ] Clearly displays oxidation number changes for half-reactions in acidic and basic media.
- [ ] Renders organic molecules from standard SMILES strings with stereochemical wedge/dash bonds.
- [ ] Interactive step-by-step animation controls for organic reaction mechanisms.
