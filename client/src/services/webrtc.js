class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStreams = new Map();
    this.peerConnections = new Map();
    this.socket = null;
  }

  async initializeMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  createPeerConnection(socketId) {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    this.peerConnections.set(socketId, peerConnection);

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      this.remoteStreams.set(socketId, remoteStream);
      this.onRemoteStream?.(socketId, remoteStream);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket?.emit('ice-candidate', {
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    return peerConnection;
  }

  async createOffer(socketId) {
    const peerConnection = this.peerConnections.get(socketId);
    if (!peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.socket?.emit('offer', {
        offer,
        targetSocketId: socketId
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async handleOffer(offer, senderSocketId) {
    const peerConnection = this.createPeerConnection(senderSocketId);
    
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.socket?.emit('answer', {
        answer,
        targetSocketId: senderSocketId
      });
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }

  async handleAnswer(answer, senderSocketId) {
    const peerConnection = this.peerConnections.get(senderSocketId);
    if (!peerConnection) return;

    try {
      await peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }

  async handleIceCandidate(candidate, senderSocketId) {
    const peerConnection = this.peerConnections.get(senderSocketId);
    if (!peerConnection) return;

    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  cleanup() {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.remoteStreams.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
  }
}

export default WebRTCService;