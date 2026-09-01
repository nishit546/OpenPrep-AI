/**
 * NeuronModule.js
 * 3D neuron structure (soma + dendrites + axon) with animated
 * action-potential propagation pulse.
 *
 * Exports: { init, update, reset, dispose }
 */
import * as THREE from 'three';

const objects = [];
let pulseHead = null;
let axonLine = null;
let pulseT = 0;
let axonPoints = [];

const DENDRITE_BRANCHES = 8;
const DENDRITE_LEN = 2.5;

export function init(scene, world, params) {
  _buildScene(scene, params);
}

function _buildScene(scene, { myelinSheath = true } = {}) {
  // Soft background lighting for biology
  const ambient = new THREE.AmbientLight(0xe0f2fe, 0.7);
  scene.add(ambient); objects.push(ambient);
  const point = new THREE.PointLight(0xffffff, 1.2, 30);
  point.position.set(5, 8, 5);
  scene.add(point); objects.push(point);

  // ── Soma (cell body) ──
  const somaMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.4, metalness: 0.1 });
  const soma = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), somaMat);
  soma.position.set(0, 0, 0);
  scene.add(soma); objects.push(soma);

  // ── Dendrites ──
  const dendMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 });
  for (let i = 0; i < DENDRITE_BRANCHES; i++) {
    const angle = (i / DENDRITE_BRANCHES) * Math.PI * 2;
    const elevation = (Math.random() - 0.5) * Math.PI * 0.8;
    const len = DENDRITE_LEN * (0.7 + Math.random() * 0.6);

    const dir = new THREE.Vector3(
      Math.cos(angle) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(angle) * Math.cos(elevation)
    );

    const dendGeo = new THREE.CylinderGeometry(0.06, 0.03, len, 8);
    const dend = new THREE.Mesh(dendGeo, dendMat);
    dend.position.copy(dir.clone().multiplyScalar(len / 2 + 0.9));
    dend.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    scene.add(dend); objects.push(dend);

    // Dendritic spine tips
    const spine = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfcd34d })
    );
    spine.position.copy(dir.clone().multiplyScalar(len + 0.9));
    scene.add(spine); objects.push(spine);
  }

  // ── Axon hillock + axon ──
  axonPoints = [];
  for (let i = 0; i <= 40; i++) {
    axonPoints.push(new THREE.Vector3(-1 - i * 0.5, -Math.sin(i * 0.15) * 0.2, 0));
  }

  const axonCurve = new THREE.CatmullRomCurve3(axonPoints);
  const axonGeo = new THREE.TubeGeometry(axonCurve, 80, 0.1, 8, false);
  const axonMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.5 });
  axonLine = new THREE.Mesh(axonGeo, axonMat);
  scene.add(axonLine); objects.push(axonLine);

  // ── Myelin sheaths (Nodes of Ranvier) ──
  if (myelinSheath) {
    for (let i = 3; i < 38; i += 5) {
      const pt = axonCurve.getPoint(i / 40);
      const sheath = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.8, 10),
        new THREE.MeshStandardMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.6 })
      );
      sheath.position.copy(pt);
      sheath.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axonCurve.getTangent(i / 40).normalize()
      );
      scene.add(sheath); objects.push(sheath);
    }
  }

  // ── Synaptic terminal bulb ──
  const terminalPos = axonPoints[axonPoints.length - 1];
  const terminal = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xa78bfa, emissive: 0x4c1d95, emissiveIntensity: 0.3 })
  );
  terminal.position.copy(terminalPos);
  scene.add(terminal); objects.push(terminal);

  // ── Action potential pulse sphere ──
  pulseHead = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00aaaa, emissiveIntensity: 0.8 })
  );
  pulseT = 0;
  scene.add(pulseHead); objects.push(pulseHead);
}

export function update(scene, world, params, dt = 0.016) {
  if (!pulseHead || axonPoints.length === 0) return { velocity: 0, ke: 0, pe: 0 };

  // Advance pulse along axon
  pulseT = (pulseT + dt * 0.3) % 1;
  const axonCurve = new THREE.CatmullRomCurve3(axonPoints);
  pulseHead.position.copy(axonCurve.getPoint(pulseT));

  // Pulse glow oscillates
  const intensity = 0.6 + 0.4 * Math.sin(pulseT * Math.PI * 20);
  pulseHead.material.emissiveIntensity = intensity;

  return { velocity: pulseT * 100, ke: intensity * 80, pe: (1 - pulseT) * 80 };
}

export function reset(scene, world, params) {
  dispose(scene);
  _buildScene(scene, params);
}

export function dispose(scene) {
  objects.forEach((o) => {
    scene.remove(o);
    o.geometry?.dispose();
    o.material?.dispose();
  });
  objects.length = 0;
  pulseHead = null;
  axonLine = null;
  axonPoints = [];
  pulseT = 0;
}
