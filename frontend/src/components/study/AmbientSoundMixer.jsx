import { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Volume2, VolumeX, Pause, Play } from 'lucide-react';

const STORAGE_KEY = 'openprep_ambient_mix';

const TRACKS = [
  {
    id: 'rain',
    label: 'Rain',
    icon: '🌧️',
    type: 'audio',
    src: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3',
  },
  {
    id: 'binaural',
    label: 'Binaural Beats',
    icon: '🎧',
    type: 'webaudio',
  },
  {
    id: 'whiteNoise',
    label: 'White Noise',
    icon: '🌫️',
    type: 'webaudio',
  },
  {
    id: 'coffee',
    label: 'Coffee Shop',
    icon: '☕',
    type: 'audio',
    src: 'https://cdn.pixabay.com/download/audio/2021/08/09/audio_dc39b4b0eb.mp3',
  },
];

const defaultMix = () => ({
  rain: { enabled: false, volume: 0.5 },
  binaural: { enabled: false, volume: 0.4 },
  whiteNoise: { enabled: false, volume: 0.3 },
  coffee: { enabled: false, volume: 0.5 },
  masterPaused: false,
});

const loadMix = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMix();
    const parsed = JSON.parse(raw);
    const base = defaultMix();
    Object.keys(base).forEach((k) => {
      if (parsed[k]) base[k] = { ...base[k], ...parsed[k] };
    });
    if (typeof parsed.masterPaused === 'boolean') base.masterPaused = parsed.masterPaused;
    return base;
  } catch {
    return defaultMix();
  }
};

/**
 * AmbientSoundMixer — Web Audio API + looped audio mixer
 * Concurrent tracks with independent volume sliders and global master pause.
 */
