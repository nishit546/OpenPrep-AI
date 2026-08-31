/**
 * ExecutionResult.jsx — Issue #2200
 *
 * Displays the status badge, execution time, and peak memory for one
 * test case result. Clearly distinguishes all result states.
 */
import React from 'react';

const STATUS_CONFIG = {
  PASSED: {
    label: '✓ PASSED',
    bg: 'rgba(34,197,94,0.15)',
    border: 'rgba(34,197,94,0.4)',
    color: '#4ade80',
  },
  FAILED: {
    label: '✗ FAILED',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.4)',
    color: '#f87171',
  },
  COMPILE_ERROR: {
    label: '⚙ COMPILE ERROR',
    bg: 'rgba(251,146,60,0.15)',
    border: 'rgba(251,146,60,0.4)',
    color: '#fb923c',
  },
  RUNTIME_ERROR: {
    label: '⚠ RUNTIME ERROR',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.4)',
    color: '#f87171',
  },
  TIMEOUT: {
    label: '⏱ TIME LIMIT EXCEEDED',
    bg: 'rgba(234,179,8,0.15)',
    border: 'rgba(234,179,8,0.4)',
    color: '#facc15',
  },
  MEMORY_LIMIT: {
    label: '💾 MEMORY LIMIT EXCEEDED',
    bg: 'rgba(168,85,247,0.15)',
    border: 'rgba(168,85,247,0.4)',
    color: '#c084fc',
  },
};

/**
 * @param {object} props
 * @param {string} props.status — 'PASSED' | 'FAILED' | 'COMPILE_ERROR' | 'RUNTIME_ERROR' | 'TIMEOUT' | 'MEMORY_LIMIT'
 * @param {number|null} props.executionTimeMs
 * @param {number|null} props.peakMemoryBytes
 * @param {string} [props.compilationOutput]
 * @param {string} [props.runtimeError]
 */
export default function ExecutionResult({
  status,
  executionTimeMs,
  peakMemoryBytes,
  compilationOutput,
  runtimeError,
}) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.FAILED;

  const timeSec = executionTimeMs != null
    ? (executionTimeMs / 1000).toFixed(3) + 's'
    : '—';

  const memMB = peakMemoryBytes != null
    ? (peakMemoryBytes / 1024 / 1024).toFixed(1) + ' MB'
    : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Status badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          borderRadius: '6px',
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          color: cfg.color,
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.05em',
          alignSelf: 'flex-start',
        }}
        data-testid="execution-status"
      >
        {cfg.label}
      </div>

      {/* Metrics row */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <Metric label="Time" value={timeSec} color="#60a5fa" />
        <Metric label="Memory" value={memMB} color="#c084fc" />
        <Metric label="Limit" value="2.0s / 128 MB" color="#6b7280" />
      </div>

      {/* Compilation output */}
      {compilationOutput && (
        <pre
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#fb923c',
            background: 'rgba(251,146,60,0.08)',
            border: '1px solid rgba(251,146,60,0.2)',
            borderRadius: '6px',
            padding: '8px 10px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {compilationOutput}
        </pre>
      )}

      {/* Runtime error */}
      {runtimeError && !compilationOutput && (
        <pre
          style={{
            fontSize: '11px',
            fontFamily: 'monospace',
            color: '#f87171',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '6px',
            padding: '8px 10px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: 0,
            maxHeight: '160px',
            overflowY: 'auto',
          }}
        >
          {runtimeError}
        </pre>
      )}
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 700, color, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  );
}
