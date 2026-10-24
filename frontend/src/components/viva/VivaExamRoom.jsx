import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaPaperPlane, FaVolumeUp, FaVolumeMute, FaGlobe } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';
import ExaminerAvatar from './ExaminerAvatar';

/** Milliseconds of silence after the last recognition result before listening stops. */
export const SILENCE_MS = 2000;

export default function VivaExamRoom({
  turns = [],
  nextQuestion = '',
  onRespond,
  onFinish,
  loading = false,
}) {
  const [inputText, setInputText] = useState('');
  const [rawTranscript, setRawTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('idle'); // 'idle', 'speaking', 'listening'
  const [voiceRate, setVoiceRate] = useState(1.0);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);

  const clearSilenceTimer = () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Stop listening on unmount
  useEffect(
    () => () => {
      clearSilenceTimer();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* already stopped */
      }
    },
    []
  );

  // Load available voices for SpeechSynthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter English voices
        const enVoices = voices.filter(v => v.lang.startsWith('en'));
        setAvailableVoices(enVoices);
        if (enVoices.length > 0 && !selectedVoiceName) {
          const defaultVoice = enVoices.find(v => v.name.includes('Google') || v.name.includes('Natural')) || enVoices[0];
          setSelectedVoiceName(defaultVoice.name);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [selectedVoiceName]);

  // Read out loud the examiner's question using SpeechSynthesis
  useEffect(() => {
    if (!nextQuestion || isMuted) return;

    setSpeechStatus('speaking');
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(nextQuestion);
      utterance.rate = voiceRate;
      
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => setSpeechStatus('speaking');
      utterance.onend = () => setSpeechStatus('idle');
      utterance.onerror = () => setSpeechStatus('idle');
      
      window.speechSynthesis.speak(utterance);
    }

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [nextQuestion, selectedVoiceName, voiceRate, isMuted, availableVoices]);

  // Scroll to bottom on updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns]);

  // Real-time Speech-to-text input (Web Speech API)
  const handleStartSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your current browser. Please type your answer.');
      return;
    }

    if (isRecording) {
      clearSilenceTimer();
      try {
        recognitionRef.current?.stop();
      } catch {
        /* already stopped */
      }
      setIsRecording(false);
      setSpeechStatus('idle');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    // End-of-speech detection: no new result for SILENCE_MS means the answer is finished.
    const armSilenceTimer = () => {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
      }, SILENCE_MS);
    };

    recognition.onstart = () => {
      setIsRecording(true);
      setSpeechStatus('listening');
      armSilenceTimer();
    };

    recognition.onresult = (event) => {
      let liveText = '';
      for (let i = 0; i < event.results.length; i++) {
        liveText += event.results[i][0].transcript;
      }
      liveText = liveText.trim();
      setInputText(liveText);
      setRawTranscript(liveText);
      armSilenceTimer();
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      clearSilenceTimer();
      setIsRecording(false);
      setSpeechStatus('idle');
    };

    recognition.onend = () => {
      clearSilenceTimer();
      setIsRecording(false);
      setSpeechStatus('idle');
    };

    recognition.start();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;
    // Second argument is the unedited speech transcript, so the server can record that the student corrected it.
    onRespond(inputText.trim(), rawTranscript);
    setInputText('');
    setRawTranscript('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-2xl">
      
      {/* Left Panel: Avatar, Waveform & Voice Controls */}
      <div className="md:col-span-1 flex flex-col items-center justify-center space-y-6">
        <ExaminerAvatar status={speechStatus} />

        {/* Waveform indicator */}
        {speechStatus === 'listening' && (
          <div className="flex items-center justify-center gap-1.5 h-8 bg-stone-950/40 px-4 py-2 rounded-2xl border border-emerald-500/10 w-full max-w-sm">
            <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-2" style={{ animationDuration: '0.4s' }} />
            <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-4" style={{ animationDelay: '100ms', animationDuration: '0.6s' }} />
            <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-6" style={{ animationDelay: '200ms', animationDuration: '0.5s' }} />
            <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-3" style={{ animationDelay: '300ms', animationDuration: '0.7s' }} />
            <span className="w-1.5 bg-emerald-500 rounded-full animate-bounce h-1" style={{ animationDelay: '400ms', animationDuration: '0.3s' }} />
            <span className="text-[10px] font-bold text-emerald-400 ml-2 tracking-wider">LISTENING...</span>
          </div>
        )}

        {/* Voice Customization Settings */}
        <div className="bg-stone-950/20 border border-neutral-850 p-4 rounded-2xl w-full max-w-sm space-y-4">
          <h5 className="text-[10px] font-black text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
            <FaGlobe className="text-indigo-400" /> Speech & Accent Settings
          </h5>
          
          <div className="space-y-3 text-xs text-stone-300">
            {/* Accent Dropdown */}
            {availableVoices.length > 0 && (
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">Accent / voice</label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-stone-950 border border-neutral-800 rounded-lg px-2 py-1.5 outline-none text-stone-300 text-[11px]"
                >
                  {availableVoices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name.replace('Microsoft', '').replace('Google', '').trim()} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Speed slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-bold text-stone-500 uppercase tracking-wider">
                <span>Pacing / rate</span>
                <span>{voiceRate}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={voiceRate}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 bg-stone-950 rounded-lg appearance-none h-1"
              />
            </div>

            {/* Mute Toggle */}
            <button
              onClick={() => {
                if (!isMuted) {
                  window.speechSynthesis.cancel();
                  setSpeechStatus('idle');
                }
                setIsMuted(!isMuted);
              }}
              className="flex items-center gap-2 text-[10px] font-bold hover:text-white transition cursor-pointer select-none"
            >
              {isMuted ? (
                <>
                  <FaVolumeMute className="text-rose-500 text-sm" />
                  <span>UNMUTE EXAMINER READOUT</span>
                </>
              ) : (
                <>
                  <FaVolumeUp className="text-indigo-400 text-sm" />
                  <span>MUTE EXAMINER READOUT</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel: Conversation Transcript & Canvas */}
      <div className="md:col-span-2 flex flex-col h-[520px] bg-stone-950/20 rounded-3xl border border-neutral-850 p-4 relative overflow-hidden">
        
        {/* Dialogue Thread */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-thin">
          {turns.map((turn, index) => (
            <div
              key={index}
              className={`flex flex-col space-y-1 ${
                turn.speaker === 'AI' ? 'items-start' : 'items-end'
              }`}
            >
              <span className="text-[9px] font-black text-stone-500 uppercase tracking-widest px-2">
                {turn.speaker === 'AI' ? 'Examiner' : 'Student'}
                {turn.speaker === 'AI' && turn.mode === 'hint' && (
                  <span className="ml-2 text-amber-400">Guiding question</span>
                )}
                {turn.speaker === 'AI' && turn.depth ? (
                  <span className="ml-2 text-indigo-400">Depth {turn.depth}/5</span>
                ) : null}
              </span>
              <div
                className={`max-w-md px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${
                  turn.speaker === 'AI'
                    ? 'bg-neutral-800/80 border border-neutral-750 text-stone-200 rounded-tl-none'
                    : 'bg-indigo-600 text-white rounded-tr-none'
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}

          <div ref={chatEndRef} />
        </div>

        {/* Real-time transcribed text canvas / controls */}
        <form onSubmit={handleSubmit} className="border-t border-neutral-850 pt-4 flex gap-2.5 items-center">
          <button
            type="button"
            onClick={handleStartSpeech}
            disabled={loading}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              isRecording
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 animate-pulse'
                : 'bg-neutral-850 hover:bg-neutral-800 border-neutral-750 text-stone-400 hover:text-stone-200'
            }`}
            title="Toggle microphonic speech capture"
            aria-label="Toggle microphonic speech capture"
          >
            <FaMicrophone />
          </button>
          
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            rows={2}
            placeholder={
              isRecording
                ? 'Listening live. Stops after a pause; you can edit before sending...'
                : 'Speak or type your answer. Fix any mis-heard words before sending.'
            }
            className="flex-1 resize-none bg-stone-950/60 border border-neutral-850 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-stone-200 outline-none transition"
            aria-label="Student response transcript (editable)"
          />

          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg hover:shadow-indigo-500/10 cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <FaPaperPlane />
                <span>Respond</span>
              </>
            )}
          </button>
        </form>

        {/* Finishing controls */}
        {turns.length >= 3 && (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onFinish}
              disabled={loading}
              className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-xs font-bold rounded-xl text-stone-300 hover:text-white transition cursor-pointer border border-neutral-750"
            >
              Finish & Evaluate Session
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
