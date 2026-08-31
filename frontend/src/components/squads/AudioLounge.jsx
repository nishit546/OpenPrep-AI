import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Mic, MicOff, Volume2, VolumeX, PhoneOff, 
  Settings, Users, Radio, Info 
} from 'lucide-react';
import WebRTCClient from '../../services/webrtcClient';
import { ensureValidToken } from '../../services/passkeyClient';

export default function AudioLounge({ squadId }) {
  const [inLounge, setInLounge] = useState(false);
  const [roster, setRoster] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isPTTEnabled, setIsPTTEnabled] = useState(false);
  
  // Audio devices states
  const [inputDevices, setInputDevices] = useState([]);
  const [outputDevices, setOutputDevices] = useState([]);
  const [selectedInput, setSelectedInput] = useState('default');
  const [selectedOutput, setSelectedOutput] = useState('default');
  const [showSettings, setShowSettings] = useState(false);
  
  // Errors and limits
  const [errorMsg, setErrorMsg] = useState('');
  
  const socketRef = useRef(null);
  const clientRef = useRef(null);
  const pttKeyDownRef = useRef(false);

  // Load hardware media devices
  const loadAudioDevices = async () => {
    try {
      // Trigger media permissions first so device labels are visible
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      
      setInputDevices(inputs);
      setOutputDevices(outputs);
    } catch (e) {
      console.warn('[AudioLounge] Failed to list audio devices:', e);
    }
  };

  useEffect(() => {
    loadAudioDevices();
    navigator.mediaDevices.ondevicechange = loadAudioDevices;
    
    return () => {
      navigator.mediaDevices.ondevicechange = null;
      if (clientRef.current) {
        clientRef.current.leaveLounge();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // WebRTC client lifecycle management
  const joinAudioLounge = async () => {
    try {
      setErrorMsg('');
      
      // Ensure token is valid/renewed BEFORE connecting to prevent 401
      await ensureValidToken();
      
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
      
      const socket = io(apiUrl, {
        auth: { token }
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        const client = new WebRTCClient({
          squadId,
          socket,
          onRosterUpdate: (newRoster) => setRoster(newRoster),
          onSpeakerHighlight: (socketId, speaking) => {
            // Local reaction trigger if needed
          },
          onAudioFull: (data) => {
            setErrorMsg(data.message || 'Lounge is full.');
            leaveAudioLounge();
          }
        });

        // Apply pre-configured input/output selections
        client.inputDeviceId = selectedInput;
        client.outputDeviceId = selectedOutput;
        client.isMuted = isMuted;
        client.isDeafened = isDeafened;

        clientRef.current = client;
        client.joinLounge().then(() => {
          setInLounge(true);
        }).catch(err => {
          setErrorMsg('Failed to open microphone. Check permissions.');
          leaveAudioLounge();
        });
      });

      socket.on('connect_error', () => {
        setErrorMsg('Signaling server connection error.');
      });

    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to join audio session.');
    }
  };

  const leaveAudioLounge = () => {
    if (clientRef.current) {
      clientRef.current.leaveLounge();
      clientRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setInLounge(false);
    setRoster([]);
  };

  // Mute/Deafen toggles
  const handleToggleMute = (state) => {
    setIsMuted(state);
    if (clientRef.current) {
      clientRef.current.toggleMute(state);
    }
  };

  const handleToggleDeafen = (state) => {
    setIsDeafened(state);
    if (clientRef.current) {
      clientRef.current.toggleDeafen(state);
    }
    // Deafen auto-mutes the mic in typical user patterns (Discord, Zoom)
    if (state) {
      setIsMuted(true);
    }
  };

  // Push-to-Talk keyboard handlers
  useEffect(() => {
    if (!isPTTEnabled || !inLounge) return;

    // Force mute initially when enabling PTT
    handleMutePTT(true);

    const handleKeyDown = (e) => {
      // Trigger PTT on Spacebar when not inside an input box
      if (e.code === 'Space' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        if (!pttKeyDownRef.current) {
          pttKeyDownRef.current = true;
          handleMutePTT(false); // Unmute while holding
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        pttKeyDownRef.current = false;
        handleMutePTT(true); // Mute when released
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPTTEnabled, inLounge]);

  const handleMutePTT = (muteState) => {
    setIsMuted(muteState);
    if (clientRef.current) {
      clientRef.current.toggleMute(muteState);
    }
  };

  // Device selectors changes
  const handleInputChange = (e) => {
    const devId = e.target.value;
    setSelectedInput(devId);
    if (clientRef.current) {
      clientRef.current.changeInputDevice(devId);
    }
  };

  const handleOutputChange = (e) => {
    const devId = e.target.value;
    setSelectedOutput(devId);
    if (clientRef.current) {
      clientRef.current.changeOutputDevice(devId);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 max-w-4xl mx-auto bg-slate-900 border border-slate-750 p-4 rounded-2xl shadow-2xl transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Side: Active Status & Join Actions */}
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${inLounge ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
            <Radio className={`w-5 h-5 ${inLounge ? 'animate-pulse' : ''}`} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
              Squad Audio Lounge
              {inLounge && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  CONNECTED
                </span>
              )}
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              {inLounge 
                ? `${roster.length + 1} participant(s) online` 
                : 'Join voice channel to study with your squad.'
              }
            </p>
          </div>
        </div>

        {/* Center Side: Active Speaker avatars roster */}
        {inLounge && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {/* Show local participant */}
            <div className="relative group shrink-0">
              <div className={`w-9 h-9 rounded-full bg-slate-800 border-2 transition-all duration-300 flex items-center justify-center ${
                !isMuted && clientRef.current?.isSpeaking 
                  ? 'border-emerald-400 shadow-md shadow-emerald-400/20 scale-105' 
                  : 'border-slate-700'
              }`}>
                <span className="text-xs font-black text-slate-300">ME</span>
                {isMuted && (
                  <span className="absolute -bottom-1 -right-1 bg-red-500 p-0.5 rounded-full text-white border border-slate-900">
                    <MicOff className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <span className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950 text-[10px] font-bold text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                You (Local)
              </span>
            </div>

            {/* Remote participants list */}
            {roster.map((peer) => (
              <div key={peer.socketId} className="relative group shrink-0">
                <div className={`w-9 h-9 rounded-full bg-indigo-900 border-2 transition-all duration-300 flex items-center justify-center ${
                  peer.speaking && !peer.muted
                    ? 'border-emerald-400 shadow-md shadow-emerald-400/20 scale-105 animate-pulse'
                    : 'border-slate-700'
                }`}>
                  {peer.avatar ? (
                    <img src={peer.avatar} alt={peer.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-black text-indigo-200">
                      {peer.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  {peer.muted && (
                    <span className="absolute -bottom-1 -right-1 bg-red-500 p-0.5 rounded-full text-white border border-slate-900">
                      <MicOff className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <span className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950 text-[10px] font-bold text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
                  {peer.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Right Side: Lounge Control Actions */}
        <div className="flex items-center gap-3">
          {errorMsg && (
            <div className="flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-xl text-[10px] font-bold">
              <Info className="w-3 h-3" />
              <span>{errorMsg}</span>
            </div>
          )}

          {inLounge ? (
            <div className="flex items-center bg-slate-800 border border-slate-700 p-1 rounded-xl">
              {/* Mic Mute toggle */}
              <button
                onClick={() => handleToggleMute(!isMuted)}
                className={`p-2 rounded-lg transition cursor-pointer ${isMuted ? 'bg-red-500/10 text-red-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Deafen toggle */}
              <button
                onClick={() => handleToggleDeafen(!isDeafened)}
                className={`p-2 rounded-lg transition cursor-pointer ${isDeafened ? 'bg-red-500/10 text-red-400' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                title={isDeafened ? 'Undeafen audio output' : 'Deafen audio output'}
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Audio Settings toggle */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition cursor-pointer ${showSettings ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Disconnect Voice Call button */}
              <button
                onClick={leaveAudioLounge}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition cursor-pointer ml-1"
                title="Leave Voice Channel"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={joinAudioLounge}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/10 transition cursor-pointer flex items-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5" />
              Join Audio Lounge
            </button>
          )}
        </div>

      </div>

      {/* Persistent Settings Drawer (Collapsible) */}
      {inLounge && showSettings && (
        <div className="border-t border-slate-750 mt-4 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300 animate-slideDown">
          {/* Micro Device Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Microphone Device</label>
            <select
              value={selectedInput}
              onChange={handleInputChange}
              className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
            >
              {inputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
          </div>

          {/* Speakers Device Selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Speaker Device</label>
            <select
              value={selectedOutput}
              onChange={handleOutputChange}
              className="w-full bg-slate-950 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 outline-none text-xs"
            >
              {outputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0, 5)}`}</option>
              ))}
            </select>
          </div>

          {/* Push-to-Talk toggle */}
          <div className="flex flex-col justify-center space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Voice Mode</label>
            <button
              onClick={() => setIsPTTEnabled(!isPTTEnabled)}
              className={`w-full py-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 ${
                isPTTEnabled 
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400' 
                  : 'bg-slate-950 border-slate-750 hover:bg-slate-900 text-slate-400'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isPTTEnabled ? 'Push-To-Talk: Active (SPACEBAR)' : 'Voice-Activated: Active'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
