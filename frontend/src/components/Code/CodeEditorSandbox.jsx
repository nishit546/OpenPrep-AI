/**
 * CodeEditorSandbox.jsx — Issue #2200
 *
 * Monaco-based collaborative code editor for the existing CodeSandboxPage.
 * Fixes the broken import in frontend/src/pages/code/CodeSandboxPage.jsx.
 * Uses the existing codeRoom Socket.IO service for real-time sync.
 *
 * @param {object} props
 * @param {string} props.roomId - CodeRoom UUID
 * @param {string} props.language - initial language
 * @param {Function} props.onCodeRun - (language, code) => void
 * @param {boolean} props.isRunning
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Loader2, Code2 } from 'lucide-react';
import { io } from 'socket.io-client';

const LANGUAGE_MONACO = {
  javascript: 'javascript',
  python: 'python',
  cpp: 'cpp',
  java: 'java',
  go: 'go',
  rust: 'rust',
};

const STARTERS = {
  javascript: '// JavaScript\nconsole.log("Hello, World!");',
  python: '# Python\nprint("Hello, World!")',
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  go: 'package main\nimport "fmt"\nfunc main() {\n    fmt.Println("Hello, World!")\n}',
  rust: 'fn main() {\n    println!("Hello, World!");\n}',
};

export default function CodeEditorSandbox({ roomId, language: initialLang, onCodeRun, isRunning }) {
  const [code, setCode] = useState(STARTERS[initialLang] || '');
  const [language, setLanguage] = useState(initialLang || 'javascript');
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  // Connect to collaborative code room via Socket.IO
  useEffect(() => {
    if (!roomId) return;

    const socket = io('/', { path: '/socket.io', withCredentials: true });
    socketRef.current = socket;

    socket.emit('join-code-room', { roomId });

    socket.on('code-update', ({ newCode }) => {
      if (newCode !== code) {
        setCode(newCode);
      }
    });

    return () => {
      socket.emit('leave-code-room', { roomId });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleCodeChange = useCallback((val) => {
    const newCode = val || '';
    setCode(newCode);
    if (socketRef.current && roomId) {
      socketRef.current.emit('code-change', { roomId, newCode });
    }
  }, [roomId]);

  const handleRun = () => {
    if (!isRunning && onCodeRun) {
      onCodeRun(language, code);
    }
  };

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
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#0b1120',
        borderBottom: '1px solid #1e293b',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={15} color="#818cf8" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            id="collab-language-selector"
            style={{
              background: '#1e293b',
              color: '#cbd5e1',
              border: '1px solid #334155',
              borderRadius: '5px',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {Object.keys(LANGUAGE_MONACO).map((l) => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
            ))}
          </select>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            main.{language === 'javascript' ? 'js' : language === 'python' ? 'py' : language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : language}
          </span>
        </div>

        <button
          id="collab-run-btn"
          onClick={handleRun}
          disabled={isRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '5px 14px',
            background: isRunning ? '#1e293b' : '#4f46e5',
            color: isRunning ? '#64748b' : '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
          }}
        >
          {isRunning
            ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Running…</>
            : <><Play size={13} fill="currentColor" /> Run</>
          }
        </button>
      </div>

      {/* Monaco editor */}
      <div style={{ flex: 1 }}>
        <Editor
          height="100%"
          language={LANGUAGE_MONACO[language] || 'plaintext'}
          value={code}
          onChange={handleCodeChange}
          onMount={(editor) => { editorRef.current = editor; }}
          theme="vs-dark"
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: 'on',
            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          }}
        />
      </div>
    </div>
  );
}
