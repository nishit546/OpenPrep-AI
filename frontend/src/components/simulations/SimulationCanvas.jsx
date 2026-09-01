/**
 * SimulationCanvas.jsx
 *
 * Three.js WebGL host component.
 * - Attaches a responsive canvas via ResizeObserver.
 * - Runs an rAF loop at 60 fps, stepping Cannon.js world at fixed 1/60 dt.
 * - Delegates scene lifecycle to the active simulation module.
 * - Performs raycasting onClick for anatomy modules.
 * - Falls back gracefully when WebGL is unavailable.
 */
import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as CANNON from 'cannon-es';

// ── WebGL capability check ────────────────────────────────────────────────────
function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

const NoWebGL = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', background: '#0f172a', borderRadius: 12,
    color: '#94a3b8', padding: '2rem', textAlign: 'center',
  }}>
    <span style={{ fontSize: '3rem' }}>⚠️</span>
    <h3 style={{ color: '#f1f5f9', margin: '0.5rem 0' }}>WebGL Not Available</h3>
    <p style={{ fontSize: '0.85rem', maxWidth: 320 }}>
      Your browser or device does not support WebGL hardware acceleration.
      Please try a modern desktop browser such as Chrome, Firefox, or Edge.
    </p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const SimulationCanvas = ({
  moduleKey,        // string: 'projectile' | 'optics' | 'electric' | 'heart' | 'neuron'
  params,           // object: current slider values
  running,          // bool: play/pause
  onTelemetry,      // callback (data: { velocity, ke, pe }) — called every frame
  onRegionClick,    // callback (regionName: string) — for anatomy modules
}) => {
  const mountRef = useRef(null);
  const stateRef = useRef({
    renderer: null, scene: null, camera: null, controls: null,
    world: null, module: null, animId: null, clock: null,
    running: false, params: {},
  });

  // ── Initialise Three.js & Cannon ──────────────────────────────────────────
  const initThree = useCallback(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const s = stateRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1120);
    scene.fog = new THREE.FogExp2(0x0b1120, 0.025);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 8, 22);

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 80;

    // Cannon world
    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.81, 0) });
    world.broadphase = new CANNON.NaiveBroadphase();

    // Clock
    const clock = new THREE.Clock();

    Object.assign(s, { renderer, scene, camera, controls, world, clock });
  }, []);

  // ── Load simulation module ────────────────────────────────────────────────
  const loadModule = useCallback(async (key) => {
    const s = stateRef.current;
    if (!s.scene) return;

    // Dispose previous
    if (s.module?.dispose) s.module.dispose(s.scene, s.world);
    // Clear Cannon world bodies
    while (s.world.bodies.length) s.world.removeBody(s.world.bodies[0]);
    // Clear Three scene (except lights)
    while (s.scene.children.length) s.scene.remove(s.scene.children[0]);

    // Reset camera
    s.camera.position.set(0, 8, 22);
    s.controls.reset();

    // Dynamic import
    const modules = {
      projectile: () => import('./modules/ProjectileModule.js'),
      optics:     () => import('./modules/OpticsModule.js'),
      electric:   () => import('./modules/ElectricFieldModule.js'),
      heart:      () => import('./modules/HeartAnatomyModule.js'),
      neuron:     () => import('./modules/NeuronModule.js'),
    };

    const mod = await (modules[key] || modules.projectile)();
    s.module = mod;
    mod.init(s.scene, s.world, s.params, onRegionClick);
  }, [onRegionClick]);

  // ── Animation loop ────────────────────────────────────────────────────────
  const startLoop = useCallback(() => {
    const s = stateRef.current;
    const fixed = 1 / 60;

    const animate = () => {
      s.animId = requestAnimationFrame(animate);
      const dt = Math.min(s.clock.getDelta(), 0.05);

      if (s.running && s.module?.update) {
        s.world.step(fixed, dt, 3);
        const telemetry = s.module.update(s.scene, s.world, s.params, dt);
        if (telemetry && onTelemetry) onTelemetry(telemetry);
      }

      s.controls.update();
      s.renderer.render(s.scene, s.camera);
    };
    animate();
  }, [onTelemetry]);

  // ── Resize observer ───────────────────────────────────────────────────────
  const setupResize = useCallback(() => {
    const s = stateRef.current;
    const mount = mountRef.current;
    if (!mount) return;

    const observer = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      s.camera.aspect = w / h;
      s.camera.updateProjectionMatrix();
      s.renderer.setSize(w, h);
    });
    observer.observe(mount);
    return () => observer.disconnect();
  }, []);

  // ── Raycasting (anatomy click) ─────────────────────────────────────────────
  const handleCanvasClick = useCallback((e) => {
    const s = stateRef.current;
    if (!s.module?.onClick || !s.renderer || !s.camera) return;
    const rect = s.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, s.camera);
    const hits = raycaster.intersectObjects(s.scene.children, true);
    const regionName = s.module.onClick(hits);
    if (regionName && onRegionClick) onRegionClick(regionName);
  }, [onRegionClick]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasWebGL()) return;
    initThree();
    startLoop();
    const cleanup = setupResize();
    return () => {
      const s = stateRef.current;
      cancelAnimationFrame(s.animId);
      if (s.module?.dispose) s.module.dispose(s.scene, s.world);
      s.controls?.dispose();
      s.renderer?.dispose();
      if (mountRef.current && s.renderer?.domElement) {
        mountRef.current.removeChild(s.renderer.domElement);
      }
      cleanup?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Module change ─────────────────────────────────────────────────────────
  useEffect(() => {
    loadModule(moduleKey);
  }, [moduleKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Params change — rebuild static scenes (optics/electric) ───────────────
  useEffect(() => {
    const s = stateRef.current;
    s.params = params;
    const staticModules = ['optics', 'electric'];
    if (staticModules.includes(moduleKey) && s.module?.reset) {
      s.module.reset(s.scene, s.world, params);
    }
  }, [params, moduleKey]);

  // ── Play/pause ─────────────────────────────────────────────────────────────
  useEffect(() => {
    stateRef.current.running = running;
  }, [running]);

  if (!hasWebGL()) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <NoWebGL />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      onClick={handleCanvasClick}
      style={{
        width: '100%', height: '100%', borderRadius: 12, overflow: 'hidden',
        cursor: 'grab', background: '#0b1120',
      }}
    />
  );
};

export default SimulationCanvas;
