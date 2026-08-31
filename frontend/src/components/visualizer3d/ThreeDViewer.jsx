/**
 * @fileoverview High-performance Three.js WebGL viewport for 3D molecular and biological structure rendering.
 * Features 3D Raycasting, multi-render modes (Ball & Stick, Space Filling, Wireframe), 
 * glowing 3D hotspot nodes, dynamic screen-space projected annotation tooltips, and OrbitControls.
 */
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import MOLECULAR_PRESETS from './molecularPresets';
import { Sparkles, Eye, RotateCw, Maximize2, Layers, Info } from 'lucide-react';

const ThreeDViewer = ({
  preset = 'dna',
  customData = null,
  width = '100%',
  height = '480px',
  onSelectHotspot = null,
  onSelectAtom = null,
}) => {
  const mountRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [renderMode, setRenderMode] = useState('ball-stick'); // 'ball-stick' | 'space-fill' | 'wireframe'
  const [autoRotate, setAutoRotate] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [hoveredAtom, setHoveredAtom] = useState(null);

  const controlsRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const groupRef = useRef(null);
  const hotspotsRef = useRef([]);

  const activePreset = customData || MOLECULAR_PRESETS[preset] || MOLECULAR_PRESETS.dna;

  useEffect(() => {
    if (!mountRef.current) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isDark = document.documentElement.classList.contains('dark');
    scene.background = new THREE.Color(isDark ? 0x0f172a : 0xf8fafc);

    // 2. Camera Setup
    const widthPx = mountRef.current.clientWidth || 600;
    const heightPx = mountRef.current.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(45, widthPx / heightPx, 0.1, 1000);
    camera.position.set(0, 2.5, 6);
    cameraRef.current = camera;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(widthPx, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // 4. Controls Setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;
    controlsRef.current = controls;

    // 5. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight1.position.set(5, 8, 5);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x60a5fa, 0.4);
    directionalLight2.position.set(-5, -5, -5);
    scene.add(directionalLight2);

    // 6. Build 3D Group Objects
    const group = new THREE.Group();
    groupRef.current = group;
    hotspotsRef.current = [];

    const atoms = activePreset.atoms || [];
    const bonds = activePreset.bonds || [];
    const hotspots = activePreset.hotspots || [];

    // Render Atoms
    atoms.forEach((atom) => {
      const radiusScale = renderMode === 'space-fill' ? 1.8 : 1.0;
      const geometry = new THREE.SphereGeometry(atom.radius * radiusScale, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: atom.color,
        roughness: 0.25,
        metalness: 0.2,
        wireframe: renderMode === 'wireframe',
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(...atom.position);
      mesh.userData = { type: 'atom', atom };
      group.add(mesh);
    });

    // Render Bonds (if not space-fill)
    if (renderMode !== 'space-fill') {
      bonds.forEach((bond) => {
        const startAtom = atoms[bond[0]];
        const endAtom = atoms[bond[1]];
        if (!startAtom || !endAtom) return;

        const start = new THREE.Vector3(...startAtom.position);
        const end = new THREE.Vector3(...endAtom.position);
        const distance = start.distanceTo(end);

        const radius = renderMode === 'wireframe' ? 0.02 : 0.08;
        const geometry = new THREE.CylinderGeometry(radius, radius, distance, 16);
        const material = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          wireframe: renderMode === 'wireframe',
        });
        const cylinder = new THREE.Mesh(geometry, material);

        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        cylinder.position.copy(midpoint);
        cylinder.lookAt(end);
        cylinder.rotateX(Math.PI / 2);
        group.add(cylinder);
      });
    }

    // Render 3D Glowing Hotspot Nodes
    hotspots.forEach((hotspot) => {
      const hsGeo = new THREE.SphereGeometry(0.22, 24, 24);
      const hsMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.6,
        roughness: 0.1,
      });
      const hsMesh = new THREE.Mesh(hsGeo, hsMat);
      hsMesh.position.set(...hotspot.position);
      hsMesh.userData = { type: 'hotspot', hotspot };

      // Outer Pulsing Glow Ring
      const ringGeo = new THREE.RingGeometry(0.3, 0.38, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      hsMesh.add(ringMesh);

      group.add(hsMesh);
      hotspotsRef.current.push(hsMesh);
    });

    scene.add(group);
    setIsLoading(false);

    // 7. Raycasting Handler (Click & Hover)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerClick = (event) => {
      if (!mountRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(group.children, true);

      if (intersects.length > 0) {
        const hitObj = intersects[0].object;
        if (hitObj.userData && hitObj.userData.type === 'hotspot') {
          const hs = hitObj.userData.hotspot;
          setSelectedHotspot(hs);
          if (onSelectHotspot) onSelectHotspot(hs);

          // Convert 3D world pos to 2D screen pos for tooltip overlay
          const vector = new THREE.Vector3(...hs.position);
          vector.project(camera);
          const screenX = (vector.x * 0.5 + 0.5) * rect.width;
          const screenY = (-(vector.y * 0.5) + 0.5) * rect.height;
          setTooltipPos({ x: screenX, y: screenY });
        } else if (hitObj.userData && hitObj.userData.type === 'atom') {
          const atom = hitObj.userData.atom;
          if (onSelectAtom) onSelectAtom(atom);
        }
      }
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('click', handlePointerClick);

    // 8. Animation & Projection Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();

      // Pulsing effect for hotspot rings
      hotspotsRef.current.forEach((hs) => {
        const ring = hs.children[0];
        if (ring) {
          ring.rotation.z += 0.02;
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // 9. Resize Listener
    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      domElem.removeEventListener('click', handlePointerClick);
      controls.dispose();
      renderer.dispose();
      if (mountRef.current && domElem) {
        mountRef.current.removeChild(domElem);
      }
    };
  }, [preset, renderMode]);

  // Handle Auto-Rotate prop change
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  const handleResetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 2.5, 6);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-950 shadow-2xl" style={{ width, height }}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-950 z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-stone-400 font-mono">Initializing WebGL 3D Engine...</span>
          </div>
        </div>
      )}

      {/* Control Bar Overlay */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-1.5 rounded-2xl shadow-xl">
        <button
          onClick={() => setRenderMode('ball-stick')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            renderMode === 'ball-stick' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Ball &amp; Stick
        </button>
        <button
          onClick={() => setRenderMode('space-fill')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            renderMode === 'space-fill' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Space Filling (CPK)
        </button>
        <button
          onClick={() => setRenderMode('wireframe')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            renderMode === 'wireframe' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          Wireframe
        </button>
      </div>

      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 p-1.5 rounded-2xl shadow-xl">
        <button
          onClick={() => setAutoRotate((prev) => !prev)}
          className={`p-2 rounded-xl text-xs transition-all ${
            autoRotate ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-stone-400 hover:text-stone-200'
          }`}
          title="Toggle Auto Rotate"
        >
          <RotateCw className={`w-4 h-4 ${autoRotate ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={handleResetCamera}
          className="p-2 rounded-xl text-xs text-stone-400 hover:text-stone-200 transition-all"
          title="Reset Camera View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* WebGL Mount Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-move" />

      {/* Interactive Screen-Space Tooltip Overlay */}
      {selectedHotspot && tooltipPos && (
        <div
          style={{ left: Math.min(tooltipPos.x, mountRef.current?.clientWidth - 280), top: Math.max(10, tooltipPos.y - 120) }}
          className="absolute z-30 bg-neutral-900/95 border border-amber-500/40 p-4 rounded-2xl shadow-2xl backdrop-blur-xl w-72 space-y-2 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
              {selectedHotspot.category}
            </span>
            <button
              onClick={() => setSelectedHotspot(null)}
              className="text-stone-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <h5 className="text-stone-100 font-extrabold text-xs">{selectedHotspot.label}</h5>
          <p className="text-stone-300 text-[11px] leading-relaxed">{selectedHotspot.description}</p>
          {selectedHotspot.clinicalRelevance && (
            <div className="pt-2 border-t border-neutral-800 text-[10px] text-teal-300">
              <span className="font-bold text-teal-400">Clinical Focus:</span> {selectedHotspot.clinicalRelevance}
            </div>
          )}
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-3 left-4 bg-neutral-900/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-stone-400 border border-neutral-800 pointer-events-none flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-indigo-400" />
        <span>Rotate: Left Drag | Pan: Right Drag | Zoom: Scroll | Click Glowing Hotspots</span>
      </div>
    </div>
  );
};

export default ThreeDViewer;
