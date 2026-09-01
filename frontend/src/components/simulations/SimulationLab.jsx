/**
 * SimulationLab.jsx
 *
 * Top-level orchestrator composing:
 *   SimulationCanvas   — Three.js WebGL viewport
 *   ParameterControls  — module selector + sliders + play/reset
 *   TelemetryGraph     — live velocity/KE/PE rolling chart
 *
 * Manages module selection, param state, and play/pause.
 */
import React, { useState, useRef, useCallback } from 'react';
import SimulationCanvas from './SimulationCanvas';
import ParameterControls, { MODULES } from './ParameterControls';
import TelemetryGraph from './TelemetryGraph';

// ── Default params — merged across all modules ────────────────────────────────
const buildDefaultParams = () => {
  const defaults = {};
  MODULES.forEach((m) => m.params.forEach((p) => { defaults[p.key] = p.default; }));
  return defaults;
};

// ── Region info panel (for anatomy modules) ───────────────────────────────────
const ANATOMY_INFO = {
  'Left Ventricle':   'Pumps oxygenated blood to the body via the aorta. Thickest-walled chamber.',
  'Right Ventricle':  'Pumps deoxygenated blood to the lungs via the pulmonary artery.',
  'Left Atrium':      'Receives oxygenated blood from the pulmonary veins.',
  'Right Atrium':     'Receives deoxygenated blood from the body via the vena cavae.',
  'Aorta':            'Largest artery; carries oxygenated blood from the left ventricle to the body.',
  'Pulmonary Artery': 'Carries deoxygenated blood from the right ventricle to the lungs.',
  'Mitral Valve':     'Bicuspid valve between left atrium and left ventricle.',
  'Tricuspid Valve':  'Three-leaflet valve between right atrium and right ventricle.',
};

const RegionPanel = ({ region, onClose }) => {
  if (!region) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 12, left: 12, right: 12,
      background: 'rgba(15,23,42,0.95)',
      border: '1px solid #4f46e5', borderRadius: 10,
      padding: '0.75rem 1rem',
      backdropFilter: 'blur(8px)',
      zIndex: 10,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e2e8f0', marginBottom: 4 }}>
            🫀 {region}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', maxWidth: 420, lineHeight: 1.5 }}>
            {ANATOMY_INFO[region] || 'Click an anatomical region to learn more.'}
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#64748b',
          cursor: 'pointer', fontSize: '1.1rem', padding: '0 0 0 0.5rem',
        }}>✕</button>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const SimulationLab = () => {
  const [moduleKey, setModuleKey] = useState('projectile');
  const [params, setParams] = useState(buildDefaultParams);
  const [running, setRunning] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const graphRef = useRef(null);
  const canvasRef = useRef(null);

  // ── Telemetry callback — push into graph buffer ───────────────────────────
  const handleTelemetry = useCallback((data) => {
    graphRef.current?.push(data);
  }, []);

  // ── Param change ──────────────────────────────────────────────────────────
  const handleParamChange = useCallback((key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Module change ─────────────────────────────────────────────────────────
  const handleModuleChange = useCallback((key) => {
    setRunning(false);
    setSelectedRegion(null);
    graphRef.current?.clear();
    setModuleKey(key);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setRunning(false);
    graphRef.current?.clear();
    // Re-trigger canvas reset by flipping moduleKey momentarily
    setModuleKey((k) => {
      // force remount trick — append/strip trailing space
      return k;
    });
    // Signal canvas to reset via params change timestamp
    setParams((p) => ({ ...p, _resetTs: Date.now() }));
  }, []);

  const activeModule = MODULES.find((m) => m.key === moduleKey);

  return (
    <div style={{
      fontFamily: "'Inter', sans-serif",
      background: '#0b1120',
      borderRadius: 16,
      border: '1px solid #1e293b',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      minHeight: 600,
    }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid #1e293b' }}>
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5, #06b6d4)',
          borderRadius: 10, padding: '0.5rem', fontSize: '1.3rem',
        }}>🔬</div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>
            Interactive 3D Simulation Lab
          </h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
            {activeModule?.label} · Three.js WebGL · Cannon.js Physics
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            padding: '0.2rem 0.5rem',
            borderRadius: 20,
            background: running ? 'rgba(34,197,94,0.15)' : 'rgba(100,116,139,0.15)',
            color: running ? '#4ade80' : '#64748b',
            border: `1px solid ${running ? '#16a34a' : '#334155'}`,
          }}>
            {running ? '● LIVE' : '○ PAUSED'}
          </span>
        </div>
      </div>

      {/* ── Main layout ──────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 280px',
        gap: '0.75rem',
        flex: 1,
      }}>
        {/* Left: Canvas + Telemetry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* 3D Viewport */}
          <div style={{ position: 'relative', flex: 1, minHeight: 380 }}>
            <SimulationCanvas
              ref={canvasRef}
              moduleKey={moduleKey}
              params={params}
              running={running}
              onTelemetry={handleTelemetry}
              onRegionClick={setSelectedRegion}
            />
            <RegionPanel region={selectedRegion} onClose={() => setSelectedRegion(null)} />

            {/* Help tooltip */}
            <div style={{
              position: 'absolute', top: 10, right: 10,
              fontSize: '0.65rem', color: '#475569',
              background: 'rgba(15,23,42,0.7)',
              padding: '0.25rem 0.5rem', borderRadius: 6,
              pointerEvents: 'none',
            }}>
              🖱 Drag to orbit · Scroll to zoom
            </div>
          </div>

          {/* Telemetry Graph */}
          <TelemetryGraph ref={graphRef} moduleKey={moduleKey} />
        </div>

        {/* Right: Controls */}
        <ParameterControls
          moduleKey={moduleKey}
          params={params}
          onModuleChange={handleModuleChange}
          onParamChange={handleParamChange}
          running={running}
          onToggleRunning={() => setRunning((r) => !r)}
          onReset={handleReset}
        />
      </div>

      {/* ── Footer tip ────────────────────────────────────────────────────── */}
      <div style={{
        fontSize: '0.68rem', color: '#334155', textAlign: 'center',
        borderTop: '1px solid #1e293b', paddingTop: '0.5rem',
      }}>
        Adjust sliders to change physical variables in real time. Press ▶ Run to start the simulation.
      </div>
    </div>
  );
};

export default SimulationLab;
