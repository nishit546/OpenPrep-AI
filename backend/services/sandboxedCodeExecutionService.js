/**
 * @fileoverview Sandboxed Code Execution Service — Issue #2200
 *
 * Executes untrusted user code inside an isolated Docker container.
 *
 * Security controls applied to EVERY container:
 *   --network=none          No network access
 *   --memory=128m           Hard 128 MB RAM limit (OOM kill)
 *   --memory-swap=128m      No swap — prevents memory tricks
 *   --cpus=0.5              Throttle CPU usage
 *   --pids-limit=50         Prevent fork bombs
 *   --read-only             Read-only root filesystem
 *   --tmpfs /tmp:size=32m,noexec,nosuid   Writable scratch only in tmpfs
 *   --security-opt=no-new-privileges      No setuid / capability gain
 *   --cap-drop=ALL          Drop ALL Linux capabilities
 *   --user=65534:65534      Run as unprivileged "nobody"
 *
 * Compile + run both happen inside the same restricted container.
 *
 * @module sandboxedCodeExecutionService
 */

const childProcess = require('child_process');
const { randomUUID } = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const logger = require('../utils/logger');

// ─── Configuration ─────────────────────────────────────────────────────────
const RUNNER_IMAGE = process.env.CODE_RUNNER_IMAGE || 'openprep-runner:latest';
const COMPILE_TIMEOUT_MS = 10_000;  // 10s for compilation (C++, Java)
const RUN_TIMEOUT_MS = 2_000;       // 2s for execution (all languages)
const MAX_OUTPUT_BYTES = 65_536;    // 64 KB — stdout + stderr cap per execution

// Language configuration: extension, compile command, run command
const LANGUAGE_CONFIG = {
  python: {
    extension: 'py',
    compileCmd: null,              // Interpreted — no compilation step
    runCmd: (file) => ['python3', file],
  },
  javascript: {
    extension: 'js',
    compileCmd: null,              // Interpreted — no compilation step
    runCmd: (file) => ['node', file],
  },
  cpp: {
    extension: 'cpp',
    compileCmd: (src, out) => ['g++', '-O2', '-std=c++17', '-o', out, src],
    runCmd: (_, out) => [out],
  },
  java: {
    extension: 'java',
    // Java class name must match filename; we always use "Main"
    compileCmd: (src) => ['javac', src],
    runCmd: (_, __, dir) => ['java', '-cp', dir, 'Main'],
  },
};

/**
 * Runs a shell command inside a NEW Docker container (not exec into existing).
 * Each call creates and auto-removes an isolated container.
 *
 * @param {string[]} dockerArgs - Full docker run arguments array
 * @param {string} stdin - Data to pipe to the container's stdin
 * @param {number} timeoutMs - Hard timeout in milliseconds
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number, timedOut: boolean}>}
 */
function runInContainer(dockerArgs, stdin, timeoutMs) {
  return new Promise((resolve) => {
    const proc = childProcess.spawn('docker', dockerArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const kill = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      if (stdout.length > MAX_OUTPUT_BYTES) {
        stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[Output truncated at 64KB]';
        proc.kill('SIGKILL');
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > MAX_OUTPUT_BYTES) {
        stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n[Stderr truncated at 64KB]';
      }
    });

    if (stdin) {
      proc.stdin.write(stdin);
    }
    proc.stdin.end();

    proc.on('close', (exitCode) => {
      clearTimeout(kill);
      resolve({ stdout, stderr, exitCode: exitCode ?? 1, timedOut });
    });

    proc.on('error', (err) => {
      clearTimeout(kill);
      resolve({ stdout, stderr: err.message, exitCode: 1, timedOut: false });
    });
  });
}

/**
 * Builds the common Docker run argument array for a sandboxed execution.
 *
 * @param {string} containerId - Unique name for this container instance
 * @param {string} tmpMountPath - Path on host to mount as /sandbox (read-only) — NOT used (read-only)
 * @param {string[]} cmd - Command + args to run inside the container
 * @returns {string[]} Full docker run argument array
 */
