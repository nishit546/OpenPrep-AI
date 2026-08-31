/**
 * @fileoverview Molecular & Biological 3D Structure Data & AI Explanation Service.
 * Provides 3D atomic coordinates, bond mappings, functional annotation hotspots,
 * and Gemini AI structural explanation integrations.
 */
const { generateAiText } = require('../services/geminiService');

const MOLECULAR_PRESETS = {
  dna: {
    id: 'dna',
    name: 'DNA Double Helix',
    category: 'Genetics',
    formula: '(C₁₀H₁₃N₅O₆P)n',
    description: 'Deoxyribonucleic acid double-stranded right-handed helix with anti-parallel strands and complementary nitrogenous base pairs.',
    summary: 'The fundamental hereditary material storing genetic code across double-stranded antiparallel polynucleotide chains connected via hydrogen bonding.',
    atoms: [
      // Strand 1 Backbone & Base Pairs (P, O, C, N)
      { id: 0, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.35, position: [0, -3.0, -1.2] },
      { id: 1, element: 'O', name: 'Phosphate Oxygen', color: 0xff0000, radius: 0.28, position: [0.5, -2.5, -1.0] },
      { id: 2, element: 'C', name: 'Deoxyribose C1', color: 0x333333, radius: 0.3, position: [0, -1.8, -0.6] },
      { id: 3, element: 'N', name: 'Adenine N9', color: 0x3b82f6, radius: 0.3, position: [0, -0.8, -0.2] },
      { id: 4, element: 'N', name: 'Thymine N1', color: 0xec4899, radius: 0.3, position: [0, 0.8, 0.2] },
      { id: 5, element: 'C', name: 'Deoxyribose C1', color: 0x333333, radius: 0.3, position: [0, 1.8, 0.6] },
      { id: 6, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.35, position: [0, 3.0, 1.2] },
      
      // Helix Spiral Layer 2
      { id: 7, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.35, position: [1.2, -2.0, 0] },
      { id: 8, element: 'N', name: 'Guanine N9', color: 0x10b981, radius: 0.3, position: [0.6, -0.6, 0.4] },
      { id: 9, element: 'N', name: 'Cytosine N1', color: 0x8b5cf6, radius: 0.3, position: [-0.6, 0.6, -0.4] },
      { id: 10, element: 'P', name: 'Phosphorus', color: 0xff9900, radius: 0.35, position: [-1.2, 2.0, 0] },
    ],
    bonds: [
      [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6],
      [7, 8], [8, 9], [9, 10], [3, 8], [4, 9]
    ],
    hotspots: [
      {
        id: 'h-bond-pair',
        label: 'A-T Hydrogen Bonding Site',
        category: 'Base Pair',
        position: [0, 0, 0],
        description: 'Adenine pairs specifically with Thymine via 2 hydrogen bonds (N-H...O and N-H...N).',
        clinicalRelevance: 'Target for PCR primers and intercalating chemotherapeutic agents like Doxorubicin.',
      },
      {
        id: 'sugar-phosphate',
        label: 'Phosphodiester Backbone',
        category: 'Backbone',
        position: [0, -3.0, -1.2],
        description: 'Negatively charged sugar-phosphate backbone providing structural stability and high solubility.',
        clinicalRelevance: 'Extracellular DNA backbone charges interact with Histone proteins during chromatin remodeling.',
      },
      {
        id: 'gc-base-pair',
        label: 'G-C Base Pair (3 H-Bonds)',
        category: 'Base Pair',
        position: [0, 0, 0],
        description: 'Guanine pairs with Cytosine via 3 strong hydrogen bonds, requiring higher denaturation temperature (Tm).',
        clinicalRelevance: 'High GC content regions (CpG islands) are primary epigenetic methylation targets.',
      },
    ],
  },
  hemoglobin: {
    id: 'hemoglobin',
    name: 'Hemoglobin & Heme Complex',
    category: 'Biochemistry',
    formula: 'C₂₉₅₂H₄₆₆₄N₈₁₂O₈₃₂S₁₄Fe₄',
    description: 'Tetrameric metalloprotein transport system composed of 2 alpha and 2 beta subunits with Fe²⁺ iron-porphyrin rings.',
    summary: 'The primary oxygen-carrying protein in erythrocytes exhibiting sigmoidal allosteric cooperativity and Bohr effect regulation.',
    atoms: [
      { id: 0, element: 'Fe', name: 'Iron (Fe²⁺) Center', color: 0xd97706, radius: 0.5, position: [0, 0, 0] },
      { id: 1, element: 'N', name: 'Porphyrin Nitrogen 1', color: 0x3b82f6, radius: 0.3, position: [0.8, 0, 0] },
      { id: 2, element: 'N', name: 'Porphyrin Nitrogen 2', color: 0x3b82f6, radius: 0.3, position: [-0.8, 0, 0] },
      { id: 3, element: 'N', name: 'Porphyrin Nitrogen 3', color: 0x3b82f6, radius: 0.3, position: [0, 0.8, 0] },
      { id: 4, element: 'N', name: 'Porphyrin Nitrogen 4', color: 0x3b82f6, radius: 0.3, position: [0, -0.8, 0] },
      { id: 5, element: 'O', name: 'Bound Oxygen (O₂)', color: 0xef4444, radius: 0.35, position: [0, 0, 0.9] },
      { id: 6, element: 'N', name: 'Proximal His F8 Nitrogen', color: 0x10b981, radius: 0.32, position: [0, 0, -0.9] },
    ],
    bonds: [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6]
    ],
    hotspots: [
      {
        id: 'iron-center',
        label: 'Fe²⁺ Heme Coordination Center',
        category: 'Active Site',
        position: [0, 0, 0],
        description: 'Ferrous Iron (Fe²⁺) located at the center of the protoporphyrin IX ring coordinating reversibly with O₂.',
        clinicalRelevance: 'Oxidation of Fe²⁺ to Fe³⁺ forms Methemoglobin, which cannot bind oxygen efficiently.',
      },
      {
        id: 'oxygen-ligation',
        label: 'O₂ Binding Pocket',
        category: 'Binding Site',
        position: [0, 0, 0.9],
        description: 'Reversible ligation of diatomic oxygen shifts the iron atom into the plane of the heme ring.',
        clinicalRelevance: 'Carbon Monoxide (CO) binds to this site with 200x higher affinity than O₂, causing CO poisoning.',
      },
      {
        id: 'his-f8',
        label: 'Proximal Histidine (His F8)',
        category: 'Structural Ligand',
        position: [0, 0, -0.9],
        description: 'Directly coordinates with Fe²⁺ from the F-helix, transmitting conformational shifts during oxygenation (T to R transition).',
        clinicalRelevance: 'Key mediator of cooperative oxygen binding curve (sigmoidal kinetics).',
      },
    ],
  },
  enzyme: {
    id: 'enzyme',
    name: 'Enzyme Active Site & Substrate Complex',
    category: 'Biochemistry',
    description: '3D catalytic pocket illustrating lock-and-key induced fit binding, active site residue interactions, and competitive inhibition.',
    summary: 'Biocatalytic protein structure that lowers activation energy (Ea) without altering overall equilibrium.',
    atoms: [
      { id: 0, element: 'C', name: 'Substrate Carbon 1', color: 0x6366f1, radius: 0.35, position: [0, 0.3, 0] },
      { id: 1, element: 'O', name: 'Substrate Oxygen', color: 0xef4444, radius: 0.3, position: [0.6, 0.3, 0.4] },
      { id: 2, element: 'N', name: 'Serine Active Nucleophile', color: 0x10b981, radius: 0.32, position: [-0.6, -0.4, 0] },
      { id: 3, element: 'N', name: 'Histidine Base Residue', color: 0x3b82f6, radius: 0.32, position: [0, -0.8, -0.5] },
      { id: 4, element: 'O', name: 'Aspartate Stabilizing Acid', color: 0xf59e0b, radius: 0.32, position: [0.6, -0.6, -0.5] },
    ],
    bonds: [
      [0, 1], [0, 2], [2, 3], [3, 4]
    ],
    hotspots: [
      {
        id: 'catalytic-triad',
        label: 'Ser-His-Asp Catalytic Triad',
        category: 'Active Site',
        position: [-0.6, -0.4, 0],
        description: 'Classic serine protease catalytic triad where Histidine acts as a general base to activate Serine as a nucleophile.',
        clinicalRelevance: 'Target of serine protease inhibitors like Aprotinin and organophosphate nerve agents.',
      },
      {
        id: 'substrate-pocket',
        label: 'Substrate Binding Pocket',
        category: 'Binding Site',
        position: [0, 0.3, 0],
        description: 'Specific hydrophobic and electrostatic cavity inducing optimal transition-state alignment.',
        clinicalRelevance: 'Competitive inhibitors bind directly to this pocket to prevent substrate access.',
      },
    ],
  },
  membrane: {
    id: 'membrane',
    name: 'Phospholipid Membrane Bilayer',
    category: 'Cell Biology',
    description: 'Amphipathic lipid bilayer comprising hydrophilic glycerol-phosphate heads and hydrophobic fatty acid tails.',
    summary: 'Selectively permeable fluid-mosaic cellular membrane regulating intracellular homeostasis and signal transduction.',
    atoms: [
      { id: 0, element: 'P', name: 'Phosphate Head 1', color: 0x3b82f6, radius: 0.4, position: [0, 1.5, 0] },
      { id: 1, element: 'C', name: 'Fatty Acid Tail A1', color: 0xf59e0b, radius: 0.28, position: [0, 0.6, 0.2] },
      { id: 2, element: 'C', name: 'Fatty Acid Tail A2', color: 0xf59e0b, radius: 0.28, position: [0, -0.6, 0.2] },
      { id: 3, element: 'P', name: 'Phosphate Head 2', color: 0x3b82f6, radius: 0.4, position: [0, -1.5, 0] },
      { id: 4, element: 'Ca', name: 'Ion Channel Pore Center', color: 0x10b981, radius: 0.45, position: [1.5, 0, 0] },
    ],
    bonds: [
      [0, 1], [1, 2], [2, 3]
    ],
    hotspots: [
      {
        id: 'hydrophilic-head',
        label: 'Hydrophilic Phosphate Head',
        category: 'Polar Domain',
        position: [0, 1.5, 0],
        description: 'Polar glycerol-phosphate head interacting with aqueous extracellular and intracellular environments.',
        clinicalRelevance: 'Phosphatidylserine exposure on outer membrane serves as an apoptotic signaling tag for macrophages.',
      },
      {
        id: 'hydrophobic-core',
        label: 'Hydrophobic Fatty Acid Core',
        category: 'Non-Polar Domain',
        position: [0, 0, 0.2],
        description: 'Non-polar hydrocarbon tail barrier preventing passive diffusion of polar ions and macromolecules.',
        clinicalRelevance: 'Cholesterol molecules intercalate into this core to regulate membrane fluidity and phase transition.',
      },
      {
        id: 'channel-pore',
        label: 'Transmembrane Ion Channel Pore',
        category: 'Transporter',
        position: [1.5, 0, 0],
        description: 'Integral membrane protein pore facilitating selective ion flux (Na⁺, K⁺, Ca²⁺).',
        clinicalRelevance: 'Target for local anesthetics (e.g. Lidocaine blocking voltage-gated Na⁺ channels).',
      },
    ],
  },
};

