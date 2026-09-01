/**
 * ElectricFieldModule.js
 * Two point charges; field lines computed analytically and drawn as
 * THREE.ArrowHelper instances on a 2D grid.
 *
 * Exports: { init, update, reset, dispose }
 */
import * as THREE from 'three';

const objects = [];
const GRID_STEPS = 8;
const GRID_EXTENT = 10;
const ARROW_SCALE = 0.8;

export function init(scene, world, params) {
  _buildScene(scene, params);
}

function _buildScene(scene, { q1 = 1, q2 = -1, separation = 6 } = {}) {
  const pos1 = new THREE.Vector3(-separation / 2, 0, 0);
  const pos2 = new THREE.Vector3(separation / 2, 0, 0);

  // Charge sphere markers
  const addCharge = (pos, charge) => {
    const geo = new THREE.SphereGeometry(0.4, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: charge > 0 ? 0xf87171 : 0x60a5fa,
      emissive: charge > 0 ? 0x7f1d1d : 0x1e3a5f,
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.copy(pos);
    scene.add(sphere);
    objects.push(sphere);

    // ± label sprite
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = charge > 0 ? '#f87171' : '#60a5fa';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(charge > 0 ? '+' : '−', 32, 32);
    const tex = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex }));
    sprite.position.copy(pos).add(new THREE.Vector3(0, 0.8, 0));
    sprite.scale.set(0.8, 0.8, 1);
    scene.add(sprite);
    objects.push(sprite);
  };

  addCharge(pos1, q1);
  addCharge(pos2, q2);

  // Field arrows on a regular XZ grid (y=0 plane)
  const k = 8.99e9; // Coulomb constant (normalised for display)
  for (let xi = -GRID_STEPS; xi <= GRID_STEPS; xi++) {
    for (let zi = -GRID_STEPS; zi <= GRID_STEPS; zi++) {
      const x = (xi / GRID_STEPS) * GRID_EXTENT;
      const z = (zi / GRID_STEPS) * GRID_EXTENT;
      const point = new THREE.Vector3(x, 0, z);

      // Skip points too close to charges
      if (point.distanceTo(pos1) < 1 || point.distanceTo(pos2) < 1) continue;

      // E field contribution from each charge
      const fieldFromCharge = (chargePos, chargeVal) => {
        const r = new THREE.Vector3().subVectors(point, chargePos);
        const rMag = r.length();
        return r.normalize().multiplyScalar((chargeVal) / (rMag * rMag));
      };

      const E = new THREE.Vector3()
        .addScaledVector(fieldFromCharge(pos1, q1), 1)
        .addScaledVector(fieldFromCharge(pos2, q2), 1);

      const Emag = E.length();
      if (Emag < 0.001) continue;

      const dir = E.clone().normalize();
      // Map field strength logarithmically to arrow length
      const len = Math.min(0.6, Math.log(1 + Emag * 40) * ARROW_SCALE * 0.15);
      const color = Emag > 0.5 ? 0xfbbf24 : Emag > 0.1 ? 0x34d399 : 0x93c5fd;
      const arrow = new THREE.ArrowHelper(dir, point, len, color, len * 0.3, len * 0.15);
      scene.add(arrow);
      objects.push(arrow);
    }
  }

  // Ground plane grid
  const grid = new THREE.GridHelper(GRID_EXTENT * 2, GRID_STEPS * 2, 0x1e293b, 0x0f172a);
  scene.add(grid);
  objects.push(grid);
}

export function update(scene, world, params) {
  // Static scene — rebuilds on param change via reset()
  return { velocity: 0, ke: Math.abs(params.q1 || 1), pe: Math.abs(params.q2 || 1) };
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
}
