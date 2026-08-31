import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeSandbox from './CodeSandbox';
import API from '../../services/api';
import { runPython } from '../../services/pyodideRunner';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="monaco-mock"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

// Mock pyodideRunner
vi.mock('../../services/pyodideRunner', () => ({
  runPython: vi.fn(),
  terminatePyodideWorker: vi.fn(),
}));

// Mock API service
vi.mock('../../services/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('CodeSandbox Component (#2200)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, language selector, run button, and Monaco editor', () => {
    render(<CodeSandbox title="Test Sandbox" />);

    expect(screen.getByText('Test Sandbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Select programming language')).toBeInTheDocument();
    expect(screen.getByLabelText('Run code')).toBeInTheDocument();
    expect(screen.getByTestId('monaco-mock')).toBeInTheDocument();
  });

  it('switches language when language selector is changed', () => {
    render(<CodeSandbox />);

    const select = screen.getByLabelText('Select programming language');
    fireEvent.change(select, { target: { value: 'cpp' } });

    expect(select.value).toBe('cpp');
    expect(screen.getByText('DOCKER SANDBOX')).toBeInTheDocument();
  });

  it('runs Python via in-browser Pyodide worker without server roundtrip', async () => {
    runPython.mockResolvedValueOnce({
      stdout: 'Hello Pyodide\n',
      stderr: '',
      error: null,
      executionTimeMs: 15,
      status: 'OK',
    });

    render(<CodeSandbox initialLanguage="python" />);

    const runBtn = screen.getByLabelText('Run code');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(runPython).toHaveBeenCalledWith(
        expect.stringContaining('print("Hello, World!")'),
        ''
      );
    });

    expect(API.post).not.toHaveBeenCalled();
  });

  it('runs C++ via backend Docker sandbox endpoint', async () => {
    API.post.mockResolvedValueOnce({
      data: {
        success: true,
        language: 'cpp',
        total: 1,
        passed: 1,
        results: [
          {
            testCaseIndex: 0,
            stdin: '',
            expectedOutput: '',
            actualOutput: 'Hello, World!\n',
            status: 'PASSED',
            passed: true,
            executionTimeMs: 100,
            peakMemoryBytes: 4000000,
          },
        ],
      },
    });

    render(<CodeSandbox initialLanguage="cpp" />);

    const runBtn = screen.getByLabelText('Run code');
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(API.post).toHaveBeenCalledWith(
        '/code/execute',
        expect.objectContaining({
          language: 'cpp',
          code: expect.stringContaining('#include <iostream>'),
        }),
        expect.anything()
      );
    });
  });
});
