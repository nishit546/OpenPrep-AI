/**
 * @fileoverview WebRTC Mesh Connection Manager for Study Squad Audio Lounge.
 * Manages RTCPeerConnections, local audio tracks, gain nodes, and Voice Activity Detection (VAD).
 */
export default class WebRTCClient {
  constructor({
    squadId,
    socket,
    onRosterUpdate,
    onSpeakerHighlight,
    onAudioFull,
  }) {
    this.squadId = squadId;
    this.socket = socket;
    this.onRosterUpdate = onRosterUpdate;
    this.onSpeakerHighlight = onSpeakerHighlight;
    this.onAudioFull = onAudioFull;

    this.localStream = null;
    this.peers = {}; // socketId -> { pc, gainNode, audioEl }
    this.roster = []; // List of participants from server

    // Audio states
    this.isMuted = false;
    this.isDeafened = false;
    this.pushToTalkActive = false;

    // VAD (Voice Activity Detection) variables
    this.audioContext = null;
    this.analyser = null;
    this.vadInterval = null;
    this.isSpeaking = false;
    this.speakThreshold = 15; // Noise threshold
    this.silenceDebounceTime = 1200; // Silence delay in ms
    this.lastSpokenTime = 0;

    // Device IDs
    this.inputDeviceId = 'default';
    this.outputDeviceId = 'default';

    // Bind socket events
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.socket.on('audio_lounge_full', (data) => {
      if (this.onAudioFull) this.onAudioFull(data);
    });

    // Receive active peers lists when first joining
    this.socket.on('lounge_peers', async (peersList) => {
      // Create peer connections to all existing peers and send offers (mesh)
      for (const peer of peersList) {
        await this.createPeerConnection(peer.socketId, true);
      }
      this.updateRoster(peersList);
    });

    // Handle a new peer joining the room
    this.socket.on('peer_joined', (peer) => {
      // Existing peers wait for the new joiner to initiate WebRTC offers
      this.roster = [...this.roster.filter(p => p.socketId !== peer.socketId), peer];
      if (this.onRosterUpdate) this.onRosterUpdate([...this.roster]);
    });

    // Handle incoming WebRTC SDP offers
    this.socket.on('sdp_received', async ({ senderSocketId, sdp }) => {
      let peerInfo = this.peers[senderSocketId];
      if (!peerInfo) {
        peerInfo = await this.createPeerConnection(senderSocketId, false);
      }
      
      const { pc } = peerInfo;
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));

      if (sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('relay_sdp', { targetSocketId: senderSocketId, sdp: answer });
      }
    });

    // Handle incoming ICE candidates
    this.socket.on('ice_received', async ({ senderSocketId, iceCandidate }) => {
      const peerInfo = this.peers[senderSocketId];
      if (peerInfo && iceCandidate) {
        try {
          await peerInfo.pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
        } catch (e) {
          console.error('[WebRTC] Error adding ICE candidate:', e);
        }
      }
    });

    // Roster participant left
    this.socket.on('peer_left', ({ socketId }) => {
      this.removePeer(socketId);
    });

    // Peer toggled mute/deafen
    this.socket.on('peer_audio_state', ({ socketId, muted, deafened }) => {
      this.roster = this.roster.map(p => 
        p.socketId === socketId ? { ...p, muted, deafened } : p
      );
      if (this.onRosterUpdate) this.onRosterUpdate([...this.roster]);
    });

    // Peer started/stopped speaking (VAD)
    this.socket.on('peer_speaking_state', ({ socketId, speaking }) => {
      this.roster = this.roster.map(p => 
        p.socketId === socketId ? { ...p, speaking } : p
      );
      if (this.onRosterUpdate) this.onRosterUpdate([...this.roster]);
      if (this.onSpeakerHighlight) this.onSpeakerHighlight(socketId, speaking);
    });
  }

  async initLocalStream() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        audio: this.inputDeviceId ? { deviceId: { exact: this.inputDeviceId } } : true
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Setup local audio analyser for voice activity detection (VAD)
      this.setupVAD();
      
      // Update local audio track mute states
      this.applyMuteState();

      return this.localStream;
    } catch (e) {
      console.error('[WebRTC] Failed to capture local microphone stream:', e);
      throw e;
    }
  }

  async joinLounge() {
    await this.initLocalStream();
    this.socket.emit('join_audio_lounge', { squadId: this.squadId });
  }

  leaveLounge() {
    // 1. Notify signaling server
    this.socket.emit('leave_audio_lounge', { squadId: this.squadId });

    // 2. Disconnect socket listeners for this lounge instance
    this.socket.off('audio_lounge_full');
    this.socket.off('lounge_peers');
    this.socket.off('peer_joined');
    this.socket.off('sdp_received');
    this.socket.off('ice_received');
    this.socket.off('peer_left');
    this.socket.off('peer_audio_state');
    this.socket.off('peer_speaking_state');

    // 3. Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // 4. Close all peer connections
    Object.keys(this.peers).forEach(id => this.removePeer(id));

    // 5. Tear down Analyser & VAD loops
    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    this.audioContext = null;
    this.analyser = null;
  }

  async createPeerConnection(targetSocketId, isInitiator) {
    const pcConfig = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const pc = new RTCPeerConnection(pcConfig);
    const peerInfo = { pc, gainNode: null, audioEl: null };
    this.peers[targetSocketId] = peerInfo;

    // Add local tracks to RTCPeerConnection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // ICE Candidate event
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('relay_ice', {
          targetSocketId,
          iceCandidate: event.candidate,
        });
      }
    };

    // Connection negotiation needed (only the initiator starts offering to prevent collision)
    pc.onnegotiationneeded = async () => {
      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.socket.emit('relay_sdp', { targetSocketId, sdp: offer });
        } catch (err) {
          console.error('[WebRTC] Error during negotiation offer:', err);
        }
      }
    };

    // On remote track stream received
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.setupRemoteAudioPlayback(targetSocketId, remoteStream);
    };

    return peerInfo;
  }

  setupRemoteAudioPlayback(targetSocketId, remoteStream) {
    const peerInfo = this.peers[targetSocketId];
    if (!peerInfo) return;

    // Clean up old audio elements if present
    if (peerInfo.audioEl) {
      peerInfo.audioEl.remove();
    }

    // Create persistent HTMLAudioElement
    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.srcObject = remoteStream;
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
    
    peerInfo.audioEl = audioEl;

    // Apply deafen state (mute remote players)
    if (this.isDeafened) {
      audioEl.muted = true;
    }

    // Set output destination speaker device (sink ID)
    if (this.outputDeviceId && audioEl.setSinkId) {
      audioEl.setSinkId(this.outputDeviceId).catch(err => {
        console.warn('[WebRTC] Failed to set audio output sink device:', err);
      });
    }
  }

  setupVAD() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioContext = new AudioContextClass();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.vadInterval = setInterval(() => {
        if (!this.analyser || this.isMuted) return;

        this.analyser.getByteFrequencyData(dataArray);
        
        // Compute average sound magnitude
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        const now = Date.now();
        if (average > this.speakThreshold) {
          this.lastSpokenTime = now;
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.socket.emit('speaking_state_change', { squadId: this.squadId, speaking: true });
          }
        } else {
          // Keep active state for debounce window to avoid flickering between words
          if (this.isSpeaking && (now - this.lastSpokenTime > this.silenceDebounceTime)) {
            this.isSpeaking = false;
            this.socket.emit('speaking_state_change', { squadId: this.squadId, speaking: false });
          }
        }
      }, 100);
    } catch (err) {
      console.warn('[WebRTC] VAD setting up failed:', err);
    }
  }

  toggleMute(state) {
    this.isMuted = state;
    this.applyMuteState();
    
    // Broadcast status to lounge
    this.socket.emit('audio_state_change', {
      squadId: this.squadId,
      muted: this.isMuted,
      deafened: this.isDeafened,
    });
  }

  toggleDeafen(state) {
    this.isDeafened = state;
    
    // Toggle remote audio element playback mutes
    Object.values(this.peers).forEach((peer) => {
      if (peer.audioEl) {
        peer.audioEl.muted = state;
      }
    });

    // Also auto-mute mic if deafened (Discord pattern)
    this.isMuted = state ? true : this.isMuted;
    this.applyMuteState();

    // Broadcast status to lounge
    this.socket.emit('audio_state_change', {
      squadId: this.squadId,
      muted: this.isMuted,
      deafened: this.isDeafened,
    });
  }

  applyMuteState() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
  }

  async changeInputDevice(deviceId) {
    this.inputDeviceId = deviceId;
    if (this.localStream) {
      // Re-capture mic
      await this.initLocalStream();

      // Replace audio track on all existing peer connections
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        Object.values(this.peers).forEach(({ pc }) => {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) {
            sender.replaceTrack(audioTrack);
          }
        });
      }
    }
  }

  async changeOutputDevice(deviceId) {
    this.outputDeviceId = deviceId;
    
    // Apply setSinkId on all remote playback elements
    for (const peer of Object.values(this.peers)) {
      if (peer.audioEl && peer.audioEl.setSinkId) {
        try {
          await peer.audioEl.setSinkId(deviceId);
        } catch (err) {
          console.warn('[WebRTC] setSinkId failure:', err);
        }
      }
    }
  }

  removePeer(socketId) {
    const peerInfo = this.peers[socketId];
    if (peerInfo) {
      if (peerInfo.pc) peerInfo.pc.close();
      if (peerInfo.audioEl) peerInfo.audioEl.remove();
      delete this.peers[socketId];
    }

    this.roster = this.roster.filter(p => p.socketId !== socketId);
    if (this.onRosterUpdate) this.onRosterUpdate([...this.roster]);
  }

  updateRoster(peersList) {
    this.roster = peersList;
    if (this.onRosterUpdate) this.onRosterUpdate([...this.roster]);
  }
}
