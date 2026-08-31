const { executeCode } = require('../../services/codeRunnerService');

describe('Code Runner Service Unit Tests', () => {
  it('successfully runs a basic JavaScript code statement', async () => {
    const res = await executeCode('javascript', "console.log('Test Executed');", '', 2000);
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('Test Executed');
    expect(res.stderr).toBe('');
  });

  it('successfully runs a basic Python code statement', async () => {
    const res = await executeCode('python', "print('Hello Python')", '', 2000);
    expect(res.success).toBe(true);
    expect(res.stdout).toContain('Hello Python');
    expect(res.stderr).toBe('');
  });

  it('aborts and triggers timeout (TLE) for infinite loops', async () => {
    const res = await executeCode('javascript', 'while(true) {}', '', 1000);
    expect(res.success).toBe(false);
    expect(res.stderr).toContain('Time Limit Exceeded');
  });

  it('captures errors and prints stderr logs', async () => {
    const res = await executeCode('javascript', "throw new Error('Crash Sandbox');", '', 2000);
    expect(res.success).toBe(false);
    expect(res.stderr).toContain('Crash Sandbox');
  });
});