const AmbientSoundMixer = ({ className = '' }) => {
  const [mix, setMix] = useState(() => loadMix());
  const [isAudioReady, setIsAudioReady] = useState(false);

  const audioContextRef = useRef(null);
  const gainNodesRef = useRef({});
  const sourcesRef = useRef({});
  const audioElementsRef = useRef({});

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mix));
    } catch (_e) {
      /* ignore storage errors */
    }
  }, [mix]);

  // Master pause on tab hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        Object.values(audioElementsRef.current).forEach((el) => el?.pause());
        if (audioContextRef.current?.state === 'running') audioContextRef.current.suspend();
      } else if (!mix.masterPaused) {
        Object.entries(audioElementsRef.current).forEach(([id, el]) => {
          if (mix[id]?.enabled) el?.play().catch(() => {});
        });
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [mix]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(sourcesRef.current).forEach((src) => {
        try {
          src.stop?.();
          src.disconnect?.();
        } catch (_e) { /* ignore */ }
      });
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (_e) { /* ignore */ }
      }
      Object.values(audioElementsRef.current).forEach((el) => el?.pause());
    };
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioContextRef.current = new Ctx();
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    setIsAudioReady(true);
    return audioContextRef.current;
  }, []);

  const createWhiteNoise = useCallback((ctx, gainNode) => {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gainNode);
    source.start();
    return source;
  }, []);

  const createBinaural = useCallback((ctx, gainNode) => {
    const oscLeft = ctx.createOscillator();
    const oscRight = ctx.createOscillator();
    const merger = ctx.createChannelMerger(2);
    const pannerLeft = ctx.createGain();
    const pannerRight = ctx.createGain();

    oscLeft.frequency.value = 200;
    oscRight.frequency.value = 206; // 6Hz beat
    oscLeft.type = 'sine';
    oscRight.type = 'sine';

    oscLeft.connect(pannerLeft);
    oscRight.connect(pannerRight);
    pannerLeft.connect(merger, 0, 0);
    pannerRight.connect(merger, 0, 1);
    merger.connect(gainNode);

    oscLeft.start();
    oscRight.start();

    return {
      stop: () => {
        try {
          oscLeft.stop();
          oscRight.stop();
        } catch (_e) { /* ignore */ }
      },
      disconnect: () => {
        try {
          oscLeft.disconnect();
          oscRight.disconnect();
          merger.disconnect();
        } catch (_e) { /* ignore */ }
      },
    };
  }, []);

  const toggleTrack = useCallback(
    (id) => {
      setMix((prev) => {
        const nextEnabled = !prev[id].enabled;
        const next = { ...prev, [id]: { ...prev[id], enabled: nextEnabled } };

        // Side-effects for audio
        const track = TRACKS.find((t) => t.id === id);
        if (track?.type === 'audio') {
          const el = audioElementsRef.current[id];
          if (el) {
            if (nextEnabled && !next.masterPaused) el.play().catch(() => {});
            else el.pause();
          }
        } else if (track?.type === 'webaudio') {
          const ctx = ensureAudioContext();
          if (!ctx) return next;
          if (nextEnabled && !next.masterPaused) {
            const gain = ctx.createGain();
            gain.gain.value = next[id].volume;
            gain.connect(ctx.destination);
            gainNodesRef.current[id] = gain;
            let src;
            if (id === 'whiteNoise') src = createWhiteNoise(ctx, gain);
            if (id === 'binaural') src = createBinaural(ctx, gain);
            if (src) sourcesRef.current[id] = src;
          } else {
            const src = sourcesRef.current[id];
            if (src) {
              try {
                src.stop?.();
                src.disconnect?.();
              } catch (_e) { /* ignore */ }
              delete sourcesRef.current[id];
            }
            const gain = gainNodesRef.current[id];
            if (gain) {
              try {
                gain.disconnect();
              } catch (_e) { /* ignore */ }
              delete gainNodesRef.current[id];
            }
          }
        }
        return next;
      });
    },
    [ensureAudioContext, createWhiteNoise, createBinaural]
  );

  const updateVolume = useCallback((id, value) => {
    const vol = Math.max(0, Math.min(1, value));
    setMix((prev) => ({ ...prev, [id]: { ...prev[id], volume: vol } }));
    const el = audioElementsRef.current[id];
    if (el) el.volume = vol;
    const gain = gainNodesRef.current[id];
    if (gain) gain.gain.value = vol;
  }, []);

  const toggleMasterPause = useCallback(() => {
    setMix((prev) => {
      const nextPaused = !prev.masterPaused;
      if (nextPaused) {
        Object.values(audioElementsRef.current).forEach((el) => el?.pause());
        Object.values(sourcesRef.current).forEach((src) => {
          try {
            src.stop?.();
          } catch (_e) { /* ignore */ }
        });
        // keep gain nodes for resume: suspend context
        if (audioContextRef.current?.state === 'running') audioContextRef.current.suspend();
      } else {
        // resume
        if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume();
        // For webaudio tracks, need to recreate sources if they were stopped
        TRACKS.forEach((t) => {
          if (t.type === 'webaudio' && prev[t.id]?.enabled) {
            const ctx = ensureAudioContext();
            if (!ctx) return;
            const gain = ctx.createGain();
            gain.gain.value = prev[t.id].volume;
            gain.connect(ctx.destination);
            gainNodesRef.current[t.id] = gain;
            let src;
            if (t.id === 'whiteNoise') src = createWhiteNoise(ctx, gain);
            if (t.id === 'binaural') src = createBinaural(ctx, gain);
            if (src) sourcesRef.current[t.id] = src;
          }
          if (t.type === 'audio' && prev[t.id]?.enabled) {
            audioElementsRef.current[t.id]?.play().catch(() => {});
          }
        });
      }
      return { ...prev, masterPaused: nextPaused };
    });
  }, [ensureAudioContext, createWhiteNoise, createBinaural]);

  const anyEnabled = TRACKS.some((t) => mix[t.id]?.enabled);

  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900">Ambient Mixer</h4>
          <p className="text-xs text-neutral-500">Mix sounds for deep focus</p>
        </div>
        <button
          type="button"
          onClick={toggleMasterPause}
          aria-label={mix.masterPaused ? 'Resume all sounds' : 'Pause all sounds'}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
            mix.masterPaused
              ? 'bg-neutral-900 text-white hover:bg-neutral-800'
              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          }`}
        >
          {mix.masterPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          {mix.masterPaused ? 'Resume' : 'Pause all'}
        </button>
      </div>

      <div className="space-y-3">
        {TRACKS.map((track) => {
          const state = mix[track.id] || { enabled: false, volume: 0.5 };
          return (
            <div key={track.id} className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
              <span className="text-base">{track.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-800">{track.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={state.enabled}
                    aria-label={`Toggle ${track.label}`}
                    onClick={() => toggleTrack(track.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      state.enabled ? 'bg-amber-500' : 'bg-neutral-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                        state.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <VolumeX className="h-3 w-3 text-neutral-400" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={state.volume}
                    onChange={(e) => updateVolume(track.id, parseFloat(e.target.value))}
                    aria-label={`${track.label} volume`}
                    className="h-1 flex-1 appearance-none rounded-lg bg-neutral-200 accent-amber-500"
                  />
                  <Volume2 className="h-3 w-3 text-neutral-400" />
                  <span className="w-8 text-right text-xs tabular-nums text-neutral-600">
                    {Math.round(state.volume * 100)}%
                  </span>
                </div>
              </div>
              {track.type === 'audio' && (
                <audio
                  ref={(el) => {
                    audioElementsRef.current[track.id] = el;
                    if (el) el.volume = state.volume;
                  }}
                  src={track.src}
                  loop
                  preload="none"
                />
              )}
            </div>
          );
        })}
      </div>

      {!isAudioReady && anyEnabled && (
        <p className="mt-2 text-xs text-amber-600">Tap anywhere to enable audio (browser policy).</p>
      )}

      <p aria-live="polite" className="sr-only">
        {mix.masterPaused ? 'All sounds paused' : anyEnabled ? 'Ambient sounds playing' : 'No ambient sounds'}
      </p>
    </div>
  );
};

AmbientSoundMixer.propTypes = {
  className: PropTypes.string,
};

export default AmbientSoundMixer;
export { TRACKS };
