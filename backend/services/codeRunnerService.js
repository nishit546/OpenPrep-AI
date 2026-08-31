/**
 * @fileoverview Code Runner Service — Issue #2200
 *
 * Routes execution through the Docker-based sandboxedCodeExecutionService.
 * The unsafe Piston API call and the unsandboxed local fallback have been
 * removed — untrusted code now ONLY runs in an isolated container.
 *
 * @module codeRunnerService
 */

const sandbox = require('./sandboxedCodeExecutionService');

/**
 * Executes user code in an isolated container sandbox.
 *
 * @param {string} language - 'python' | 'javascript' | 'cpp' | 'java'
 * @param {string} code - Source code string
 * @param {string} stdin - Standard input for the program
 * @returns {Promise<{status, stdout, stderr, compilationOutput, executionTimeMs, peakMemoryBytes}>}
 */
async function executeCode(language, code, stdin = '') {
  return sandbox.executeCode(language, code, stdin);
}

module.exports = { executeCode };
