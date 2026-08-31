/**
 * TestCasePanel.jsx — Issue #2200
 *
 * Manages a list of custom test cases (stdin + expected output).
 * Supports add / remove / edit. Max 10 cases enforced visually.
 */
import React from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

const MAX_CASES = 10;

/**
 * @param {object} props
 * @param {Array<{stdin: string, expectedOutput: string}>} props.testCases
 * @param {Function} props.onChange — called with new full array
 */
export default function TestCasePanel({ testCases, onChange }) {
  const [expanded, setExpanded] = React.useState(0); // index of open accordion item

  const update = (index, field, value) => {
    const next = testCases.map((tc, i) =>
      i === index ? { ...tc, [field]: value } : tc
    );
    onChange(next);
  };

  const add = () => {
    if (testCases.length >= MAX_CASES) return;
    onChange([...testCases, { stdin: '', expectedOutput: '' }]);
    setExpanded(testCases.length);
  };

  const remove = (index) => {
    const next = testCases.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [{ stdin: '', expectedOutput: '' }]);
    setExpanded(Math.max(0, expanded - (index <= expanded ? 1 : 0)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Test Cases ({testCases.length}/{MAX_CASES})
        </span>
        <button
          onClick={add}
          disabled={testCases.length >= MAX_CASES}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            fontSize: '11px',
            fontWeight: 700,
            color: testCases.length >= MAX_CASES ? '#374151' : '#818cf8',
            background: 'transparent',
            border: `1px solid ${testCases.length >= MAX_CASES ? '#374151' : 'rgba(129,140,248,0.3)'}`,
            borderRadius: '6px',
            cursor: testCases.length >= MAX_CASES ? 'not-allowed' : 'pointer',
          }}
          id="add-test-case-btn"
        >
          <Plus size={12} />
          Add Case
        </button>
      </div>

      {testCases.map((tc, index) => (
        <div
          key={index}
          style={{
            border: '1px solid #1e293b',
            borderRadius: '8px',
            overflow: 'hidden',
            background: '#0f172a',
          }}
        >
          {/* Accordion header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              cursor: 'pointer',
              background: expanded === index ? 'rgba(99,102,241,0.08)' : 'transparent',
              borderBottom: expanded === index ? '1px solid #1e293b' : 'none',
            }}
            onClick={() => setExpanded(expanded === index ? -1 : index)}
            role="button"
            aria-expanded={expanded === index}
            id={`test-case-header-${index}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {expanded === index
                ? <ChevronDown size={13} color="#94a3b8" />
                : <ChevronRight size={13} color="#94a3b8" />}
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>
                Case {index + 1}
              </span>
              {tc.stdin && (
                <span style={{ fontSize: '10px', color: '#64748b' }}>
                  stdin: {tc.stdin.slice(0, 20)}{tc.stdin.length > 20 ? '…' : ''}
                </span>
              )}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); remove(index); }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                padding: '2px',
              }}
              aria-label={`Remove test case ${index + 1}`}
              id={`remove-test-case-${index}`}
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Accordion body */}
          {expanded === index && (
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  htmlFor={`stdin-${index}`}
                  style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}
                >
                  Standard Input (stdin)
                </label>
                <textarea
                  id={`stdin-${index}`}
                  value={tc.stdin}
                  onChange={(e) => update(index, 'stdin', e.target.value)}
                  rows={3}
                  placeholder="e.g. 5&#10;10 20 30 40 50"
                  spellCheck={false}
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

              <div>
                <label
                  htmlFor={`expected-${index}`}
                  style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}
                >
                  Expected Output
                </label>
                <textarea
                  id={`expected-${index}`}
                  value={tc.expectedOutput}
                  onChange={(e) => update(index, 'expectedOutput', e.target.value)}
                  rows={3}
                  placeholder="e.g. 150"
                  spellCheck={false}
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