function buildDockerRunArgs(containerId, cmd) {
  return [
    'run',
    '--rm',                                   // Auto-remove after exit
    '--name', containerId,                    // Unique name for forced kill
    '--network=none',                         // No network
    '--memory=128m',                          // 128 MB RAM hard limit
    '--memory-swap=128m',                     // No swap
    '--cpus=0.5',                             // Half a CPU
    '--pids-limit=50',                        // Fork bomb prevention
    '--read-only',                            // Read-only root fs
    '--tmpfs', '/tmp:size=32m,noexec,nosuid,uid=65534,gid=65534', // Scratch only
    '--security-opt=no-new-privileges',       // No privilege escalation
    '--cap-drop=ALL',                         // Drop all capabilities
    '--user=65534:65534',                     // Non-root (nobody)
    '--workdir=/tmp',                         // Work in tmpfs
    RUNNER_IMAGE,
    ...cmd,
  ];
}

/**
 * Executes untrusted source code inside an isolated Docker container.
 *
 * @param {string} language - 'python' | 'javascript' | 'cpp' | 'java'
 * @param {string} code - Source code string
 * @param {string} stdin - Standard input for the program
 * @returns {Promise<{
 *   status: string,
 *   stdout: string,
 *   stderr: string,
 *   compilationOutput: string|null,
 *   executionTimeMs: number,
 *   peakMemoryBytes: number|null,
 * }>}
 */
