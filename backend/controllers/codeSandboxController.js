/**
 * @fileoverview Code Sandbox Controller — Issue #2200
 *
 * Handles sandboxed code execution with full input validation and
 * per-test-case result evaluation.
 *
 * Security note: all execution happens inside an isolated Docker container
 * via sandboxedCodeExecutionService. This controller never executes code
 * directly.
 */

const crypto = require('crypto');
const CodeRoom = require('../models/CodeRoom');
const User = require('../models/User');
const codeRunnerService = require('../services/codeRunnerService');

// ─── Constants ──────────────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = ['python', 'javascript', 'cpp', 'java'];
const MAX_CODE_BYTES = 65_536;       // 64 KB
const MAX_TEST_CASES = 10;
const MAX_STDIN_BYTES = 4_096;       // 4 KB per case
const MAX_EXPECTED_BYTES = 4_096;    // 4 KB per case

/**
 * Normalizes output for comparison:
 * - Trim trailing whitespace from each line
 * - Remove trailing blank lines
 * This is a deterministic comparison — not fuzzy.
 *
 * @param {string} raw
 * @returns {string}
 */
function normalizeOutput(raw) {
  return (raw || '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trimEnd();
}

/**
 * Produces a minimal line-level diff string for display.
 * Lines present in expected but not actual are prefixed with "-".
 * Lines present in actual but not expected are prefixed with "+".
 *
 * @param {string} expected
 * @param {string} actual
 * @returns {string|null} diff string, or null if outputs are equal
 */
function buildDiff(expected, actual) {
  const expLines = expected.split('\n');
  const actLines = actual.split('\n');
  const maxLen = Math.max(expLines.length, actLines.length);
  const diff = [];
  for (let i = 0; i < maxLen; i++) {
    const e = expLines[i] ?? '';
    const a = actLines[i] ?? '';
    if (e === a) {
      diff.push(`  ${e}`);
    } else {
      if (expLines[i] !== undefined) diff.push(`- ${e}`);
      if (actLines[i] !== undefined) diff.push(`+ ${a}`);
    }
  }
  return diff.join('\n');
}

/**
 * POST /api/code/execute
 *
 * Executes code against one or more test cases and returns per-case results.
 */
const executeCode = async (req, res) => {
  const { language, code, testCases } = req.body;

  // ── Validation ────────────────────────────────────────────────────────────
  if (!language || !code) {
    return res.status(400).json({ success: false, error: 'language and code are required' });
  }
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({
      success: false,
      error: `Unsupported language: ${language}. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`,
    });
  }
  if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
    return res.status(400).json({ success: false, error: 'Code size exceeds 64 KB limit' });
  }

  const list = Array.isArray(testCases) && testCases.length > 0
    ? testCases
    : [{ stdin: '', expectedOutput: '' }];

  if (list.length > MAX_TEST_CASES) {
    return res.status(400).json({
      success: false,
      error: `Too many test cases (max ${MAX_TEST_CASES})`,
    });
  }

  for (const [i, tc] of list.entries()) {
    if (Buffer.byteLength(tc.stdin || '', 'utf8') > MAX_STDIN_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Test case ${i + 1}: stdin exceeds 4 KB limit`,
      });
    }
    if (Buffer.byteLength(tc.expectedOutput || '', 'utf8') > MAX_EXPECTED_BYTES) {
      return res.status(400).json({
        success: false,
        error: `Test case ${i + 1}: expectedOutput exceeds 4 KB limit`,
      });
    }
  }

  // ── Execution ─────────────────────────────────────────────────────────────
  const results = [];
  let passedCount = 0;

  try {
    for (const [idx, tc] of list.entries()) {
      const stdin = tc.stdin || '';
      const expectedRaw = tc.expectedOutput || '';

      let execResult;
      try {
        execResult = await codeRunnerService.executeCode(language, code, stdin);
      } catch (execErr) {
        // Sandbox itself failed (Docker unavailable, etc.)
        return res.status(503).json({
          success: false,
          error: 'Execution sandbox unavailable. Please try again later.',
        });
      }

      const actualNorm = normalizeOutput(execResult.stdout);
      const expectedNorm = normalizeOutput(expectedRaw);
      const passed = actualNorm === expectedNorm && execResult.status === 'OK';

      let status;
      switch (execResult.status) {
        case 'COMPILE_ERROR':  status = 'COMPILE_ERROR'; break;
        case 'TIMEOUT':        status = 'TIMEOUT'; break;
        case 'MEMORY_LIMIT':   status = 'MEMORY_LIMIT'; break;
        case 'RUNTIME_ERROR':  status = 'RUNTIME_ERROR'; break;
        case 'OK':
          status = passed ? 'PASSED' : 'FAILED';
          if (passed) passedCount++;
          break;
        default:               status = 'FAILED';
      }

      const diff = (status === 'FAILED')
        ? buildDiff(expectedNorm, actualNorm)
        : null;

      results.push({
        testCaseIndex: idx,
        stdin,
        expectedOutput: expectedRaw,
        actualOutput: execResult.stdout,
        status,
        passed: status === 'PASSED',
        diff,
        executionTimeMs: execResult.executionTimeMs,
        peakMemoryBytes: execResult.peakMemoryBytes,
        compilationOutput: execResult.compilationOutput || null,
        runtimeError: execResult.stderr || null,
      });
    }

    return res.json({
      success: true,
      language,
      total: list.length,
      passed: passedCount,
      results,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/code/run (existing — kept for collaborative code room feature)
 *
 * Runs code against multiple test cases using the same sandbox.
 * Kept for backward compatibility with CodeSandboxPage room execution.
 */
const runCode = async (req, res) => {
  const { language, code, testCases } = req.body;

  if (!language || !code) {
    return res.status(400).json({ success: false, error: 'Language and code are required' });
  }
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    return res.status(400).json({ success: false, error: `Unsupported language: ${language}` });
  }

  const results = [];
  let passedCount = 0;

  try {
    const list = Array.isArray(testCases) ? testCases : [{ input: '', expected: '' }];

    for (const tc of list) {
      let execResult;
      try {
        execResult = await codeRunnerService.executeCode(language, code, tc.input || '');
      } catch (_) {
        return res.status(503).json({ success: false, error: 'Execution sandbox unavailable.' });
      }

      const actualClean = normalizeOutput(execResult.stdout);
      const expectedClean = normalizeOutput(tc.expected || '');

      let status = 'Failed';
      if (execResult.status === 'TIMEOUT') {
        status = 'Time Limit Exceeded';
      } else if (execResult.status === 'COMPILE_ERROR') {
        status = 'Compilation Error';
      } else if (execResult.status === 'RUNTIME_ERROR') {
        status = 'Runtime Error';
      } else if (execResult.status === 'MEMORY_LIMIT') {
        status = 'Memory Limit Exceeded';
      } else if (actualClean === expectedClean && execResult.status === 'OK') {
        status = 'Passed';
        passedCount++;
      }

      results.push({
        input: tc.input || '',
        expected: tc.expected || '',
        actual: execResult.stdout || '',
        stderr: execResult.stderr || '',
        status,
        time: (execResult.executionTimeMs / 1000).toFixed(3),
        memory: execResult.peakMemoryBytes ? (execResult.peakMemoryBytes / 1024 / 1024).toFixed(1) : '—',
      });
    }

    return res.json({ success: true, total: list.length, passed: passedCount, results });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Creates a collaborative coding room (unchanged).
 */
const createRoom = async (req, res) => {
  const { title, language } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, error: 'Room title is required' });
  }
  try {
    const inviteCode = crypto.randomBytes(4).toString('hex');
    const room = await CodeRoom.create({
      title,
      language: language || 'javascript',
      inviteCode,
      userId: req.user.id,
      code: '',
    });
    return res.status(201).json({ success: true, room, shareLink: `/code/room/${inviteCode}` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * Gets code room details by invite code (unchanged).
 */
const getRoom = async (req, res) => {
  const { inviteCode } = req.params;
  try {
    const room = await CodeRoom.findOne({
      where: { inviteCode },
      include: [{ model: User, as: 'creator', attributes: ['id', 'name', 'avatarUrl'] }],
    });
    if (!room) {
      return res.status(404).json({ success: false, error: 'Coding room not found' });
    }
    return res.json({ success: true, room });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = { executeCode, runCode, createRoom, getRoom };
