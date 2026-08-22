import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import PomodoroVoiceCoach from './PomodoroVoiceCoach';

// Mock speechSynthesis
const mockSpeak = vi.fn();
const mockCancel = vi.fn();
const mockGetVoices = vi.fn(() => [
  { voiceURI: 'test-voice-1', name: 'Test Voice', lang: 'en-US' },
  { voiceURI: 'test-voice-2', name: 'Hindi Voice', lang: 'hi-IN' },
]);

beforeEach(() => {
  localStorage.clear();
  mockSpeak.mockClear();
  mockCancel.mockClear();
  mockGetVoices.mockClear();
  mockGetVoices.mockReturnValue([
    { voiceURI: 'test-voice-1', name: 'Test Voice', lang: 'en-US' },
  ]);
  global.SpeechSynthesisUtterance = function (text) {
    this.text = text;
    this.voice = null;
    this.rate = 1;
    this.volume = 1;
  };
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak: mockSpeak, cancel: mockCancel, getVoices: mockGetVoices, onvoiceschanged: null },
    writable: true,
    configurable: true,
  });
});

describe('PomodoroVoiceCoach', () => {
  it('renders voice coach header', () => {
    render(<PomodoroVoiceCoach />);
    expect(screen.getByText('Voice Coach')).toBeInTheDocument();
  });

  it('toggles voice coach enabled state and persists', () => {
    render(<PomodoroVoiceCoach />);
    const toggle = screen.getByLabelText('Toggle voice coach');
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(localStorage.getItem('openprep_voice_coach_enabled')).toBe('false');
    fireEvent.click(toggle);
    expect(localStorage.getItem('openprep_voice_coach_enabled')).toBe('true');
  });

  it('persists voice selection in localStorage', () => {
    mockGetVoices.mockReturnValue([
      { voiceURI: 'v1', name: 'Voice 1', lang: 'en-US' },
      { voiceURI: 'v2', name: 'Voice 2', lang: 'en-GB' },
    ]);
    render(<PomodoroVoiceCoach />);
    // Trigger voices load
    act(() => {
      if (window.speechSynthesis.onvoiceschanged) window.speechSynthesis.onvoiceschanged();
    });
    const select = screen.getByLabelText('Voice accent');
    fireEvent.change(select, { target: { value: 'v2' } });
    expect(localStorage.getItem('openprep_voice_coach_voice')).toBe('v2');
  });

  it('speak is called on announcement prop', async () => {
    const { rerender } = render(<PomodoroVoiceCoach announcement="" />);
    rerender(<PomodoroVoiceCoach announcement="Great focus session! Take a 5-minute stretch" />);
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('persists rate in localStorage', () => {
    render(<PomodoroVoiceCoach />);
    const slider = screen.getByLabelText('Voice speed');
    fireEvent.change(slider, { target: { value: '1.5' } });
    expect(localStorage.getItem('openprep_voice_coach_rate')).toBe('1.5');
  });
});
