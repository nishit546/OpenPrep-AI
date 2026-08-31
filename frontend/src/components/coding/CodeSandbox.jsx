/**
 * CodeSandbox.jsx — Issue #2200
 *
 * In-Browser Sandboxed Code Runner with Test Case Evaluator.
 *
 * Python  → Pyodide Web Worker (in-browser, no server roundtrip)
 * C++ / Java / JavaScript → POST /api/code/execute (Docker sandbox)
 *
 * Features:
 *  - Monaco code editor with language-aware syntax highlighting
 *  - Language selector (Python, JavaScript, C++, Java)
 *  - Pyodide-based in-browser Python execution
 *  - Backend Docker-sandboxed execution for C++, Java, JS
 *  - Custom test-case management (up to 10 cases)
 *  - Expected vs. actual output with line-level diff
 *  - Status badges: PASSED, FAILED, COMPILE_ERROR, RUNTIME_ERROR, TIMEOUT, MEMORY_LIMIT
 *  - Execution time and peak memory display
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, AlertCircle, Terminal } from 'lucide-react';
import TestCasePanel from './TestCasePanel';
import ExecutionResult from './ExecutionResult';
import DiffView from './DiffView';
import { runPython, terminatePyodideWorker } from '../../services/pyodideRunner';
import API from '../../services/api';

// ─── Language Configuration ─────────────────────────────────────────────────

const LANGUAGES = [
  { value: 'python',     label: 'Python 3',         monacoLang: 'python',     starter: `# Python 3 — runs in-browser via Pyodide\nprint("Hello, World!")` },
  { value: 'javascript', label: 'JavaScript (Node)', monacoLang: 'javascript', starter: `// JavaScript — runs in Docker sandbox\nconsole.log("Hello, World!");` },
  { value: 'cpp',        label: 'C++ 17',            monacoLang: 'cpp',        starter: `// C++ 17 — compiled with g++ in Docker sandbox\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}` },
  { value: 'java',       label: 'Java 21',           monacoLang: 'java',       starter: `// Java 21 — compiled with javac in Docker sandbox\n// Class MUST be named Main\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}` },
];

const LANG_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.value, l]));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getStatusSummary(results) {
  if (!results || results.length === 0) return null;
  const passed = results.filter((r) => r.passed).length;
  const total = results.length;
  return { passed, total };
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * @param {object} props
 * @param {string} [props.initialLanguage] - default language key
 * @param {string} [props.initialCode] - override starter code
 * @param {string} [props.title] - optional title shown in header
 */
