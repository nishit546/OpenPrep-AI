import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Atom,
  Info,
  Scale,
  Sparkles,
  Layers,
  Activity
} from 'lucide-react';
import EquationBalancerModal from './EquationBalancerModal';

// Standard CPK Coloring
const CPK_COLORS = {
  H: 0xf3f4f6,  // White / Light Grey
  C: 0x374151,  // Dark Grey / Charcoal
  O: 0xef4444,  // Red
  N: 0x3b82f6,  // Blue
  Cl: 0x10b981, // Green
  S: 0xf59e0b,  // Yellow
  P: 0xf97316,  // Orange
};

const ATOM_RADII = {
  H: 0.35,
  C: 0.7,
  O: 0.65,
  N: 0.68,
  Cl: 0.85,
  S: 0.9,
  P: 0.88,
};

// Built-in library of exam-standard 3D molecular structures
export const MOLECULE_LIBRARY = {
  water: {
    name: 'Water (H₂O)',
    formula: 'H2O',
    geometry: 'Bent (104.5°)',
    hybridization: 'sp³',
    description: 'Polar solvent with strong intermolecular hydrogen bonding.',
    atoms: [
      { element: 'O', x: 0, y: 0.1, z: 0, charge: -0.68 },
      { element: 'H', x: -0.76, y: -0.5, z: 0, charge: 0.34 },
      { element: 'H', x: 0.76, y: -0.5, z: 0, charge: 0.34 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
    ],
  },
  methane: {
    name: 'Methane (CH₄)',
    formula: 'CH4',
    geometry: 'Tetrahedral (109.5°)',
    hybridization: 'sp³',
    description: 'Simplest alkane with symmetric non-polar covalent bonds.',
    atoms: [
      { element: 'C', x: 0, y: 0, z: 0, charge: -0.16 },
      { element: 'H', x: 0.63, y: 0.63, z: 0.63, charge: 0.04 },
      { element: 'H', x: -0.63, y: -0.63, z: 0.63, charge: 0.04 },
      { element: 'H', x: -0.63, y: 0.63, z: -0.63, charge: 0.04 },
      { element: 'H', x: 0.63, y: -0.63, z: -0.63, charge: 0.04 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ],
  },
  benzene: {
    name: 'Benzene (C₆H₆)',
    formula: 'C6H6',
    geometry: 'Planar Hexagonal (120°)',
    hybridization: 'sp²',
    description: 'Aromatic hydrocarbon with delocalized pi electron cloud.',
    atoms: [
      { element: 'C', x: 1.4, y: 0, z: 0, charge: -0.06 },
      { element: 'C', x: 0.7, y: 1.21, z: 0, charge: -0.06 },
      { element: 'C', x: -0.7, y: 1.21, z: 0, charge: -0.06 },
      { element: 'C', x: -1.4, y: 0, z: 0, charge: -0.06 },
      { element: 'C', x: -0.7, y: -1.21, z: 0, charge: -0.06 },
      { element: 'C', x: 0.7, y: -1.21, z: 0, charge: -0.06 },
      // Hydrogens
      { element: 'H', x: 2.48, y: 0, z: 0, charge: 0.06 },
      { element: 'H', x: 1.24, y: 2.15, z: 0, charge: 0.06 },
      { element: 'H', x: -1.24, y: 2.15, z: 0, charge: 0.06 },
      { element: 'H', x: -2.48, y: 0, z: 0, charge: 0.06 },
      { element: 'H', x: -1.24, y: -2.15, z: 0, charge: 0.06 },
      { element: 'H', x: 1.24, y: -2.15, z: 0, charge: 0.06 },
    ],
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 6],
      [1, 7],
      [2, 8],
      [3, 9],
      [4, 10],
      [5, 11],
    ],
  },
  aspirin: {
    name: 'Aspirin (Acetylsalicylic Acid)',
    formula: 'C9H8O4',
    geometry: 'Mixed sp² / sp³',
    hybridization: 'sp² / sp³',
    description: 'Analgesic compound containing aromatic ring, ester, and carboxylic acid.',
    atoms: [
      { element: 'C', x: 0, y: 0, z: 0, charge: 0.1 },
      { element: 'C', x: 1.2, y: 0.7, z: 0, charge: 0.0 },
      { element: 'C', x: 2.4, y: 0, z: 0, charge: 0.0 },
      { element: 'C', x: 2.4, y: -1.4, z: 0, charge: 0.0 },
      { element: 'C', x: 1.2, y: -2.1, z: 0, charge: 0.0 },
      { element: 'C', x: 0, y: -1.4, z: 0, charge: 0.1 },
      // Carboxylic group
      { element: 'C', x: -1.3, y: 0.7, z: 0.1, charge: 0.45 },
      { element: 'O', x: -1.5, y: 1.9, z: 0.1, charge: -0.5 },
      { element: 'O', x: -2.3, y: -0.2, z: 0.1, charge: -0.4 },
      // Acetyl group
      { element: 'O', x: -1.2, y: -2.1, z: -0.1, charge: -0.35 },
      { element: 'C', x: -1.4, y: -3.4, z: -0.2, charge: 0.4 },
      { element: 'O', x: -0.5, y: -4.2, z: -0.2, charge: -0.45 },
      { element: 'C', x: -2.8, y: -3.9, z: -0.3, charge: -0.1 },
    ],
    bonds: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 6],
      [6, 7],
      [6, 8],
      [5, 9],
      [9, 10],
      [10, 11],
      [10, 12],
    ],
  },
  cis_butene: {
    name: 'cis-2-Butene',
    formula: 'C4H8',
    geometry: 'Trigonal Planar (C=C)',
    hybridization: 'sp²',
    description: 'Geometric stereoisomer with both methyl groups on the same side (cis).',
    atoms: [
      { element: 'C', x: -0.67, y: 0, z: 0, charge: 0 },
      { element: 'C', x: 0.67, y: 0, z: 0, charge: 0 },
      { element: 'C', x: -1.5, y: 1.25, z: 0, charge: -0.1 },
      { element: 'C', x: 1.5, y: 1.25, z: 0, charge: -0.1 },
      { element: 'H', x: -1.2, y: -0.9, z: 0, charge: 0.05 },
      { element: 'H', x: 1.2, y: -0.9, z: 0, charge: 0.05 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [1, 3],
      [0, 4],
      [1, 5],
    ],
  },
  trans_butene: {
    name: 'trans-2-Butene',
    formula: 'C4H8',
    geometry: 'Trigonal Planar (C=C)',
    hybridization: 'sp²',
    description: 'Geometric stereoisomer with methyl groups on opposite sides (trans, zero dipole moment).',
    atoms: [
      { element: 'C', x: -0.67, y: 0, z: 0, charge: 0 },
      { element: 'C', x: 0.67, y: 0, z: 0, charge: 0 },
      { element: 'C', x: -1.5, y: 1.25, z: 0, charge: -0.1 },
      { element: 'C', x: 1.5, y: -1.25, z: 0, charge: -0.1 },
      { element: 'H', x: -1.2, y: -0.9, z: 0, charge: 0.05 },
      { element: 'H', x: 1.2, y: 1.25, z: 0, charge: 0.05 },
    ],
    bonds: [
      [0, 1],
      [0, 2],
      [1, 3],
      [0, 4],
      [1, 5],
    ],
  },
};

