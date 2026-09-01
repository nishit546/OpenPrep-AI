/**
 * TelemetryGraph.jsx
 *
 * SVG line chart drawing two series against a rolling 120-sample time axis:
 *   - Velocity (white)
 *   - Kinetic Energy / KE (cyan)
 *   - Potential Energy / PE (amber)
 *
 * The buffer is a plain array managed via useRef to avoid React re-renders
 * on every animation frame; the graph only re-renders at 10 fps via setInterval.
 */
import React, { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';

const BUFFER_LEN = 120;
const GRAPH_FPS = 15; // graph refresh rate (lighter than rAF)

const SERIES = [
  { key: 'velocity', label: 'Velocity',    color: '#f1f5f9', unit: 'm/s' },
  { key: 'ke',       label: 'KE',          color: '#22d3ee', unit: 'J'   },
  { key: 'pe',       label: 'PE',          color: '#fbbf24', unit: 'J'   },
];

// ── Polyline builder ──────────────────────────────────────────────────────────
function buildPoints(values, maxVal, width, height, padX = 8, padY = 8) {
  if (!values.length) return '';
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  return values.map((v, i) => {
    const x = padX + (i / (BUFFER_LEN - 1)) * innerW;
    const y = padY + innerH - (maxVal > 0 ? (v / maxVal) * innerH : 0);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

// ── Component ─────────────────────────────────────────────────────────────────
const TelemetryGraph = forwardRef(({ moduleKey }, ref) => {
  const bufferRef = useRef({ velocity: [], ke: [], pe: [] });
  const [snapshot, setSnapshot] = useState({ velocity: [], ke: [], pe: [] });

  // Exposed push method so SimulationLab can push telemetry data
  useImperativeHandle(ref, () => ({
    push(data) {
      const buf = bufferRef.current;
      ['velocity', 'ke', 'pe'].forEach((k) => {
        buf[k].push(data[k] ?? 0);
        if (buf[k].length > BUFFER_LEN) buf[k].shift();
      });
    },
    clear() {
      bufferRef.current = { velocity: [], ke: [], pe: [] };
    },
  }));

  // Refresh snapshot at GRAPH_FPS
  useEffect(() => {
    const id = setInterval(() => {
      const buf = bufferRef.current;
      setSnapshot({ velocity: [...buf.velocity], ke: [...buf.ke], pe: [...buf.pe] });
    }, Math.round(1000 / GRAPH_FPS));
    return () => clearInterval(id);
  }, []);

  // Reset when module changes
  useEffect(() => {
    bufferRef.current = { velocity: [], ke: [], pe: [] };
  }, [moduleKey]);

  const W = 380, H = 120;
  const velMax = Math.max(1, ...snapshot.velocity) * 1.1;
  const energyMax = Math.max(1, ...snapshot.ke, ...snapshot.pe) * 1.1;

  return (
    <div style={{
      background: '#0b1120', border: '1px solid #1e293b', borderRadius: 10,
      padding: '0.75rem',
    }}>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: 6, flexWrap: 'wrap' }}>
        {SERIES.map((s) => (
          <span key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.68rem', color: s.color, fontWeight: 600 }}>
            <span style={{ width: 16, height: 2, background: s.color, display: 'inline-block', borderRadius: 1 }} />
            {s.label} ({s.unit})
          </span>
        ))}
      </div>

      {/* SVG graph */}
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
        {/* Background grid */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <line
            key={frac}
            x1={8} y1={8 + (H - 16) * frac}
            x2={W - 8} y2={8 + (H - 16) * frac}
            stroke="#1e293b" strokeWidth={0.5}
          />
        ))}
        {/* Y axis */}
        <line x1={8} y1={8} x2={8} y2={H - 8} stroke="#334155" strokeWidth={0.8} />
        {/* X axis */}
        <line x1={8} y1={H - 8} x2={W - 8} y2={H - 8} stroke="#334155" strokeWidth={0.8} />

        {/* Velocity line */}
        {snapshot.velocity.length > 1 && (
          <polyline
            points={buildPoints(snapshot.velocity, velMax, W, H)}
            fill="none" stroke="#f1f5f9" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {/* KE line */}
        {snapshot.ke.length > 1 && (
          <polyline
            points={buildPoints(snapshot.ke, energyMax, W, H)}
            fill="none" stroke="#22d3ee" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}
        {/* PE line */}
        {snapshot.pe.length > 1 && (
          <polyline
            points={buildPoints(snapshot.pe, energyMax, W, H)}
            fill="none" stroke="#fbbf24" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Live value badges at right edge */}
        {SERIES.map((s, i) => {
          const arr = snapshot[s.key];
          const last = arr[arr.length - 1] ?? 0;
          const yPos = 18 + i * 18;
          return (
            <text key={s.key} x={W - 6} y={yPos} textAnchor="end"
              fontSize={9} fill={s.color} fontFamily="monospace" fontWeight="bold">
              {last.toFixed(1)}
            </text>
          );
        })}
      </svg>
    </div>
  );
});

TelemetryGraph.displayName = 'TelemetryGraph';
export default TelemetryGraph;
