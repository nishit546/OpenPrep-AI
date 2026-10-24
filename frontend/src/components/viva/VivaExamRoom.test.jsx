import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import VivaExamRoom, { SILENCE_MS } from './VivaExamRoom';
import VivaScorecardModal from './VivaScorecardModal';
import VivaTopicPicker, { buildTopic } from './VivaTopicPicker';

let recognition;

class FakeRecognition {
  constructor() {
    recognition = this;
    this.stop = vi.fn(() => this.onend && this.onend());
  }
  start() {
    this.onstart && this.onstart();
  }
  say(text) {
    this.onresult({ resultIndex: 0, results: [[{ transcript: text }]] });
  }
}

describe('VivaExamRoom transcript flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.SpeechRecognition = FakeRecognition;
    window.speechSynthesis = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
    window.SpeechSynthesisUtterance = function () {};
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete window.SpeechRecognition;
  });

  const setup = () => {
    const onRespond = vi.fn();
    render(<VivaExamRoom turns={[{ speaker: 'AI', text: 'What is a process?' }]} nextQuestion="" onRespond={onRespond} onFinish={vi.fn()} />);
    return onRespond;
  };

  it('lets the student edit the transcript and submits the edit plus the raw speech', () => {
    const onRespond = setup();
    fireEvent.click(screen.getByLabelText('Toggle microphonic speech capture'));
    act(() => recognition.say('a process is a running programme'));

    const box = screen.getByLabelText(/Student response transcript/);
    expect(box.value).toBe('a process is a running programme');

    fireEvent.change(box, { target: { value: 'a process is a running program' } });
    fireEvent.click(screen.getByRole('button', { name: /respond/i }));

    expect(onRespond).toHaveBeenCalledWith('a process is a running program', 'a process is a running programme');
    expect(box.value).toBe('');
  });

  it('stops listening after the silence window but keeps the text for editing', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Toggle microphonic speech capture'));
    act(() => recognition.say('threads share memory'));

    act(() => vi.advanceTimersByTime(SILENCE_MS - 100));
    expect(recognition.stop).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(200));
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/Student response transcript/).value).toBe('threads share memory');
  });

  it('new speech restarts the silence window', () => {
    setup();
    fireEvent.click(screen.getByLabelText('Toggle microphonic speech capture'));
    act(() => recognition.say('threads'));
    act(() => vi.advanceTimersByTime(SILENCE_MS - 500));
    act(() => recognition.say('threads share memory'));
    act(() => vi.advanceTimersByTime(SILENCE_MS - 500));
    expect(recognition.stop).not.toHaveBeenCalled();
  });
});

describe('VivaTopicPicker', () => {
  it('combines subject and topic and starts the session', () => {
    const onStart = vi.fn();
    render(<VivaTopicPicker onStart={onStart} />);
    expect(screen.getByRole('button', { name: /start oral examination/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Operating Systems' }));
    fireEvent.change(screen.getByLabelText(/syllabus topic/i), { target: { value: 'CPU scheduling' } });
    fireEvent.click(screen.getByRole('button', { name: /start oral examination/i }));
    expect(onStart).toHaveBeenCalledWith('Operating Systems: CPU scheduling');
  });

  it('buildTopic handles partial input', () => {
    expect(buildTopic('Physics', '')).toBe('Physics');
    expect(buildTopic('', ' optics ')).toBe('optics');
  });
});

describe('VivaScorecardModal report card', () => {
  it('shows rubric, strengths, misconceptions and flashcards', () => {
    render(
      <VivaScorecardModal
        isOpen
        onClose={vi.fn()}
        onRestart={vi.fn()}
        scorecard={{
          score: 62,
          conceptualAccuracy: 70,
          depthOfExplanation: 40,
          keywordRelevance: 65,
          feedback: 'Work on why, not just what.',
          strengths: ['Clear definitions'],
          misconceptions: ['Threads copy the heap'],
          flashcards: [{ front: 'What do threads share?', back: 'Heap and globals' }],
        }}
      />
    );
    expect(screen.getByText('Depth of Explanation')).toBeInTheDocument();
    expect(screen.getByText('Clear definitions')).toBeInTheDocument();
    expect(screen.getByText('Threads copy the heap')).toBeInTheDocument();
    expect(screen.getByText('What do threads share?')).toBeInTheDocument();
  });

  it('still renders legacy five-field scorecards', () => {
    render(<VivaScorecardModal isOpen onClose={vi.fn()} onRestart={vi.fn()} scorecard={{ score: 75, conceptualDepth: 70, technicalAccuracy: 80 }} />);
    expect(screen.getByText('Technical Accuracy')).toBeInTheDocument();
    expect(screen.queryByText('Suggested Review Flashcards')).toBeNull();
  });
});
