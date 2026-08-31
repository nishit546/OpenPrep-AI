import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import synthInstance from '../../utils/BrainWaveAudioSynthesizer';
import { Volume2, VolumeX, Sparkles, Music, Waves } from 'lucide-react';

const BINAURAL_PRESETS = [
  { id: 'alpha', label: 'Alpha (10 Hz)', wave: 'Deep Focus', desc: 'Optimal for learning, retention & deep concentration' },
  { id: 'beta', label: 'Beta (18 Hz)', wave: 'High Alertness', desc: 'Boosts active problem solving & cognitive drive' },
  { id: 'theta', label: 'Theta (6 Hz)', wave: 'Memory Fix', desc: 'Promotes meditation, relaxation & memory consolidation' },
  { id: 'delta', label: 'Delta (2.5 Hz)', wave: 'Rest Recovery', desc: 'Restorative break recovery and stress release' },
];

const SOUNDSCAPE_PRESETS = [
  { id: 'brown', label: 'Brown Noise', icon: '🌊', desc: 'Deep soothing rain/ocean frequency' },
  { id: 'lofi', label: 'Lofi Chill Chords', icon: '🎵', desc: 'Procedural relaxing lofi harmonic progression' },
  { id: 'pink', label: 'Pink Noise', icon: '🍃', desc: 'Balanced natural leaf/breeze rustle' },
  { id: 'white', label: 'White Noise', icon: '🌬️', desc: 'Static focus background noise' },
  { id: 'none', label: 'Mute Soundscape', icon: '🔇', desc: 'No background ambient noise' },
];

const AmbientAudioPlayer = ({ isPlaying = false, className = '' }) => {
  const [activeTab, setActiveTab] = useState('binaural'); // 'binaural' | 'soundscape'
  const [selectedBinaural, setSelectedBinaural] = useState('alpha');
  const [selectedSoundscape, setSelectedSoundscape] = useState('brown');
  const [volume, setVolume] = useState(0.4);
  const [isAudioActive, setIsAudioActive] = useState(false);

  useEffect(() => {
    if (isPlaying && isAudioActive) {
      synthInstance.startBinaural(selectedBinaural, volume);
      synthInstance.startSoundscape(selectedSoundscape, volume);
    } else {
      synthInstance.stopAll();
    }
  }, [isPlaying, isAudioActive, selectedBinaural, selectedSoundscape]);

  useEffect(() => {
    synthInstance.setVolume(volume);
  }, [volume]);

  const toggleAudioActive = () => {
    const nextState = !isAudioActive;
    setIsAudioActive(nextState);
    if (!nextState) {
      synthInstance.stopAll();
    } else if (isPlaying) {
      synthInstance.startBinaural(selectedBinaural, volume);
      synthInstance.startSoundscape(selectedSoundscape, volume);
    }
  };

  return (
    <div className={`bg-neutral-900/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-4 space-y-4 ${className}`}>
      {/* Audio Header & Toggle */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h4 className="text-stone-200 font-extrabold text-xs">Brain-Wave &amp; Ambient Audio</h4>
        </div>
        <button
          onClick={toggleAudioActive}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            isAudioActive
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-neutral-800 text-stone-400 hover:text-stone-200'
          }`}
        >
          {isAudioActive ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-stone-500" />}
          <span>{isAudioActive ? 'Synth Active' : 'Audio Muted'}</span>
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-xl border border-neutral-800 text-xs">
        <button
          onClick={() => setActiveTab('binaural')}
          className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'binaural' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Waves className="w-3.5 h-3.5" />
          <span>Binaural Beats</span>
        </button>
        <button
          onClick={() => setActiveTab('soundscape')}
          className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'soundscape' ? 'bg-indigo-600 text-white shadow-md' : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Ambient Lo-Fi</span>
        </button>
      </div>

      {/* Preset Selectors */}
      {activeTab === 'binaural' ? (
        <div className="space-y-2">
          {BINAURAL_PRESETS.map((p) => {
            const isSelected = selectedBinaural === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedBinaural(p.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-amber-500/60 bg-amber-500/10 text-stone-100'
                    : 'border-neutral-800 bg-neutral-950/60 text-stone-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-300">{p.label}</span>
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono uppercase">{p.wave}</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">{p.desc}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {SOUNDSCAPE_PRESETS.map((s) => {
            const isSelected = selectedSoundscape === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSoundscape(s.id)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-stone-100'
                    : 'border-neutral-800 bg-neutral-950/60 text-stone-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
                  <span>{s.icon}</span>
                  <span>{s.label}</span>
                </div>
                <p className="text-[11px] text-stone-400 mt-0.5">{s.desc}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Master Volume Slider */}
      <div className="pt-2 border-t border-neutral-800 flex items-center gap-3">
        <Volume2 className="w-4 h-4 text-stone-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <span className="text-[10px] text-stone-400 font-mono w-8">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
};

AmbientAudioPlayer.propTypes = {
  isPlaying: PropTypes.bool,
  className: PropTypes.string,
};

export default AmbientAudioPlayer;
