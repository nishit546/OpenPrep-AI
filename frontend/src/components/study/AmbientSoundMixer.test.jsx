import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import AmbientSoundMixer from './AmbientSoundMixer';

beforeEach(() => {
  localStorage.clear();
  // Mock HTMLMediaElement play/pause for jsdom
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
  // Mock AudioContext
  global.AudioContext = vi.fn().mockImplementation(() => ({
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn(), disconnect: vi.fn() }),
    createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
    createBufferSource: () => ({ buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }),
    createOscillator: () => ({ frequency: { value: 0 }, type: '', connect: vi.fn(), start: vi.fn(), stop: vi.fn(), disconnect: vi.fn() }),
    createChannelMerger: () => ({ connect: vi.fn(), disconnect: vi.fn() }),
    destination: {},
    state: 'running',
    suspend: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
    sampleRate: 44100,
  }));
  global.webkitAudioContext = global.AudioContext;
});

describe('AmbientSoundMixer', () => {
  it('renders mixer header', () => {
    render(<AmbientSoundMixer />);
    expect(screen.getByText('Ambient Mixer')).toBeInTheDocument();
  });

  it('renders all tracks with volume sliders', () => {
    render(<AmbientSoundMixer />);
    expect(screen.getByLabelText('Rain volume')).toBeInTheDocument();
    expect(screen.getByLabelText('Binaural Beats volume')).toBeInTheDocument();
    expect(screen.getByLabelText('White Noise volume')).toBeInTheDocument();
    expect(screen.getByLabelText('Coffee Shop volume')).toBeInTheDocument();
  });

  it('toggles track enabled state', () => {
    render(<AmbientSoundMixer />);
    const toggle = screen.getByLabelText('Toggle Rain');
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
  });

  it('updates volume and persists to localStorage', () => {
    render(<AmbientSoundMixer />);
    const slider = screen.getByLabelText('Rain volume');
    fireEvent.change(slider, { target: { value: '0.8' } });
    const saved = JSON.parse(localStorage.getItem('openprep_ambient_mix'));
    expect(saved.rain.volume).toBe(0.8);
  });

  it('master pause toggles all sounds', () => {
    render(<AmbientSoundMixer />);
    const master = screen.getByLabelText('Pause all sounds');
    fireEvent.click(master);
    expect(screen.getByLabelText('Resume all sounds')).toBeInTheDocument();
    const saved = JSON.parse(localStorage.getItem('openprep_ambient_mix'));
    expect(saved.masterPaused).toBe(true);
  });

  it('volume shows percentage', () => {
    render(<AmbientSoundMixer />);
    expect(screen.getAllByText('50%').length).toBeGreaterThan(0);
  });
});
