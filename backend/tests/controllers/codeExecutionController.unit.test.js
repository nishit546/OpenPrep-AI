/**
 * Unit tests for codeSandboxController.js — Issue #2200
 */

const codeRunnerService = require('../../services/codeRunnerService');
const { executeCode, runCode } = require('../../controllers/codeSandboxController');

describe('Code Sandbox Controller (#2200)', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      user: { id: 'user-123' },
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    vi.restoreAllMocks();
  });

  describe('executeCode', () => {
    it('should return 400 if language or code is missing', async () => {
      req.body = { language: 'python' };
      await executeCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('required') })
      );
    });

    it('should return 400 for unsupported language', async () => {
      req.body = { language: 'ruby', code: 'puts "hi"' };
      await executeCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('Unsupported language') })
      );
    });

    it('should return 400 if code exceeds 64KB size limit', async () => {
      req.body = { language: 'python', code: 'x = 1\n'.repeat(15000) }; // ~90KB
      await executeCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('exceeds 64 KB') })
      );
    });

    it('should return 400 if test case count exceeds max 10', async () => {
      req.body = {
        language: 'python',
        code: 'print("hi")',
        testCases: Array(11).fill({ stdin: '', expectedOutput: '' }),
      };
      await executeCode(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, error: expect.stringContaining('Too many test cases') })
      );
    });

    it('should execute code securely and return PASSED result when actual matches expected', async () => {
      req.body = {
        language: 'cpp',
        code: '#include <iostream>\nusing namespace std;\nint main() { int x; cin >> x; cout << x * x << endl; return 0; }',
        testCases: [
          { stdin: '5', expectedOutput: '25' },
        ],
      };

      vi.spyOn(codeRunnerService, 'executeCode').mockResolvedValue({
        status: 'OK',
        stdout: '25\n',
        stderr: '',
        compilationOutput: null,
        executionTimeMs: 120,
        peakMemoryBytes: 4194304,
      });

      await executeCode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          language: 'cpp',
          total: 1,
          passed: 1,
          results: expect.arrayContaining([
            expect.objectContaining({
              status: 'PASSED',
              passed: true,
              actualOutput: '25\n',
              executionTimeMs: 120,
            }),
          ]),
        })
      );
    });

    it('should return FAILED status with diff when output differs', async () => {
      req.body = {
        language: 'javascript',
        code: 'console.log("world");',
        testCases: [
          { stdin: '', expectedOutput: 'hello' },
        ],
      };

      vi.spyOn(codeRunnerService, 'executeCode').mockResolvedValue({
        status: 'OK',
        stdout: 'world\n',
        stderr: '',
        compilationOutput: null,
        executionTimeMs: 50,
        peakMemoryBytes: 2000000,
      });

      await executeCode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 1,
          passed: 0,
          results: expect.arrayContaining([
            expect.objectContaining({
              status: 'FAILED',
              passed: false,
              diff: expect.stringContaining('- hello'),
            }),
          ]),
        })
      );
    });

    it('should handle COMPILE_ERROR gracefully', async () => {
      req.body = {
        language: 'java',
        code: 'public class Main { invalid java }',
        testCases: [{ stdin: '', expectedOutput: '' }],
      };

      vi.spyOn(codeRunnerService, 'executeCode').mockResolvedValue({
        status: 'COMPILE_ERROR',
        stdout: '',
        stderr: 'Syntax error on token',
        compilationOutput: 'Syntax error on token',
        executionTimeMs: 0,
        peakMemoryBytes: null,
      });

      await executeCode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          passed: 0,
          results: expect.arrayContaining([
            expect.objectContaining({
              status: 'COMPILE_ERROR',
              passed: false,
              compilationOutput: 'Syntax error on token',
            }),
          ]),
        })
      );
    });
  });

  describe('runCode (legacy collaborative room endpoint)', () => {
    it('should execute code and return formatted response for room sandbox', async () => {
      req.body = {
        language: 'python',
        code: 'print("hello")',
        testCases: [{ input: '', expected: 'hello' }],
      };

      vi.spyOn(codeRunnerService, 'executeCode').mockResolvedValue({
        status: 'OK',
        stdout: 'hello\n',
        stderr: '',
        executionTimeMs: 40,
        peakMemoryBytes: null,
      });

      await runCode(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          total: 1,
          passed: 1,
          results: expect.arrayContaining([
            expect.objectContaining({
              status: 'Passed',
              actual: 'hello\n',
            }),
          ]),
        })
      );
    });
  });
});
