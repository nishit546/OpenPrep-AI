---
title: '[FEAT]: Collaborative Real-Time Code Interview & Pair-Programming Sandbox for CS Exams'
labels: 'enhancement, frontend, backend, high-priority, ECSoC26, ECSoC26-L3'
assignees: ''
---

## Summary & Motivation
Computer Science and Engineering students need an interactive coding environment to practice Data Structures & Algorithms (DSA), competitive programming, and technical interview problems together with study squad peers.

This feature introduces a **Collaborative Real-Time Code Sandbox** equipped with Monaco Editor, WebSocket operational transformation, multi-language execution, and custom unit-test runners.

---

## Technical Scope & Architecture

### Frontend Architecture
1. **Monaco Code Editor (`frontend/src/components/code/CodeEditorSandbox.jsx`)**:
   - Monaco Editor integration with multi-language syntax highlighting (Python, JavaScript, C++, Java, Go, Rust).
   - Theme toggle (VS Code Dark, GitHub Light, Monokai, Nord).
   - Real-time peer cursor indicators with collaborator name tags and colored selection highlights.
2. **Test Case & Console Output Drawer (`frontend/src/components/code/ExecutionConsole.jsx`)**:
   - Tabbed interface for Standard Input (stdin), Standard Output (stdout), Error Trace (stderr), and Execution Time/Memory benchmarks.
   - Visual test case validation badges (Passed / Failed / Time Limit Exceeded).

### Backend Architecture
1. **WebSocket Collaboration Handler (`backend/services/codeRoomSocketService.js`)**:
   - Yjs / CRDT room binding for real-time conflict-free collaborative editing over WebSockets.
   - Awareness states for tracking user presence, active line numbers, and typing locks.
2. **Isolated Code Execution Engine (`backend/services/codeRunnerService.js`)**:
   - Sandboxed execution wrapper (Docker container / Piston API integration) with strict memory limits (128MB) and timeout thresholds (5s).
3. **REST Endpoints (`backend/controllers/codeSandboxController.js`)**:
   - `POST /api/code/run` - Executes code against standard test cases and returns execution metrics.
   - `POST /api/code/rooms` - Creates a persistent collaborative coding session with shareable invite link.

---

## Acceptance Criteria
- [ ] Multiple users can write and edit code in the same session simultaneously without race conditions.
- [ ] Supported languages (Python, JavaScript, C++, Java) compile and run with output streamed back to the console.
- [ ] Execution sandbox safely handles infinite loops and memory leaks with timeouts.
- [ ] Automated Jest test suite covering WebSocket room join/leave and sandbox security isolation.
