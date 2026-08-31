/**
 * DiffView.jsx — Issue #2200
 *
 * Inline expected-vs-actual diff viewer with line-level red/green coloring.
 * No external diff library required.
 */
import React from 'react';

/**
 * Produces a line-level diff array from expected and actual strings.
 * Each item: { type: 'equal' | 'removed' | 'added', line: string }
 */
function computeDiff(expected, actual) {
  const expLines = (expected || '').split('\n');
  const actLines = (actual || '').split('\n');
  const maxLen = Math.max(expLines.length, actLines.length);
  const result = [];
  for (let i = 0; i < maxLen; i++) {
    const e = expLines[i];
    const a = actLines[i];
    if (e === undefined) {
      result.push({ type: 'added', line: a });
    } else if (a === undefined) {
      result.push({ type: 'removed', line: e });
    } else if (e === a) {
      result.push({ type: 'equal', line: e });
    } else {
      result.push({ type: 'removed', line: e });
      result.push({ type: 'added', line: a });
    }
  }
  return result;
}

const LINE_STYLES = {
  equal:   { background: 'transparent', color: '#9ca3af', prefix: '  ' },
  removed: { background: 'rgba(239,68,68,0.15)', color: '#f87171', prefix: '- ' },
  added:   { background: 'rgba(34,197,94,0.15)', color: '#4ade80', prefix: '+ ' },
};

/**
 * @param {object} props
 * @param {string} props.expected
 * @param {string} props.actual
 */
export default function DiffView({ expected, actual }) {
  const lines = computeDiff(
    (expected || '').trimEnd(),
    (actual || '').trimEnd()
  );

  return (
    <div
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        lineHeight: '1.5',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '8px',
        padding: '8px 0',
        overflowX: 'auto',
        maxHeight: '240px',
        overflowY: 'auto',
      }}
      aria-label="Output diff view"
    >
      {lines.map((item, idx) => {
        const s = LINE_STYLES[item.type];
        return (
          <div
            key={idx}
            style={{
              background: s.background,
              color: s.color,
              padding: '0 12px',
              whiteSpace: 'pre',
              userSelect: 'text',
            }}
          >
            {s.prefix}{item.line}
          </div>
        );
      })}
    </div>
  );
}
