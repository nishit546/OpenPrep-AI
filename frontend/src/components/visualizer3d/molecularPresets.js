/**
 * Client-side 3D presets database for molecular and biological structures.
 * Features CPK element colors, 3D atomic coordinates, bond definitions, and functional 3D hotspots.
 */

export const MOLECULAR_PRESETS = {
  dna: {
    id: 'dna',
    name: 'DNA Double Helix',
    category: 'Genetics',
    formula: '(C₁₀H₁₃N₅O₆P)n',
    description: 'Double-stranded antiparallel polynucleotide right-handed helix held together by complementary base pairing.',
    summary: 'Central repository of genetic information across double-stranded helices with major and minor grooves.',
    atoms: [
      { id: 0, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.38, position: [0, -3.2, -1.4] },
      { id: 1, element: 'O', name: 'Phosphate Oxygen', color: 0xef4444, radius: 0.3, position: [0.6, -2.6, -1.2] },
      { id: 2, element: 'C', name: 'Deoxyribose C1', color: 0x334155, radius: 0.32, position: [0, -1.8, -0.7] },
      { id: 3, element: 'N', name: 'Adenine Base', color: 0x3b82f6, radius: 0.34, position: [0, -0.8, -0.2] },
      { id: 4, element: 'N', name: 'Thymine Base', color: 0xec4899, radius: 0.34, position: [0, 0.8, 0.2] },
      { id: 5, element: 'C', name: 'Deoxyribose C1', color: 0x334155, radius: 0.32, position: [0, 1.8, 0.7] },
      { id: 6, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.38, position: [0, 3.2, 1.4] },
      { id: 7, element: 'N', name: 'Guanine Base', color: 0x10b981, radius: 0.34, position: [0.8, -0.6, 0.5] },
      { id: 8, element: 'N', name: 'Cytosine Base', color: 0x8b5cf6, radius: 0.34, position: [-0.8, 0.6, -0.5] },
      { id: 9, element: 'P', name: 'Backbone Phosphate', color: 0xff9900, radius: 0.38, position: [1.4, -2.2, 0.8] },
      { id: 10, element: 'P', name: 'Backbone Phosphate', color: 0xff9900, radius: 0.38, position: [-1.4, 2.2, -0.8] },
    ],
    bonds: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
      [7, 8], [9, 7], [8, 10]
    ],
    hotspots: [
      {
        id: 'h-bond-pair',
        label: 'A-T Hydrogen Bonding Pair',
        category: 'Base Pair',
        position: [0, 0, 0],
        description: 'Complementary Adenine-Thymine pairing mediated by 2 specific hydrogen bonds.',
        clinicalRelevance: 'Target site for DNA polymerase during replication and PCR thermal denaturation.',
      },
      {
        id: 'sugar-phosphate',
        label: 'Phosphodiester Backbone',
        category: 'Backbone',
        position: [0, -3.2, -1.4],
        description: 'Negatively charged 5\' to 3\' sugar-phosphate backbone directing double-strand polarity.',
        clinicalRelevance: 'Interacts with basic Lysine/Arginine residues on Histone core octamers.',
      },
      {
        id: 'gc-base-pair',
        label: 'G-C Base Pair (3 H-Bonds)',
        category: 'Base Pair',
        position: [0, -0.2, 0],
        description: 'Triple hydrogen bond complementary pair providing elevated thermal stability.',
        clinicalRelevance: 'CpG island promoter hypermethylation leads to gene silencing in oncogenesis.',
      },
    ],
  },
  hemoglobin: {
    id: 'hemoglobin',
    name: 'Hemoglobin & Heme Complex',
    category: 'Biochemistry',
    formula: 'C₂₉₅₂H₄₆₆₄N∸₁₂O₈₃₂S₁₄Fe₄',
    description: 'Heterotetrameric metalloprotein containing iron-protoporphyrin IX complexes for oxygen transport.',
    summary: 'Erythrocyte oxygen carrier exhibiting cooperative allosteric binding and T-to-R state transitions.',
    atoms: [
      { id: 0, element: 'Fe', name: 'Iron Center (Fe²⁺)', color: 0xd97706, radius: 0.52, position: [0, 0, 0] },
      { id: 1, element: 'N', name: 'Pyrrole Nitrogen 1', color: 0x3b82f6, radius: 0.32, position: [0.9, 0, 0] },
      { id: 2, element: 'N', name: 'Pyrrole Nitrogen 2', color: 0x3b82f6, radius: 0.32, position: [-0.9, 0, 0] },
      { id: 3, element: 'N', name: 'Pyrrole Nitrogen 3', color: 0x3b82f6, radius: 0.32, position: [0, 0.9, 0] },
      { id: 4, element: 'N', name: 'Pyrrole Nitrogen 4', color: 0x3b82f6, radius: 0.32, position: [0, -0.9, 0] },
      { id: 5, element: 'O', name: 'Bound Diatomic Oxygen (O₂)', color: 0xef4444, radius: 0.38, position: [0, 0, 1.0] },
      { id: 6, element: 'N', name: 'Proximal His F8', color: 0x10b981, radius: 0.34, position: [0, 0, -1.0] },
      { id: 7, element: 'C', name: 'Porphyrin Ring Carbon', color: 0x475569, radius: 0.28, position: [1.2, 0.8, 0] },
      { id: 8, element: 'C', name: 'Porphyrin Ring Carbon', color: 0x475569, radius: 0.28, position: [-1.2, -0.8, 0] },
    ],
    bonds: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 7], [2, 8]
    ],
    hotspots: [
      {
        id: 'iron-center',
        label: 'Fe²⁺ Coordination Center',
        category: 'Active Site',
        position: [0, 0, 0],
        description: 'Central Ferrous iron atom coordinated within planar porphyrin nitrogen ring.',
        clinicalRelevance: 'Oxidation to Fe³⁺ causes Methemoglobinemia, diminishing oxygen delivery to tissues.',
      },
      {
        id: 'o2-ligated',
        label: 'Reversible O₂ Binding Pocket',
        category: 'Binding Site',
        position: [0, 0, 1.0],
        description: 'Reversible O₂ binding site located distal to the protoporphyrin ring plane.',
        clinicalRelevance: 'Carbon Monoxide binds with 200x higher affinity, locking hemoglobin in high-affinity R state.',
      },
    ],
  },
  enzyme: {
    id: 'enzyme',
    name: 'Enzyme-Substrate Active Site',
    category: 'Biochemistry',
    formula: 'Protease Complex',
    description: '3D catalytic pocket illustrating lock-and-key induced fit binding and catalytic triad activation.',
    summary: 'Biocatalytic protein active cavity that stabilizes transition states and lowers activation energy Ea.',
    atoms: [
      { id: 0, element: 'C', name: 'Substrate Backbone', color: 0x6366f1, radius: 0.38, position: [0, 0.4, 0] },
      { id: 1, element: 'O', name: 'Substrate Carbonyl', color: 0xef4444, radius: 0.32, position: [0.7, 0.4, 0.4] },
      { id: 2, element: 'N', name: 'Serine Active Nucleophile', color: 0x10b981, radius: 0.34, position: [-0.7, -0.4, 0] },
      { id: 3, element: 'N', name: 'Histidine Base Residue', color: 0x3b82f6, radius: 0.34, position: [0, -0.9, -0.6] },
      { id: 4, element: 'O', name: 'Aspartate Acid Residue', color: 0xf59e0b, radius: 0.34, position: [0.7, -0.7, -0.6] },
    ],
    bonds: [
      [0, 1], [0, 2], [2, 3], [3, 4]
    ],
    hotspots: [
      {
        id: 'catalytic-triad',
        label: 'Ser-His-Asp Catalytic Pocket',
        category: 'Active Site',
        position: [-0.7, -0.4, 0],
        description: 'Histidine abstracts a proton from Serine to generate a potent alkoxide nucleophile.',
        clinicalRelevance: 'Targeted by competitive inhibitors and covalent inactivators like Organophosphates.',
      },
    ],
  },
  membrane: {
    id: 'membrane',
    name: 'Phospholipid Membrane Bilayer',
    category: 'Cell Biology',
    formula: 'Fluid Mosaic Bilayer',
    description: 'Amphipathic lipid bilayer comprising hydrophilic phosphate heads and hydrophobic fatty acid tails.',
    summary: 'Selective permeability barrier regulating osmotic balance, cell signaling, and ion transport.',
    atoms: [
      { id: 0, element: 'P', name: 'Outer Phosphate Head', color: 0x3b82f6, radius: 0.42, position: [0, 1.6, 0] },
      { id: 1, element: 'C', name: 'Fatty Acid Tail 1', color: 0xf59e0b, radius: 0.28, position: [0, 0.6, 0.2] },
      { id: 2, element: 'C', name: 'Fatty Acid Tail 2', color: 0xf59e0b, radius: 0.28, position: [0, -0.6, 0.2] },
      { id: 3, element: 'P', name: 'Inner Phosphate Head', color: 0x3b82f6, radius: 0.42, position: [0, -1.6, 0] },
      { id: 4, element: 'Ca', name: 'Ion Channel Transport Pore', color: 0x10b981, radius: 0.48, position: [1.6, 0, 0] },
    ],
    bonds: [
      [0, 1], [1, 2], [2, 3]
    ],
    hotspots: [
      {
        id: 'hydrophobic-core',
        label: 'Hydrophobic Lipid Core',
        category: 'Non-Polar Domain',
        position: [0, 0, 0.2],
        description: 'Non-polar acyl chain core preventing spontaneous entry of charged hydrophilic solutes.',
        clinicalRelevance: 'Cholesterol modulates fluidity; lipid-soluble lipophilic drugs cross this core rapidly.',
      },
    ],
  },
  water: {
    id: 'water',
    name: 'Water Molecule (H₂O) & Dipole',
    category: 'Chemistry',
    formula: 'H₂O',
    description: 'Bent molecular geometry (104.5°) with highly polar covalent O-H bonds and hydrogen bonding capacity.',
    summary: 'Universal biological solvent with high specific heat capacity, surface tension, and dielectric constant.',
    atoms: [
      { id: 0, element: 'O', name: 'Oxygen Atom', color: 0xef4444, radius: 0.45, position: [0, 0.1, 0] },
      { id: 1, element: 'H', name: 'Hydrogen 1', color: 0xffffff, radius: 0.26, position: [-0.7, -0.5, 0] },
      { id: 2, element: 'H', name: 'Hydrogen 2', color: 0xffffff, radius: 0.26, position: [0.7, -0.5, 0] },
    ],
    bonds: [
      [0, 1], [0, 2]
    ],
    hotspots: [
      {
        id: 'dipole-moment',
        label: 'Oxygen Electronegativity Dipole',
        category: 'Dipole',
        position: [0, 0.1, 0],
        description: 'Partial negative charge (&delta;&minus;) on Oxygen creates a strong molecular dipole moment.',
        clinicalRelevance: 'Hydration shell formation around proteins stabilizes native tertiary 3D structures.',
      },
    ],
  },
  methane: {
    id: 'methane',
    name: 'Methane (CH₄)',
    category: 'Organic Chemistry',
    formula: 'CH₄',
    description: 'Symmetrical tetrahedral hydrocarbon molecule with sp³ hybridized central carbon atom.',
    summary: 'Simplest alkane displaying 109.5° tetrahedral bond angles.',
    atoms: [
      { id: 0, element: 'C', name: 'Central Carbon (sp³)', color: 0x334155, radius: 0.42, position: [0, 0, 0] },
      { id: 1, element: 'H', name: 'Hydrogen 1', color: 0xffffff, radius: 0.26, position: [0.6, 0.6, 0.6] },
      { id: 2, element: 'H', name: 'Hydrogen 2', color: 0xffffff, radius: 0.26, position: [-0.6, -0.6, 0.6] },
      { id: 3, element: 'H', name: 'Hydrogen 3', color: 0xffffff, radius: 0.26, position: [0.6, -0.6, -0.6] },
      { id: 4, element: 'H', name: 'Hydrogen 4', color: 0xffffff, radius: 0.26, position: [-0.6, 0.6, -0.6] },
    ],
    bonds: [
      [0, 1], [0, 2], [0, 3], [0, 4]
    ],
    hotspots: [
      {
        id: 'tetrahedral-angle',
        label: '109.5° Tetrahedral Angle',
        category: 'Geometry',
        position: [0, 0, 0],
        description: 'Ideal sp³ orbital hybridization angle minimizing electron pair repulsion (VSEPR theory).',
        clinicalRelevance: 'Fundamental geometric building block of aliphatic hydrocarbon chains in biochemistry.',
      },
    ],
  },
};

export default MOLECULAR_PRESETS;