async function executeCode(language, code, stdin = '') {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  // Create a temporary directory on the host to hold the source file.
  // We use a uuid-named dir to prevent any path collision.
  const sessionId = randomUUID();
  const hostTmpDir = path.join(os.tmpdir(), `openprep-sandbox-${sessionId}`);
  fs.mkdirSync(hostTmpDir, { recursive: true });

  // For Java, the file MUST be named Main.java
  const filename = language === 'java' ? 'Main.java' : `main.${config.extension}`;
  const hostSrcPath = path.join(hostTmpDir, filename);
  fs.writeFileSync(hostSrcPath, code, 'utf8');

  const containerId = `openprep-run-${sessionId}`;

  try {
    // ── Step 1: Compilation (C++ and Java only) ───────────────────────────
    let compilationOutput = null;

    if (config.compileCmd) {
      const srcInContainer = `/tmp/${filename}`;
      const outInContainer = language === 'cpp' ? '/tmp/main_exe' : undefined;

      // Inject source into container via bind-mount (read-only)
      const compileCmd = config.compileCmd(srcInContainer, outInContainer, '/tmp');

      const compileDockerArgs = [
        'run',
        '--rm',
        '--name', `${containerId}-compile`,
        '--network=none',
        '--memory=128m',
        '--memory-swap=128m',
        '--cpus=0.5',
        '--pids-limit=50',
        '--read-only',
        '--tmpfs', '/tmp:size=32m,noexec,nosuid,uid=65534,gid=65534',
        '--security-opt=no-new-privileges',
        '--cap-drop=ALL',
        '--user=65534:65534',
        '--workdir=/tmp',
        // Mount source file as read-only into the container
        '--volume', `${hostSrcPath}:/tmp/${filename}:ro`,
        RUNNER_IMAGE,
        ...compileCmd,
      ];

      const compileResult = await runInContainer(compileDockerArgs, '', COMPILE_TIMEOUT_MS);
      compilationOutput = (compileResult.stdout + compileResult.stderr).trim() || null;

      if (compileResult.exitCode !== 0) {
        return {
          status: 'COMPILE_ERROR',
          stdout: '',
          stderr: compileResult.stderr,
          compilationOutput,
          executionTimeMs: 0,
          peakMemoryBytes: null,
        };
      }
    }

    // ── Step 2: Execution ─────────────────────────────────────────────────
    const srcInContainer = `/tmp/${filename}`;
    const outInContainer = language === 'cpp' ? '/tmp/main_exe' : undefined;
    const runCmd = config.runCmd(srcInContainer, outInContainer, '/tmp');

    // For interpreted languages, mount source file; for compiled ones, we
    // need to compile and run in the same container session. Since we use
    // separate containers, for C++ and Java we do a combined compile+run.
    let runDockerArgs;

    if (config.compileCmd) {
      // Already compiled in step 1 — but since containers are ephemeral and
      // we can't share a binary between containers safely, we redo compile+run
      // in a single shell command inside one container. This is more secure
      // than sharing binary artifacts between containers.
      const srcFile = `/tmp/${filename}`;
      let shellCmd;

      if (language === 'cpp') {
        shellCmd = `g++ -O2 -std=c++17 -o /tmp/main_exe ${srcFile} && /tmp/main_exe`;
      } else if (language === 'java') {
        shellCmd = `javac ${srcFile} && java -cp /tmp Main`;
      }

      runDockerArgs = [
        'run',
        '--rm',
        '--name', containerId,
        '--network=none',
        '--memory=128m',
        '--memory-swap=128m',
        '--cpus=0.5',
        '--pids-limit=50',
        '--read-only',
        '--tmpfs', '/tmp:size=32m,noexec,nosuid,uid=65534,gid=65534',
        '--security-opt=no-new-privileges',
        '--cap-drop=ALL',
        '--user=65534:65534',
        '--workdir=/tmp',
        '--volume', `${hostSrcPath}:/tmp/${filename}:ro`,
        RUNNER_IMAGE,
        '/bin/sh', '-c', shellCmd,
      ];
    } else {
      // Interpreted: Python or JavaScript
      runDockerArgs = [
        'run',
        '--rm',
        '--name', containerId,
        '--network=none',
        '--memory=128m',
        '--memory-swap=128m',
        '--cpus=0.5',
        '--pids-limit=50',
        '--read-only',
        '--tmpfs', '/tmp:size=32m,noexec,nosuid,uid=65534,gid=65534',
        '--security-opt=no-new-privileges',
        '--cap-drop=ALL',
        '--user=65534:65534',
        '--workdir=/tmp',
        '--volume', `${hostSrcPath}:/tmp/${filename}:ro`,
        RUNNER_IMAGE,
        ...runCmd,
      ];
    }

    const startTime = Date.now();
    const runResult = await runInContainer(runDockerArgs, stdin, RUN_TIMEOUT_MS + 1000);
    const executionTimeMs = Date.now() - startTime;

    if (runResult.timedOut) {
      // Force-remove the container in case it's still running
      childProcess.spawn('docker', ['rm', '-f', containerId]).unref();
      return {
        status: 'TIMEOUT',
        stdout: runResult.stdout,
        stderr: 'Time Limit Exceeded (2.0s)',
        compilationOutput,
        executionTimeMs: RUN_TIMEOUT_MS,
        peakMemoryBytes: null,
      };
    }

    // Detect OOM kill (exit code 137 = SIGKILL, often from OOM)
    if (runResult.exitCode === 137) {
      return {
        status: 'MEMORY_LIMIT',
        stdout: runResult.stdout,
        stderr: 'Memory Limit Exceeded (128MB)',
        compilationOutput,
        executionTimeMs,
        peakMemoryBytes: 128 * 1024 * 1024,
      };
    }

    const status = runResult.exitCode === 0 ? 'OK' : 'RUNTIME_ERROR';

    return {
      status,
      stdout: runResult.stdout,
      stderr: runResult.stderr,
      compilationOutput,
      executionTimeMs,
      peakMemoryBytes: null, // Docker stats API not polled synchronously; null is honest
    };
  } catch (err) {
    logger.error(`[SandboxExecution] Unexpected error for session ${sessionId}: ${err.message}`);
    throw err;
  } finally {
    // Always clean up host tmp dir and any lingering container
    try { fs.rmSync(hostTmpDir, { recursive: true, force: true }); } catch (_) {}
    childProcess.spawn('docker', ['rm', '-f', containerId]).unref();
  }
}

module.exports = { executeCode };
