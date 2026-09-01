/**
 * WebRTC Screen Sharing Service
 * Manages getDisplayMedia screen capture, ICE candidate negotiation,
 * adaptive bitrate constraints, and dual-stream management.
 */

export class WebRTCScreenService {
  constructor(socketGateway) {
    this.socket = socketGateway;
    this.peerConnection = null;
    this.screenStream = null;
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' },
      ],
    };
  }

  /**
   * Captures screen media stream with adaptive constraints (1080p@30fps -> 720p fallback)
   */
  async startScreenCapture() {
    const constraints = {
      video: {
        width: { max: 1920, ideal: 1920 },
        height: { max: 1080, ideal: 1080 },
        frameRate: { max: 30, ideal: 30 },
      },
      audio: true, // System audio capture
    };

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (err) {
      console.warn('Falling back to 720p screen capture:', err);
      constraints.video.width = { ideal: 1280 };
      constraints.video.height = { ideal: 720 };
      this.screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    }

    return this.screenStream;
  }

  /**
   * Initializes P2P Peer Connection and attaches tracks
   */
  async initPeerConnection(roomId, remotePeerId) {
    this.peerConnection = new RTCPeerConnection(this.config);

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.screenStream);
      });
    }

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('webrtc-ice-candidate', {
          target: remotePeerId,
          candidate: event.candidate,
        });
      }
    };

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    this.socket.emit('webrtc-offer', {
      roomId,
      target: remotePeerId,
      sdp: offer,
    });
  }

  /**
   * Stops screen capture and closes tracks
   */
  stopScreenCapture() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}
