/**
 * pyodideWorker.js — Issue #2200
 *
 * Web Worker that loads Pyodide from CDN and executes Python code
 * in-browser without any server roundtrip.
 *
 * Security: executes in a Worker (isolated JS realm). No DOM access.
 * CPU timeout: the Worker is terminated by the main thread after 6s
 * (see pyodideRunner.js). Terminating the Worker is the only reliable
 * way to stop a runaway Python infinite loop in the browser.
 *
 * Messages IN  (from main thread):
 *   { type: 'run', code: string, stdin: string }
 *
 * Messages OUT (to main thread):
 *   { type: 'ready' }   — Pyodide loaded and ready
 *   { type: 'result', stdout: string, stderr: string, error: string|null, executionTimeMs: number }
 *   { type: 'error',  message: string }   — Pyodide load failure
 */

/* global importScripts, loadPyodide */

let pyodide = null;
let loadingPromise = null;

/**
 * Loads Pyodide from CDN (once, cached).
 */
async function ensurePyodide() {
  if (pyodide) return pyodide;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    // Pyodide 0.27.x — stable LTS with NumPy available via micropip
    importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.js');

    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/',
    });

    // Redirect Python's sys.stdout and sys.stderr to in-memory buffers
    // so we can capture print() output without any DOM interaction.
    await pyodide.runPythonAsync(`
import sys
import io

_stdout_buffer = io.StringIO()
_stderr_buffer = io.StringIO()

sys.stdout = _stdout_buffer
sys.stderr = _stderr_buffer
`);

    return pyodide;
  })();

  return loadingPromise;
}

self.onmessage = async (event) => {
  const { type, code, stdin } = event.data;

  if (type !== 'run') return;

  try {
    const py = await ensurePyodide();

    // Reset buffers before each run
    await py.runPythonAsync(`
_stdout_buffer.truncate(0)
_stdout_buffer.seek(0)
_stderr_buffer.truncate(0)
_stderr_buffer.seek(0)
`);

    // Inject stdin as a mock so input() calls don't block
    if (stdin) {
      const escapedStdin = stdin.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
      await py.runPythonAsync(`
import builtins as _builtins
_stdin_lines = '${escapedStdin}'.split('\\n')
_stdin_idx = 0

def _mock_input(prompt=''):
    global _stdin_idx
    if _stdin_idx < len(_stdin_lines):
        val = _stdin_lines[_stdin_idx]
        _stdin_idx += 1
        return val
    return ''

_builtins.input = _mock_input
`);
    }

    const t0 = Date.now();
    let runError = null;

    try {
      await py.runPythonAsync(code);
    } catch (pyErr) {
      runError = pyErr.message || String(pyErr);
    }

    const executionTimeMs = Date.now() - t0;

    const stdout = py.runPython('_stdout_buffer.getvalue()');
    const stderr = py.runPython('_stderr_buffer.getvalue()');

    self.postMessage({
      type: 'result',
      stdout: stdout || '',
      stderr: stderr || '',
      error: runError,
      executionTimeMs,
    });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message || String(err) });
  }
};

// Signal readiness after the Worker script is evaluated.
// Actual Pyodide load is deferred until the first 'run' message.
self.postMessage({ type: 'ready' });
