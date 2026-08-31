/**
 * @fileoverview Web Audio API Brain-Wave Binaural Beats & Procedural Ambient Soundscape Synthesizer.
 * Generates real-time stereo binaural frequencies (Alpha 10Hz, Beta 18Hz, Theta 6Hz, Delta 2.5Hz)
 * and procedural ambient soundscapes (Brown Noise, White Noise, Pink Noise, Lofi Chords).
 */

class BrainWaveAudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.leftOsc = null;
    this.rightOsc = null;
    this.merger = null;
    this.binauralGain = null;
    this.noiseNode = null;
    this.noiseGain = null;
    this.filterNode = null;
    this.lofiTimer = null;

    this.isPlaying = false;
    this.activePreset = 'alpha';
    this.activeSoundscape = 'none';
    this.volume = 0.3;
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Starts binaural beat audio synthesis for a frequency preset.
   * @param {string} preset - 'alpha' | 'beta' | 'theta' | 'delta'
   * @param {number} masterVolume - 0.0 to 1.0
   */
  startBinaural(preset = 'alpha', masterVolume = 0.3) {
    this.initContext();
    if (!this.audioCtx) return;

    this.stopBinaural();
    this.activePreset = preset;
    this.volume = masterVolume;

    let baseFreq = 200;
    let offset = 10; // Default Alpha

    if (preset === 'beta') {
      baseFreq = 220;
      offset = 18; // Beta 18Hz
    } else if (preset === 'theta') {
      baseFreq = 180;
      offset = 6; // Theta 6Hz
    } else if (preset === 'delta') {
      baseFreq = 150;
      offset = 2.5; // Delta 2.5Hz
    }

    const leftFreq = baseFreq;
    const rightFreq = baseFreq + offset;

    // Create Left & Right Oscillators
    this.leftOsc = this.audioCtx.createOscillator();
    this.rightOsc = this.audioCtx.createOscillator();

    this.leftOsc.type = 'sine';
    this.rightOsc.type = 'sine';

    this.leftOsc.frequency.setValueAtTime(leftFreq, this.audioCtx.currentTime);
    this.rightOsc.frequency.setValueAtTime(rightFreq, this.audioCtx.currentTime);

    // Channel Merger for Stereo Binaural Separation (Left = Ch 0, Right = Ch 1)
    this.merger = this.audioCtx.createChannelMerger(2);
    this.binauralGain = this.audioCtx.createGain();
    this.binauralGain.gain.setValueAtTime(this.volume * 0.4, this.audioCtx.currentTime);

    this.leftOsc.connect(this.merger, 0, 0);
    this.rightOsc.connect(this.merger, 0, 1);

    this.merger.connect(this.binauralGain);
    this.binauralGain.connect(this.audioCtx.destination);

    this.leftOsc.start();
    this.rightOsc.start();
    this.isPlaying = true;
  }

  /**
   * Stops binaural beat synthesis.
   */
  stopBinaural() {
    if (this.leftOsc) {
      try { this.leftOsc.stop(); } catch (e) {}
      this.leftOsc.disconnect();
      this.leftOsc = null;
    }
    if (this.rightOsc) {
      try { this.rightOsc.stop(); } catch (e) {}
      this.rightOsc.disconnect();
      this.rightOsc = null;
    }
    if (this.binauralGain) {
      this.binauralGain.disconnect();
      this.binauralGain = null;
    }
  }

  /**
   * Starts procedural ambient noise soundscape (white, brown, pink, lofi).
   */
  startSoundscape(type = 'brown', masterVolume = 0.3) {
    this.initContext();
    if (!this.audioCtx) return;

    this.stopSoundscape();
    this.activeSoundscape = type;

    if (type === 'none') return;

    if (type === 'lofi') {
      this.startLofiSynth(masterVolume);
      return;
    }

    // Generate 5-second noise buffer
    const bufferSize = this.audioCtx.sampleRate * 5;
    const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;

      if (type === 'brown') {
        // Brown noise filter (integrating white noise)
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      } else if (type === 'pink') {
        // Pink noise approximation
        lastOut = lastOut * 0.95 + white * 0.05;
        data[i] = lastOut * 2.0;
      } else {
        // White noise
        data[i] = white * 0.2;
      }
    }

    this.noiseNode = this.audioCtx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    // Filter to smooth high frequencies
    this.filterNode = this.audioCtx.createBiquadFilter();
    this.filterNode.type = type === 'brown' ? 'lowpass' : 'bandpass';
    this.filterNode.frequency.setValueAtTime(type === 'brown' ? 400 : 800, this.audioCtx.currentTime);

    this.noiseGain = this.audioCtx.createGain();
    this.noiseGain.gain.setValueAtTime(masterVolume * 0.3, this.audioCtx.currentTime);

    this.noiseNode.connect(this.filterNode);
    this.filterNode.connect(this.noiseGain);
    this.noiseGain.connect(this.audioCtx.destination);

    this.noiseNode.start();
  }

  /**
   * Generates procedural Lo-Fi ambient chord synthesizer.
   */
  startLofiSynth(masterVolume = 0.3) {
    if (!this.audioCtx) return;

    const chords = [
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [220.0, 261.63, 329.63, 392.0],  // Am7
      [174.61, 220.0, 261.63, 329.63], // Fmaj7
      [196.0, 246.94, 293.66, 349.23], // G7
    ];

    let chordIdx = 0;

    const playChord = () => {
      if (this.activeSoundscape !== 'lofi' || !this.audioCtx) return;

      const chord = chords[chordIdx % chords.length];
      chordIdx++;

      chord.forEach((freq) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(0.001, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(masterVolume * 0.08, this.audioCtx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 2.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(this.audioCtx.currentTime);
        osc.stop(this.audioCtx.currentTime + 3.0);
      });

      this.lofiTimer = setTimeout(playChord, 3200);
    };

    playChord();
  }

  stopSoundscape() {
    if (this.noiseNode) {
      try { this.noiseNode.stop(); } catch (e) {}
      this.noiseNode.disconnect();
      this.noiseNode = null;
    }
    if (this.noiseGain) {
      this.noiseGain.disconnect();
      this.noiseGain = null;
    }
    if (this.lofiTimer) {
      clearTimeout(this.lofiTimer);
      this.lofiTimer = null;
    }
  }

  setVolume(vol) {
    this.volume = vol;
    if (this.binauralGain && this.audioCtx) {
      this.binauralGain.gain.setValueAtTime(vol * 0.4, this.audioCtx.currentTime);
    }
    if (this.noiseGain && this.audioCtx) {
      this.noiseGain.gain.setValueAtTime(vol * 0.3, this.audioCtx.currentTime);
    }
  }

  stopAll() {
    this.stopBinaural();
    this.stopSoundscape();
    this.isPlaying = false;
  }
}

const synthInstance = new BrainWaveAudioSynthesizer();
export default synthInstance;
