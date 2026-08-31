/**
 * ExecutionConsole.jsx — Issue #2200
 *
 * Execution results console for the collaborative CodeSandboxPage.
 * Fixes the broken import in frontend/src/pages/code/CodeSandboxPage.jsx.
 *
 * @param {object} props
 * @param {Array} props.results - per-test-case result objects
 * @param {number} props.total
 * @param {number} props.passed
 * @param {string} props.stdin
 * @param {Function} props.setStdin
 */
import React, { useState } from 'react';
import { Terminal, Cpu } from 'lucide-react';

export default function ExecutionConsole({ results, total, passed, stdin, setStdin }) {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'output'

  const hasResults = results && results.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: '#0b1120',
        borderBottom: '1px solid #1e293b',
      }}>
        <Terminal size={15} color="#818cf8" />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>Console</span>
        {hasResults && (
          <span style={{
            marginLeft: 'auto',
            fontSize: '11px',
            fontWeight: 700,
            color: passed === total ? '#4ade80' : '#f87171',
            background: passed === total ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            padding: '2px 8px',
            borderRadius: '5px',
          }}>
            {passed}/{total} passed
          </span>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
        {['input', 'output'].map((tab) => (
          <button
            key={tab}
            id={`console-tab-${tab}`}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '8px',
              fontSize: '11px',
              fontWeight: 700,
              color: activeTab === tab ? '#818cf8' : '#64748b',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #818cf8' : '2px solid transparent',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {activeTab === 'input' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              htmlFor="console-stdin"
              style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Standard Input (stdin)
            </label>
            <textarea
              id="console-stdin"
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              rows={10}
              placeholder="Enter input for your program here..."
              style={{
                width: '100%',
                background: '#020617',
                border: '1px solid #1e293b',
                borderRadius: '6px',
                padding: '8px',
                color: '#e2e8f0',
                fontFamily: 'monospace',
                fontSize: '12px',
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}

        {activeTab === 'output' && !hasResults && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', color: '#475569' }}>
            <Cpu size={28} />
            <span style={{ fontSize: '12px' }}>Run code to see output</span>
          </div>
        )}

        {activeTab === 'output' && hasResults && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {results.map((r, idx) => (
              <div
                key={idx}
                style={{
                  background: '#0b1120',
                  border: `1px solid ${r.status === 'Passed' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#94a3b8' }}>Test {idx + 1}</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: r.status === 'Passed' ? '#4ade80' : '#f87171',
                    background: r.status === 'Passed' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}>
                    {r.status?.toUpperCase()}
                  </span>
                </div>
                {r.actual && (
                  <pre style={{ margin: 0, color: '#e2e8f0', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.actual}
                  </pre>
                )}
                {r.stderr && (
                  <pre style={{ margin: '6px 0 0', color: '#f87171', fontFamily: 'monospace', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {r.stderr}
                  </pre>
                )}
                <div style={{ marginTop: '6px', display: 'flex', gap: '10px', color: '#475569', fontSize: '10px' }}>
                  {r.time && <span>⏱ {r.time}</span>}
                  {r.memory && <span>💾 {r.memory}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