export default function MolecularViewer3D() {
  const mountRef = useRef(null);
  const [selectedKey, setSelectedKey] = useState('benzene');
  const [showPotential, setShowPotential] = useState(false);
  const [inspectingAtom, setInspectingAtom] = useState(null);
  const [showBalancerModal, setShowBalancerModal] = useState(false);

  const activeMolecule = MOLECULE_LIBRARY[selectedKey];

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 600;
    const height = currentMount.clientHeight || 400;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // Slate-900

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.replaceChildren(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x60a5fa, 0.6);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // 3. Molecular Group
    const molGroup = new THREE.Group();
    scene.add(molGroup);

    const atomMeshes = [];
    const sphereGeo = new THREE.SphereGeometry(1, 32, 32);

    // Render Atoms
    activeMolecule.atoms.forEach((atom, idx) => {
      const radius = ATOM_RADII[atom.element] || 0.5;

      let atomColor = CPK_COLORS[atom.element] || 0xcccccc;
      if (showPotential) {
        // Electrostatic Potential coloring: Red (negative) to Blue (positive)
        if (atom.charge < 0) {
          atomColor = 0xef4444;
        } else if (atom.charge > 0) {
          atomColor = 0x3b82f6;
        } else {
          atomColor = 0x10b981;
        }
      }

      const mat = new THREE.MeshPhongMaterial({
        color: atomColor,
        shininess: 90,
        specular: 0x444444,
      });

      const mesh = new THREE.Mesh(sphereGeo, mat);
      mesh.scale.set(radius, radius, radius);
      mesh.position.set(atom.x, atom.y, atom.z);
      mesh.userData = { ...atom, index: idx };

      molGroup.add(mesh);
      atomMeshes.push(mesh);
    });

    // Render Bonds as Cylinders
    activeMolecule.bonds.forEach(([i, j]) => {
      const a1 = activeMolecule.atoms[i];
      const a2 = activeMolecule.atoms[j];
      if (!a1 || !a2) return;

      const p1 = new THREE.Vector3(a1.x, a1.y, a1.z);
      const p2 = new THREE.Vector3(a2.x, a2.y, a2.z);
      const distance = p1.distanceTo(p2);

      const cylinderGeo = new THREE.CylinderGeometry(0.12, 0.12, distance, 16);
      const bondMat = new THREE.MeshPhongMaterial({
        color: 0x94a3b8, // Slate-400
        shininess: 50,
      });

      const cylinder = new THREE.Mesh(cylinderGeo, bondMat);
      // Position halfway between p1 and p2
      const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      cylinder.position.copy(midpoint);

      // Orient cylinder towards p2
      cylinder.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        p2.clone().sub(p1).normalize()
      );

      molGroup.add(cylinder);
    });

    // 4. Interactive Mouse Controls (Rotate, Zoom, Pan)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;

      molGroup.rotation.y += deltaX * 0.01;
      molGroup.rotation.x += deltaY * 0.01;

      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e) => {
      e.preventDefault();
      camera.position.z = Math.max(3, Math.min(18, camera.position.z + e.deltaY * 0.005));
    };

    // Raycaster for atom inspection click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e) => {
      const rect = currentMount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(atomMeshes);

      if (intersects.length > 0) {
        setInspectingAtom(intersects[0].object.userData);
      }
    };

    currentMount.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    currentMount.addEventListener('wheel', onWheel, { passive: false });
    currentMount.addEventListener('click', onClick);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging) {
        molGroup.rotation.y += 0.003; // Gentle idle auto-spin
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const newW = currentMount.clientWidth;
      const newH = currentMount.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      currentMount.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      currentMount.removeEventListener('wheel', onWheel);
      currentMount.removeEventListener('click', onClick);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [selectedKey, showPotential, activeMolecule]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Atom className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Interactive 3D Molecular Viewer & Stereochemistry Studio
            </h2>
            <p className="text-xs text-neutral-400">
              WebGL ball-and-stick models for JEE / NEET / AP Chemistry visualization
            </p>
          </div>
        </div>

        {/* Action Buttons: Reaction Balancer trigger */}
        <button
          onClick={() => setShowBalancerModal(true)}
          className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/20 transition cursor-pointer self-start sm:self-auto"
        >
          <Scale className="w-4 h-4" /> Reaction Balancer
        </button>
      </div>

      {/* Controls & Molecule Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          <span className="text-neutral-400 font-semibold flex-shrink-0">Molecule:</span>
          {Object.entries(MOLECULE_LIBRARY).map(([key, mol]) => (
            <button
              key={key}
              onClick={() => {
                setSelectedKey(key);
                setInspectingAtom(null);
              }}
              className={`px-3 py-1.5 rounded-xl font-semibold flex-shrink-0 transition cursor-pointer ${
                selectedKey === key
                  ? 'bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300'
              }`}
            >
              {mol.name}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPotential((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showPotential
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ESP Potential Overlay</span>
          </button>
        </div>
      </div>

      {/* 3D Canvas Viewport */}
      <div className="relative w-full h-[380px] rounded-2xl overflow-hidden border border-neutral-800 shadow-inner bg-slate-950">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Overlaid Molecule Metadata Badge */}
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-neutral-900/85 backdrop-blur-md border border-neutral-700/70 text-xs space-y-1 pointer-events-none max-w-xs shadow-lg">
          <div className="font-bold text-white text-sm">{activeMolecule.name}</div>
          <div className="text-cyan-400 font-mono text-[11px]">Formula: {activeMolecule.formula}</div>
          <div className="text-neutral-300 text-[11px]">Geometry: {activeMolecule.geometry}</div>
          <div className="text-neutral-300 text-[11px]">Hybridization: {activeMolecule.hybridization}</div>
          <p className="text-neutral-400 text-[10px] pt-1 border-t border-neutral-800">
            {activeMolecule.description}
          </p>
        </div>

        {/* Atom Click Inspection Modal/Overlay */}
        {inspectingAtom && (
          <div className="absolute bottom-4 left-4 p-3.5 rounded-xl bg-neutral-900/90 backdrop-blur-md border border-cyan-500/40 text-xs text-white max-w-xs shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between font-bold text-cyan-300 mb-1">
              <span>Selected Atom: #{inspectingAtom.index + 1} ({inspectingAtom.element})</span>
              <button
                onClick={() => setInspectingAtom(null)}
                className="text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="text-[11px] space-y-0.5 text-neutral-300 font-mono">
              <div>Coordinates: ({inspectingAtom.x.toFixed(2)}, {inspectingAtom.y.toFixed(2)}, {inspectingAtom.z.toFixed(2)})</div>
              <div>Partial Charge: {inspectingAtom.charge} e</div>
              <div>Standard Radius: {ATOM_RADII[inspectingAtom.element] || 0.5} Å</div>
            </div>
          </div>
        )}

        {/* Floating Instruction overlay */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-neutral-900/75 backdrop-blur-sm text-[10px] text-neutral-400 pointer-events-none">
          Click & drag to rotate • Scroll to zoom • Click atom to inspect
        </div>
      </div>

      {/* Chemical Reaction Balancer Modal */}
      {showBalancerModal && (
        <EquationBalancerModal onClose={() => setShowBalancerModal(false)} />
      )}
    </div>
  );
}
