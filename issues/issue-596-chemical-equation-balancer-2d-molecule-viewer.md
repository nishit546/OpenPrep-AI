---
title: '[FEAT]: Multi-Modal Formula & Chemical Equation Auto-Balancer with KaTeX & SMILES 2D Molecule Viewer'
labels: 'enhancement, frontend, backend, ui/ux, medium-priority, ECSoC26, ECSoC26-L2'
assignees: ''
---

## Summary & Motivation
Chemistry students studying for AP Chemistry, NEET, JEE, and General Chemistry frequently struggle with balancing redox reactions, stoichiometry calculations, and visualizing organic IUPAC structures from SMILES strings.

This feature builds a **Chemical Equation Auto-Balancer and 2D/3D Molecule Visualizer** supporting KaTeX chemical formula notation and interactive SMILES structure rendering.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Chemical Equation Input & Balancer Tool (`frontend/src/components/chemistry/EquationBalancer.jsx`)**:
   - Chemical formula input supporting states of matter, charges, and polyatomic ions (e.g., `KMnO4 + HCl -> KCl + MnCl2 + H2O + Cl2`).
   - Displays balanced coefficients with oxidation states and reaction type classification (Redox, Precipitation, Acid-Base).
2. **2D/3D Organic Molecule Viewer (`frontend/src/components/chemistry/MoleculeViewer.jsx`)**:
   - SmilesDrawer / RDKit.js integration rendering 2D skeletal structures from chemical names or SMILES strings (e.g., `CC(=O)Oc1ccccc1C(=O)O` for Aspirin).
   - Interactive 3D Ball-and-Stick rotation mode using 3Dmol.js.

### Backend Architecture
1. **Chemical Matrix Balancing Engine (`backend/services/chemistryEngineService.js`)**:
   - Matrix null-space linear algebra algorithm balancing stoichiometric equations with integer coefficient minimization.
   - Stoichiometry solver computing limiting reagents, molar masses, and theoretical yields.
2. **REST Endpoints (`backend/controllers/chemistryController.js`)**:
   - `POST /api/chemistry/balance` - Accepts raw chemical reaction and returns balanced equation + reaction classification.
   - `POST /api/chemistry/stoichiometry` - Calculates molar quantities and theoretical yields for given reactant masses.

---

## Acceptance Criteria
- [ ] Balances complex redox and polyatomic reactions accurately with smallest integer coefficients.
- [ ] Renders 2D organic chemical skeletal structures correctly from standard SMILES strings.
- [ ] Stoichiometry solver computes limiting reagents and molar masses accurately with unit conversions.
- [ ] Jest test suite verifying 30+ canonical chemistry exam equations and matrix balancing edge cases.
