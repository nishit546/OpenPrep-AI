/**
 * pyodideRunner.js — Issue #2200
 *
 * Main-thread API for in-browser Python execution via Pyodide Web Worker.
 *
 * Architecture:
 *  - A singleton Worker is created on first use and kept alive for the
 *    session (avoids Pyodide reload cost on subsequent runs).
 *  - A 6-second timeout terminates the Worker if Python code hangs.
 *    Worker termination is the only reliable way to stop an infinite loop.
 *  - A new Worker is created automatically after termination.
 *
 * Usage:
 *   import { runPython } from './pyodideRunner';
 *   const result = await runPython(code, stdin);
 *   // result: { stdout, stderr, error, executionTimeMs, status }
 */

const PYODIDE_TIMEOUT_MS = 6_000;

let worker = null;
let workerReady = false;
let pendingResolvers = [];

/**
 * Creates and initialises the Pyodide Web Worker.
 */
function createWorker() {
  worker = new Worker(new URL('./pyodideWorker.js', import.meta.url), { type: 'module' });
  workerReady = false;

  worker.onmessage = (event) => {
    const { type } = event.data;

    if (type === 'ready') {
      workerReady = true;
      // Flush any queued calls that arrived before 'ready'
      const queue = [...pendingResolvers];
      pendingResolvers = [];
      queue.forEach(({ resolve, reject, code, stdin }) => {
        _postRun(code, stdin).then(resolve).catch(reject);
      });
      return;
    }

    // 'result' or 'error' messages are handled by individual call's handler
    // (set per-call via worker.onmessage replacement — see _postRun)
  };

  worker.onerror = (err) => {
    console.error('[PyodideRunner] Worker error:', err);
    worker = null;
    workerReady = false;
  };
}

/**
 * Sends a 'run' message to the Worker and waits for the result.
 * Sets up a per-call message handler with timeout enforcement.
 *
 * @param {string} code
 * @param {string} stdin
 * @returns {Promise<{stdout, stderr, error, executionTimeMs, status}>}
 */
function _postRun(code, stdin) {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      // Terminate the Worker — the ONLY reliable way to stop infinite loops
      if (worker) {
        worker.terminate();
        worker = null;
        workerReady = false;
      }
      resolve({
        stdout: '',
        stderr: 'Time Limit Exceeded (6.0s)',
        error: null,
        executionTimeMs: PYODIDE_TIMEOUT_MS,
        status: 'TIMEOUT',
      });
    }, PYODIDE_TIMEOUT_MS);

    // Override the worker's onmessage for this specific call
    const previousOnMessage = worker.onmessage;
    worker.onmessage = (event) => {
      const { type } = event.data;

      if (type === 'ready') {
        // Re-attach previous handler for 'ready' (shouldn't happen mid-run, but safe)
        if (previousOnMessage) previousOnMessage(event);
        return;
      }

      if (type === 'result' || type === 'error') {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);

        // Restore generic handler
        worker.onmessage = previousOnMessage;

        if (type === 'error') {
          resolve({
            stdout: '',
            stderr: event.data.message || 'Python execution error',
            error: event.data.message,
            executionTimeMs: 0,
            status: 'RUNTIME_ERROR',
          });
        } else {
          const { stdout, stderr, error, executionTimeMs } = event.data;
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            error: error || null,
            executionTimeMs,
            status: error ? 'RUNTIME_ERROR' : 'OK',
          });
        }
      }
    };

    worker.postMessage({ type: 'run', code, stdin: stdin || '' });
  });
}

/**
 * Runs Python code in-browser via Pyodide.
 *
 * @param {string} code - Python source code
 * @param {string} [stdin=''] - Simulated stdin for input() calls
 * @returns {Promise<{stdout: string, stderr: string, error: string|null, executionTimeMs: number, status: string}>}
 */
export async function runPython(code, stdin = '') {
  if (!worker) {
    createWorker();
  }

  if (!workerReady) {
    // Queue the call until worker signals ready
    return new Promise((resolve, reject) => {
      pendingResolvers.push({ resolve, reject, code, stdin });
    });
  }

  return _postRun(code, stdin);
}

/**
 * Terminates the Pyodide Worker immediately.
 * Call on component unmount to free resources.
 */
export function terminatePyodideWorker() {
  if (worker) {
    worker.terminate();
    worker = null;
    workerReady = false;
    pendingResolvers = [];
  }
}
