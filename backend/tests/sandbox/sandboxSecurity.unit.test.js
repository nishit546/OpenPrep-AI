/**
 * Sandbox Security Unit & Integration Tests — Issue #2200
 */

const sandboxedService = require('../../services/sandboxedCodeExecutionService');
const childProcess = require('child_process');

describe('Sandboxed Code Execution Service Security (#2200)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject unsupported languages before spawning Docker', async () => {
    await expect(sandboxedService.executeCode('golang_unsupported', 'main()'))
      .rejects.toThrow('Unsupported language: golang_unsupported');
  });

  it('should spawn Docker container with strict security flags for JavaScript', async () => {
    const allSpawnCalls = [];

    vi.spyOn(childProcess, 'spawn').mockImplementation((cmd, args) => {
      allSpawnCalls.push({ cmd, args });
      return {
        stdout: { on: (event, cb) => { if (event === 'data') cb(Buffer.from('Hello, Sandbox!\n')); } },
        stderr: { on: () => {} },
        stdin: { write: () => {}, end: () => {} },
        on: (event, cb) => {
          if (event === 'close') process.nextTick(() => cb(0));
        },
        kill: vi.fn(),
        unref: vi.fn(),
      };
    });

    const result = await sandboxedService.executeCode('javascript', 'console.log("Hello, Sandbox!");');

    const runCall = allSpawnCalls.find(c => c.args.includes('run'));
    expect(runCall).toBeDefined();
    const capturedArgs = runCall.args;

    expect(capturedArgs).toContain('--network=none');
    expect(capturedArgs).toContain('--memory=128m');
    expect(capturedArgs).toContain('--memory-swap=128m');
    expect(capturedArgs).toContain('--pids-limit=50');
    expect(capturedArgs).toContain('--read-only');
    expect(capturedArgs).toContain('--security-opt=no-new-privileges');
    expect(capturedArgs).toContain('--cap-drop=ALL');
    expect(capturedArgs).toContain('--user=65534:65534');
    expect(result.status).toBe('OK');
    expect(result.stdout).toBe('Hello, Sandbox!\n');
  });

  it('should handle OOM kill (exit code 137) as MEMORY_LIMIT', async () => {
    vi.spyOn(childProcess, 'spawn').mockImplementation((cmd, args) => {
      const isRun = args.includes('run');
      return {
        stdout: { on: () => {} },
        stderr: { on: () => {} },
        stdin: { write: () => {}, end: () => {} },
        on: (event, cb) => {
          if (event === 'close') process.nextTick(() => cb(isRun ? 137 : 0));
        },
        kill: vi.fn(),
        unref: vi.fn(),
      };
    });

    const result = await sandboxedService.executeCode('python', 'a = "x" * 1000000000');

    expect(result.status).toBe('MEMORY_LIMIT');
    expect(result.stderr).toContain('Memory Limit Exceeded');
  });
});
