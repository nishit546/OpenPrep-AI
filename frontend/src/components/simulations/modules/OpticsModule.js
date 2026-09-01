/**
 * OpticsModule.js
 * Snell's Law prism ray refraction drawn as THREE.Line segments.
 * n1 * sin(θ1) = n2 * sin(θ2)
 *
 * Exports: { init, update, reset, dispose }
 */
import * as THREE from 'three';

const objects = [];

export function init(scene, world, params) {
  _buildScene(scene, params);
}

function _buildScene(scene, params) {
  const { n1 = 1.0, n2 = 1.5, incidentAngle = 45 } = params;

  // Prism face (equilateral triangle visualised as a flat box)
  const prismGeo = new THREE.BoxGeometry(4, 6, 0.5);
  const prismMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9, transparent: true, opacity: 0.25,
    roughness: 0, metalness: 0, side: THREE.DoubleSide,
  });
  const prism = new THREE.Mesh(prismGeo, prismMat);
  prism.position.set(0, 0, 0);
  scene.add(prism);
  objects.push(prism);

  // Prism edge outline
  const edges = new THREE.EdgesGeometry(prismGeo);
  const outline = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x22d3ee }));
  prism.add(outline);

  _drawRays(scene, n1, n2, incidentAngle);
}

function _drawRays(scene, n1, n2, angleDeg) {
  const theta1 = (angleDeg * Math.PI) / 180;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1);
  const theta2 = Math.abs(sinTheta2) <= 1 ? Math.asin(sinTheta2) : null;

  const rayMat = (color) => new THREE.LineBasicMaterial({ color, linewidth: 2 });

  // Incident ray (left side, approaching prism)
  const incidentPts = [
    new THREE.Vector3(-10, Math.tan(theta1) * 10, 0.3),
    new THREE.Vector3(-2, 0, 0.3),
  ];
  const incidentLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(incidentPts),
    rayMat(0xfacc15)
  );
  scene.add(incidentLine);
  objects.push(incidentLine);

  // Refracted ray inside prism
  if (theta2 !== null) {
    const refractedPts = [
      new THREE.Vector3(-2, 0, 0.3),
      new THREE.Vector3(2, -Math.tan(theta2) * 4, 0.3),
    ];
    const refractedLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(refractedPts),
      rayMat(0x4ade80)
    );
    scene.add(refractedLine);
    objects.push(refractedLine);

    // Emergent ray (exiting prism)
    const exitAngle = theta1; // simplified: same medium on both sides
    const emergentPts = [
      new THREE.Vector3(2, -Math.tan(theta2) * 4, 0.3),
      new THREE.Vector3(10, -Math.tan(theta2) * 4 - Math.tan(exitAngle) * 8, 0.3),
    ];
    const emergentLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(emergentPts),
      rayMat(0xf87171)
    );
    scene.add(emergentLine);
    objects.push(emergentLine);
  } else {
    // Total internal reflection indicator
    const tirPts = [
      new THREE.Vector3(-2, 0, 0.3),
      new THREE.Vector3(-8, -3, 0.3),
    ];
    const tirLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tirPts),
      rayMat(0xc084fc)
    );
    scene.add(tirLine);
    objects.push(tirLine);
  }

  // Angle arc indicator
  const arcCurve = new THREE.ArcCurve(0, 0, 1.5, Math.PI - theta1, Math.PI, true);
  const arcPts = arcCurve.getPoints(32).map((p) => new THREE.Vector3(-2 + p.x, p.y, 0.3));
  const arcLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(arcPts),
    new THREE.LineBasicMaterial({ color: 0xfacc15, opacity: 0.5, transparent: true })
  );
  scene.add(arcLine);
  objects.push(arcLine);
}

export function update(scene, world, params) {
  // Optics is static — only changes on param change; telemetry returns refraction angle
  const { n1 = 1.0, n2 = 1.5, incidentAngle = 45 } = params;
  const theta1 = (incidentAngle * Math.PI) / 180;
  const sinTheta2 = (n1 / n2) * Math.sin(theta1);
  const theta2 = Math.abs(sinTheta2) <= 1 ? (Math.asin(sinTheta2) * 180) / Math.PI : null;
  return { velocity: theta2 ?? 0, ke: n1, pe: n2 };
}

export function reset(scene, world, params) {
  dispose(scene, world);
  _buildScene(scene, params);
}

export function dispose(scene) {
  objects.forEach((o) => {
    scene.remove(o);
    o.geometry?.dispose();
  });
  objects.length = 0;
}
