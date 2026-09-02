---
title: '[FEAT]: Interactive 3D Anatomy & Physics Simulation Lab with Three.js & Cannon.js'
labels: 'enhancement, frontend, ui/ux, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Visualizing abstract concepts in 3D (e.g. projectile trajectories with air drag, magnetic Lorentz force vectors, optics ray refraction, or anatomical organ structures) is difficult from 2D textbook drawings alone.

This feature introduces an **Interactive 3D Simulation & Virtual Lab** using Three.js and Cannon.js physics engines, allowing students to tweak parameters and observe physical phenomena interactively.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **3D WebGL Simulation Viewport (`frontend/src/components/simulations/SimulationCanvas.jsx`)**:
   - Three.js WebGL renderer with OrbitControls (pan, rotate, zoom) and responsive canvas resizing.
   - Integrated physics calculation using Cannon.js for rigid body collisions, gravity variations, and kinematic projectile vectors.
2. **Interactive Parameter Control Panel (`frontend/src/components/simulations/ParameterControls.jsx`)**:
   - Real-time sliders for physical variables (Velocity $v_0$, Angle $\theta$, Mass $m$, Friction $\mu$, Gravitational acceleration $g$, Magnetic field $B$).
   - Live telemetry graphs (Velocity vs. Time, Kinetic vs. Potential Energy curves) updated in sync with simulation steps.
3. **Simulation Modules**:
   - **Physics**: Projectile Motion with Wind Drag, Optics Snell's Law Prism Refraction, Electric Field Lines.
   - **Biology/Anatomy**: Interactive 3D Human Heart and Neuron structure with clickable anatomical region pins.

---

## Acceptance Criteria
- [ ] 3D simulations run smoothly at 60fps on modern desktop and mobile browsers.
- [ ] Parameter sliders update simulation variables and physics equations in real time without lag.
- [ ] Real-time telemetry graphs plot accurate mathematical curves synchronized with visual motion.
- [ ] Fallback graceful degradation for devices without WebGL hardware acceleration.