/**
 * Returns summary list of available 3D molecular presets.
 */
async function getStructurePresets() {
  return Object.values(MOLECULAR_PRESETS).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    formula: p.formula || '',
    description: p.description,
    hotspotCount: p.hotspots.length,
    atomCount: p.atoms.length,
  }));
}

/**
 * Returns full 3D coordinates, bonds, and annotation hotspots for a structure ID.
 */
async function getStructureById(id) {
  const preset = MOLECULAR_PRESETS[id];
  if (!preset) return null;
  return preset;
}

/**
 * Uses Gemini AI to generate detailed structural breakdown and clinical relevance explanations.
 */
async function generateAiExplanation(structureId, hotspotId, userPrompt = '') {
  const preset = MOLECULAR_PRESETS[structureId];
  if (!preset) {
    throw new Error('Structure not found');
  }

  const hotspot = preset.hotspots.find((h) => h.id === hotspotId);
  const hotspotContext = hotspot
    ? `Target Domain/Hotspot: "${hotspot.label}" (${hotspot.category}). Existing note: ${hotspot.description}`
    : `Overall Structure: ${preset.name} (${preset.category})`;

  const promptText = `You are an expert Professor of Molecular Biology and Biochemistry at OpenPrep AI.
Provide a clear, high-yield educational breakdown for the 3D structure: "${preset.name}".
Context: ${hotspotContext}
Formula/Composition: ${preset.formula || 'N/A'}
User Question: ${userPrompt || 'Explain the 3D spatial conformation, chemical bonding, biological role, and key clinical relevance for medical/biology exams.'}

Formatting Guidelines:
- Return a concise, beautifully structured response with 3 bulleted sections:
  1. 🧬 Spatial & Chemical Structure
  2. ⚡ Biological & Catalytic Function
  3. 🩺 Clinical & Pharmaceutical Significance
- Keep total length around 180-250 words. Be high-yield and memorable.`;

  const aiText = await generateAiText(promptText);

  return {
    structureId,
    hotspotId: hotspotId || null,
    explanation: aiText,
  };
}

module.exports = {
  getStructurePresets,
  getStructureById,
  generateAiExplanation,
};
