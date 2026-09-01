/**
 * ProjectileModule.js
 * Cannon.js rigid-body projectile with quadratic air drag.
 * Exports: { init, update, reset, dispose }
 *
 * Scene receives a sphere launched at angle θ with initial speed v0.
 * Air drag force: F_drag = -0.5 * Cd * rho * A * v^2 * v_hat
 * Trajectory is traced with a THREE.Line updated each step.
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

const CD = 0.47;   // drag coefficient (sphere)
const RHO = 1.225; // air density kg/m³

let body = null;
let mesh = null;
let trailLine = null;
let trailPositions = [];
const MAX_TRAIL = 400;

export function init(scene, world, params) {
  // Ground plane
  const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  scene.add(groundMesh);

  // Grid helper
  const grid = new THREE.GridHelper(60, 30, 0x334155, 0x1e293b);
  scene.add(grid);

  _spawnBall(scene, world, params);
}

function _spawnBall(scene, world, params) {
  const { v0 = 20, angle = 45, mass = 1, radius = 0.4, g = 9.81 } = params;
  const rad = (angle * Math.PI) / 180;

  // Cannon body
  world.gravity.set(0, -g, 0);
  body = new CANNON.Body({ mass, shape: new CANNON.Sphere(radius), linearDamping: 0 });
  body.position.set(-20, radius, 0);
  body.velocity.set(v0 * Math.cos(rad), v0 * Math.sin(rad), 0);
  world.addBody(body);

  // Three.js mesh
  mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0c4a6e, roughness: 0.3 })
  );
  mesh.castShadow = true;
  scene.add(mesh);

  // Trail line
  trailPositions = [];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3));
  trailLine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7dd3fc, opacity: 0.6, transparent: true }));
  scene.add(trailLine);
}

export function update(scene, world, params, dt) {
  if (!body) return { velocity: 0, ke: 0, pe: 0 };

  // Apply quadratic air drag
  const vel = body.velocity;
  const speed = vel.length();
  if (speed > 0.001) {
    const area = Math.PI * (params.radius || 0.4) ** 2;
    const dragMag = 0.5 * CD * RHO * area * speed * speed;
    const drag = vel.clone().scale(-dragMag / speed);
    body.applyForce(drag, new CANNON.Vec3(0, 0, 0));
  }

  // Sync mesh
  if (mesh) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
  }

  // Update trail
  trailPositions.push(body.position.x, body.position.y, body.position.z);
  if (trailPositions.length > MAX_TRAIL * 3) trailPositions.splice(0, 3);
  const arr = new Float32Array(trailPositions);
  trailLine.geometry.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  trailLine.geometry.setDrawRange(0, trailPositions.length / 3);

  // Telemetry
  const m = params.mass || 1;
  const h = Math.max(0, body.position.y);
  const ke = 0.5 * m * speed * speed;
  const pe = m * (params.g || 9.81) * h;
  return { velocity: speed, ke, pe };
}

export function reset(scene, world, params) {
  dispose(scene, world);
  _spawnBall(scene, world, params);
}

export function dispose(scene, world) {
  if (body) { world.removeBody(body); body = null; }
  if (mesh) { scene.remove(mesh); mesh.geometry.dispose(); mesh = null; }
  if (trailLine) { scene.remove(trailLine); trailLine.geometry.dispose(); trailLine = null; }
  trailPositions = [];
  // Remove ground bodies
  [...world.bodies].forEach((b) => world.removeBody(b));
}
