---
title: '[FEAT]: In-Browser Sandboxed Code Runner (Python, C++, Java, JS) with Test Case Evaluator'
labels: 'enhancement, fullstack, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Computer Science and Engineering students need to solve coding problems, debug algorithms, and test data structures directly within their study workflow without juggling separate IDEs or local terminal environments.

This feature introduces an **In-Browser Sandboxed Code Execution Environment & Test Case Evaluator** supporting Python, C++, Java, and JavaScript with memory/time execution limits and automated test suite evaluation.

---

## Technical Scope & Architecture

### Backend & In-Browser Execution Engines
1. **Client-Side Python Engine (`frontend/src/services/pyodideRunner.js`)**:
   - WebAssembly-based Pyodide engine for instant, zero-latency in-browser Python 3.11 execution with NumPy and standard library support.
2. **Backend Secure Multi-Language Judge (`backend/services/codeExecutionService.js`)**:
   - Sandboxed Docker / gVisor container runners for C++ (g++ 13), Java (OpenJDK 21), and Node.js.
   - Enforces strict security constraints: No network access (`--net=none`), memory limit (128MB), CPU execution timeout (2.0 seconds), non-root execution.
3. **Interactive Code Studio (`frontend/src/components/coding/CodeSandbox.jsx`)**:
   - Monaco Editor / CodeMirror 6 with syntax highlighting, auto-completion, and bracket matching.
   - Test Case runner panel: displays Standard Input (stdin), Expected Output, Actual Output, Diff view, Execution Time (ms), and Peak Memory usage.

---

## Acceptance Criteria
- [ ] In-browser Python code executes instantly via Pyodide without server roundtrips.
- [ ] Backend sandbox safely executes C++, Java, and JS with 2-second timeout and 128MB RAM caps.
- [ ] Validates custom user test cases and displays visual diff between expected and actual output.
- [ ] Security audits confirm no shell escapes, file system tampering, or unauthorized network calls.
