/**
 * ParameterControls.jsx
 *
 * Module selector + real-time parameter sliders + live equation display.
 * Entirely self-contained — no external slider library required.
 */
import React from 'react';

// ── Module metadata ───────────────────────────────────────────────────────────
const MODULES = [
  {
    key: 'projectile', icon: '🎯', label: 'Projectile Motion',
    equation: 'R = v₀² · sin(2θ) / g',
    params: [
      { key: 'v0',    label: 'Initial Speed v₀',       min: 1,   max: 60,  step: 0.5, unit: 'm/s',  default: 20,   color: '#38bdf8' },
      { key: 'angle', label: 'Launch Angle θ',         min: 1,   max: 89,  step: 1,   unit: '°',    default: 45,   color: '#a78bfa' },
      { key: 'mass',  label: 'Mass m',                  min: 0.1, max: 20,  step: 0.1, unit: 'kg',   default: 1,    color: '#34d399' },
      { key: 'g',     label: 'Gravity g',               min: 0.5, max: 25,  step: 0.5, unit: 'm/s²', default: 9.81, color: '#fbbf24' },
      { key: 'radius',label: 'Ball Radius',             min: 0.1, max: 2,   step: 0.1, unit: 'm',    default: 0.4,  color: '#f87171' },
    ],
  },
  {
    key: 'optics', icon: '🔭', label: "Snell's Law Prism",
    equation: 'n₁ · sin(θ₁) = n₂ · sin(θ₂)',
    params: [
      { key: 'incidentAngle', label: 'Incident Angle θ₁', min: 1,  max: 85, step: 1,   unit: '°',   default: 45,  color: '#facc15' },
      { key: 'n1',            label: 'Medium 1 Index n₁', min: 1,  max: 3,  step: 0.05, unit: '',   default: 1.0, color: '#4ade80' },
      { key: 'n2',            label: 'Medium 2 Index n₂', min: 1,  max: 3,  step: 0.05, unit: '',   default: 1.5, color: '#f87171' },
    ],
  },
  {
    key: 'electric', icon: '⚡', label: 'Electric Field Lines',
    equation: 'E = kq / r²',
    params: [
      { key: 'q1',         label: 'Charge q₁',     min: -5, max: 5,  step: 0.5, unit: 'C', default:  1,  color: '#f87171' },
      { key: 'q2',         label: 'Charge q₂',     min: -5, max: 5,  step: 0.5, unit: 'C', default: -1,  color: '#60a5fa' },
      { key: 'separation', label: 'Separation d',   min: 2,  max: 16, step: 0.5, unit: 'm', default:  6,  color: '#a78bfa' },
    ],
  },
  {
    key: 'heart', icon: '🫀', label: '3D Heart Anatomy',
    equation: 'CO = HR × SV',
    params: [],
  },
  {
    key: 'neuron', icon: '🧠', label: 'Neuron Structure',
    equation: 'V_m = -70 mV → +40 mV → -70 mV',
    params: [
      { key: 'myelinSheath', label: 'Myelin Sheath', min: 0, max: 1, step: 1, unit: '', default: 1, color: '#e0f2fe', isToggle: true },
    ],
  },
];

// ── Slider Component ──────────────────────────────────────────────────────────
const Slider = ({ def, value, onChange }) => (
  <div style={{ marginBottom: '0.85rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <label style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{def.label}</label>
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: def.color, fontFamily: 'monospace' }}>
        {def.isToggle ? (value ? 'On' : 'Off') : `${value}${def.unit ? ' ' + def.unit : ''}`}
      </span>
    </div>
    <input
      type="range"
      min={def.min} max={def.max} step={def.step}
      value={value}
      onChange={(e) => onChange(def.key, def.isToggle ? Number(e.target.value) === 1 : parseFloat(e.target.value))}
      style={{ width: '100%', accentColor: def.color, cursor: 'pointer' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: '#475569', marginTop: 2 }}>
      <span>{def.min}{def.unit}</span>
      <span>{def.max}{def.unit}</span>
    </div>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const ParameterControls = ({
  moduleKey,
  params,
  onModuleChange,
  onParamChange,
  running,
  onToggleRunning,
  onReset,
}) => {
  const activeModule = MODULES.find((m) => m.key === moduleKey) || MODULES[0];

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 12,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      overflowY: 'auto',
    }}>
      {/* Module selector */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
          Simulation Module
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {MODULES.map((m) => (
            <button
              key={m.key}
              onClick={() => onModuleChange(m.key)}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.72rem',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                background: moduleKey === m.key ? '#4f46e5' : '#1e293b',
                color: moduleKey === m.key ? '#fff' : '#94a3b8',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}
            >
              <span>{m.icon}</span>
              <span style={{ display: 'none' }}>{m.label}</span>
            </button>
          ))}
        </div>
        {/* Active module label */}
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e2e8f0', marginTop: 8 }}>
          {activeModule.icon} {activeModule.label}
        </div>
      </div>

      {/* Equation display */}
      <div style={{
        background: '#1e293b', borderRadius: 8, padding: '0.5rem 0.75rem',
        fontFamily: 'monospace', fontSize: '0.82rem', color: '#7dd3fc',
        letterSpacing: 0.5,
      }}>
        {activeModule.equation}
      </div>

      {/* Parameter sliders */}
      {activeModule.params.length > 0 ? (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            Parameters
          </div>
          {activeModule.params.map((def) => (
            <Slider
              key={def.key}
              def={def}
              value={params[def.key] ?? def.default}
              onChange={onParamChange}
            />
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '0.75rem', color: '#475569', textAlign: 'center', margin: 0 }}>
          Rotate & click anatomical regions to inspect.
        </p>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <button
          onClick={onToggleRunning}
          style={{
            flex: 1, padding: '0.45rem', borderRadius: 8, border: 'none',
            background: running ? '#d97706' : '#4f46e5',
            color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          {running ? '⏸ Pause' : '▶ Run'}
        </button>
        <button
          onClick={onReset}
          style={{
            padding: '0.45rem 0.75rem', borderRadius: 8, border: '1px solid #334155',
            background: '#1e293b', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer',
          }}
        >
          ↺ Reset
        </button>
      </div>
    </div>
  );
};

export default ParameterControls;
export { MODULES };
