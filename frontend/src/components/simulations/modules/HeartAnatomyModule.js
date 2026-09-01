/**
 * HeartAnatomyModule.js
 * Procedural 3D human heart built from Three.js primitives with clickable
 * anatomical region label pins (THREE.Sprite).
 *
 * Exports: { init, update, reset, dispose, onClick }
 */
import * as THREE from 'three';

const objects = [];
let heartGroup = null;
let mixers = [];
let clock = null;

const REGIONS = [
  { name: 'Left Ventricle',  position: [-0.8, -0.5,  1.2], color: '#f87171' },
  { name: 'Right Ventricle', position: [ 0.8, -0.5,  1.2], color: '#fca5a5' },
  { name: 'Left Atrium',     position: [-0.7,  1.2,  0.6], color: '#fb923c' },
  { name: 'Right Atrium',    position: [ 0.7,  1.2,  0.6], color: '#fbbf24' },
  { name: 'Aorta',           position: [-0.4,  2.2,  0.2], color: '#a78bfa' },
  { name: 'Pulmonary Artery',position: [ 0.5,  2.0,  0.5], color: '#60a5fa' },
  { name: 'Mitral Valve',    position: [-0.5,  0.3,  0.8], color: '#34d399' },
  { name: 'Tricuspid Valve', position: [ 0.5,  0.3,  0.8], color: '#2dd4bf' },
];

export function init(scene, world, params, onRegionClick) {
  clock = new THREE.Clock();
  heartGroup = new THREE.Group();
  scene.add(heartGroup);
  objects.push(heartGroup);

  _buildHeart(heartGroup, onRegionClick);

  // Ambient + directional lighting for anatomy
  const ambient = new THREE.AmbientLight(0xfff0f0, 0.8);
  scene.add(ambient);
  objects.push(ambient);

  const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
  dirLight.position.set(5, 10, 8);
  scene.add(dirLight);
  objects.push(dirLight);
}

function _makeLabelSprite(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15,23,42,0.85)';
  ctx.roundRect(0, 0, 256, 64, 8);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.roundRect(1, 1, 254, 62, 8);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

function _buildHeart(group, onRegionClick) {
  const heartMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626, roughness: 0.55, metalness: 0.05,
  });

  // Main body — two overlapping spheres
  const bodyGeo = new THREE.SphereGeometry(1.4, 32, 32);
  const body = new THREE.Mesh(bodyGeo, heartMat);
  body.position.set(0, 0, 0);
  body.scale.set(1, 1.2, 0.85);
  group.add(body);

  // Left lobe bump
  const lobeL = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), heartMat);
  lobeL.position.set(-0.8, 1.0, 0);
  group.add(lobeL);

  // Right lobe bump
  const lobeR = new THREE.Mesh(new THREE.SphereGeometry(0.9, 24, 24), heartMat);
  lobeR.position.set(0.8, 1.0, 0);
  group.add(lobeR);

  // Aorta
  const aortaGeo = new THREE.CylinderGeometry(0.25, 0.22, 1.8, 16);
  const aorta = new THREE.Mesh(aortaGeo, new THREE.MeshStandardMaterial({ color: 0x7c3aed }));
  aorta.position.set(-0.4, 2.2, 0);
  aorta.rotation.z = 0.3;
  group.add(aorta);

  // Pulmonary artery
  const paGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.4, 16);
  const pa = new THREE.Mesh(paGeo, new THREE.MeshStandardMaterial({ color: 0x2563eb }));
  pa.position.set(0.5, 1.9, 0.3);
  pa.rotation.z = -0.4;
  group.add(pa);

  // Region pins
  REGIONS.forEach((region) => {
    // Pin sphere
    const pinGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const pinMat = new THREE.MeshStandardMaterial({ color: region.color, emissive: region.color, emissiveIntensity: 0.4 });
    const pin = new THREE.Mesh(pinGeo, pinMat);
    pin.position.set(...region.position);
    pin.userData = { regionName: region.name };
    group.add(pin);

    // Label
    const label = _makeLabelSprite(region.name, region.color);
    label.position.set(region.position[0], region.position[1] + 0.5, region.position[2]);
    label.userData = { regionName: region.name };
    group.add(label);
  });
}

let beatPhase = 0;
export function update(scene, world, params, dt = 0.016) {
  if (!heartGroup) return { velocity: 0, ke: 0, pe: 0 };
  // Subtle heartbeat pulsing animation
  beatPhase += dt * 1.2;
  const beat = 1 + 0.04 * Math.sin(beatPhase * Math.PI * 2);
  heartGroup.scale.set(beat, beat, beat);
  heartGroup.rotation.y += 0.003;
  return { velocity: 60 + 20 * Math.sin(beatPhase), ke: 0, pe: 0 };
}

export function reset(scene, world, params, onRegionClick) {
  dispose(scene);
  init(scene, world, params, onRegionClick);
}

export function dispose(scene) {
  objects.forEach((o) => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  objects.length = 0;
  heartGroup = null;
  mixers = [];
}

/** Call from SimulationCanvas raycaster onClick */
export function onClick(intersects) {
  for (const hit of intersects) {
    const name = hit.object?.userData?.regionName;
    if (name) return name;
  }
  return null;
}