export default function CodeSandbox({
  initialLanguage = 'python',
  initialCode,
  title = 'Code Sandbox',
}) {
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode || LANG_MAP[initialLanguage].starter);
  const [testCases, setTestCases] = useState([{ stdin: '', expectedOutput: '' }]);
  const [results, setResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('testcases'); // 'testcases' | 'results'
  const [pyodideLoading, setPyodideLoading] = useState(false);
  const editorRef = useRef(null);

  // Terminate Pyodide Worker on unmount
  useEffect(() => () => terminatePyodideWorker(), []);

  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang);
    if (!initialCode) {
      setCode(LANG_MAP[lang].starter);
    }
    setResults(null);
    setErrorMsg('');
  }, [initialCode]);

  /**
   * Routes Python to Pyodide, everything else to the backend Docker sandbox.
   */
  const handleRun = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setErrorMsg('');
    setResults(null);

    try {
      if (language === 'python') {
        // ── In-browser Python via Pyodide ───────────────────────────────────
        setPyodideLoading(true);
        const caseResults = [];
        let passedCount = 0;

        for (const [idx, tc] of testCases.entries()) {
          const pyResult = await runPython(code, tc.stdin || '');
          setPyodideLoading(false);

          const actualNorm = (pyResult.stdout || '').trimEnd();
          const expectedNorm = (tc.expectedOutput || '').trimEnd();
          const passed = actualNorm === expectedNorm && pyResult.status === 'OK';

          let status;
          if (pyResult.status === 'TIMEOUT') status = 'TIMEOUT';
          else if (pyResult.status === 'RUNTIME_ERROR' || pyResult.error) status = 'RUNTIME_ERROR';
          else status = passed ? 'PASSED' : 'FAILED';

          if (status === 'PASSED') passedCount++;

          caseResults.push({
            testCaseIndex: idx,
            stdin: tc.stdin || '',
            expectedOutput: tc.expectedOutput || '',
            actualOutput: pyResult.stdout || '',
            status,
            passed: status === 'PASSED',
            diff: status === 'FAILED' ? null : null, // computed in DiffView
            executionTimeMs: pyResult.executionTimeMs,
            peakMemoryBytes: null,
            compilationOutput: null,
            runtimeError: pyResult.stderr || pyResult.error || null,
          });
        }

        setResults({
          language: 'python',
          total: testCases.length,
          passed: passedCount,
          results: caseResults,
        });
      } else {
        // ── Backend Docker sandbox (C++, Java, JavaScript) ──────────────────
        const response = await API.post('/code/execute', {
          language,
          code,
          testCases: testCases.map((tc) => ({
            stdin: tc.stdin || '',
            expectedOutput: tc.expectedOutput || '',
          })),
        }, { timeout: 30_000 });

        setResults(response.data);
      }

      setActiveTab('results');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Execution failed';
      setErrorMsg(msg);
    } finally {
      setIsRunning(false);
      setPyodideLoading(false);
    }
  };

  const summary = getStatusSummary(results?.results);
  const monacoLang = LANG_MAP[language]?.monacoLang || 'plaintext';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0b0f1a',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={16} color="#818cf8" />
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#e2e8f0' }}>{title}</span>
          {language === 'python' && (
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: 'rgba(129,140,248,0.15)',
                color: '#818cf8',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              IN-BROWSER
            </span>
          )}
          {language !== 'python' && (
            <span
              style={{
                fontSize: '9px',
                padding: '2px 6px',
                background: 'rgba(34,197,94,0.1)',
                color: '#4ade80',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              DOCKER SANDBOX
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Language selector */}
          <select
            id="language-selector"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isRunning}
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
            aria-label="Select programming language"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>

          {/* Run button */}
          <button
            id="run-code-btn"
            onClick={handleRun}
            disabled={isRunning}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              background: isRunning ? '#1e293b' : '#4f46e5',
              color: isRunning ? '#64748b' : '#fff',
              border: 'none',
              borderRadius: '7px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: isRunning ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            aria-label="Run code"
          >
            {isRunning
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
              : <><Play size={13} fill="currentColor" /> Run</>
            }
          </button>
        </div>
      </div>

      {/* ── Main body: editor + side panel ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Monaco Editor ── */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={monacoLang}
            value={code}
            onChange={(val) => setCode(val || '')}
            onMount={(editor) => { editorRef.current = editor; }}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: 'on',
              roundedSelection: true,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
              fontFamily: '"JetBrains Mono", "Fira Code", monospace',
              fontLigatures: true,
            }}
          />
        </div>

        {/* ── Right panel: test cases + results ── */}
        <div
          style={{
            width: '340px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderLeft: '1px solid #1e293b',
            overflow: 'hidden',
          }}
        >
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1e293b' }}>
            {[
              { key: 'testcases', label: 'Test Cases' },
              { key: 'results', label: summary ? `Results ${summary.passed}/${summary.total}` : 'Results' },
            ].map((tab) => (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  flex: 1,
                  padding: '9px 4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeTab === tab.key ? '#818cf8' : '#64748b',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.key ? '2px solid #818cf8' : '2px solid transparent',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 12px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: '#f87171',
                }}
                role="alert"
                id="execution-error-msg"
              >
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {errorMsg}
              </div>
            )}

            {activeTab === 'testcases' && (
              <TestCasePanel testCases={testCases} onChange={setTestCases} />
            )}

            {activeTab === 'results' && (
              <ResultsPanel
                results={results?.results}
                isRunning={isRunning}
                pyodideLoading={pyodideLoading}
                language={language}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ResultsPanel ─────────────────────────────────────────────────────────────

function ResultsPanel({ results, isRunning, pyodideLoading, language }) {
  if (isRunning || pyodideLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '12px' }}>
        <Loader2 size={28} color="#818cf8" style={{ animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '12px', color: '#64748b' }}>
          {language === 'python' && pyodideLoading ? 'Loading Pyodide…' : 'Running…'}
        </span>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', gap: '8px', color: '#475569' }}>
        <Terminal size={32} />
        <span style={{ fontSize: '12px' }}>Run your code to see results</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {results.map((r, idx) => (
        <div
          key={idx}
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8' }}>
              Case {idx + 1}
            </span>
          </div>

          <ExecutionResult
            status={r.status}
            executionTimeMs={r.executionTimeMs}
            peakMemoryBytes={r.peakMemoryBytes}
            compilationOutput={r.compilationOutput}
            runtimeError={r.runtimeError}
          />

          {/* Stdout */}
          {r.actualOutput && r.status !== 'COMPILE_ERROR' && (
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Output
              </div>
              <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '12px', color: '#e2e8f0', background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '120px', overflowY: 'auto' }}>
                {r.actualOutput}
              </pre>
            </div>
          )}

          {/* Diff for FAILED cases */}
          {r.status === 'FAILED' && (
            <div>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Diff (expected → actual)
              </div>
              <DiffView expected={r.expectedOutput} actual={r.actualOutput} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
