import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './VideoPlayer';
import WebRTCService from '../services/webrtc';

const VideoRoom = ({ roomId, onLeaveRoom }) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [participants, setParticipants] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const socketRef = useRef(null);
  const webrtcRef = useRef(null);

  useEffect(() => {
    initializeConnection();
    return () => cleanup();
  }, [roomId]);

  const initializeConnection = async () => {
    try {
      // Initialize WebRTC service
      webrtcRef.current = new WebRTCService();
      webrtcRef.current.onRemoteStream = (socketId, stream) => {
        setRemoteStreams(prev => new Map(prev.set(socketId, stream)));
      };

      // Get local media
      const stream = await webrtcRef.current.initializeMedia();
      setLocalStream(stream);

      // Initialize socket
      socketRef.current = io('http://localhost:5000');
      webrtcRef.current.socket = socketRef.current;

      setupSocketListeners();
      
      // Join room
      socketRef.current.emit('join-room', { roomId });
      
    } catch (error) {
      console.error('Failed to initialize connection:', error);
      alert('Failed to access camera/microphone');
    }
  };

  const setupSocketListeners = () => {
    const socket = socketRef.current;
    
    socket.on('existing-users', (users) => {
      setParticipants(users);
      // Create offers for existing users
      users.forEach(user => {
        webrtcRef.current.createOffer(user.socketId);
      });
    });

    socket.on('user-joined', (user) => {
      setParticipants(prev => [...prev, user]);
      // New user will create offer
    });

    socket.on('user-left', ({ socketId }) => {
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete(socketId);
        return newMap;
      });
      
      // Clean up peer connection
      const peerConnection = webrtcRef.current.peerConnections.get(socketId);
      if (peerConnection) {
        peerConnection.close();
        webrtcRef.current.peerConnections.delete(socketId);
      }
    });

    socket.on('offer', ({ offer, senderSocketId }) => {
      webrtcRef.current.handleOffer(offer, senderSocketId);
    });

    socket.on('answer', ({ answer, senderSocketId }) => {
      webrtcRef.current.handleAnswer(answer, senderSocketId);
    });

    socket.on('ice-candidate', ({ candidate, senderSocketId }) => {
      webrtcRef.current.handleIceCandidate(candidate, senderSocketId);
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
      alert(error);
    });
  };

  const handleLeaveRoom = () => {
    socketRef.current?.emit('leave-room', { roomId });
    cleanup();
    onLeaveRoom();
  };

  const cleanup = () => {
    webrtcRef.current?.cleanup();
    socketRef.current?.disconnect();
  };

  return (
    <div className="video-room flex flex-col text-center gap-5 bg-gray-600 pt-10">
      <div className="room-header flex flex-col gap-5">
        <h3 className='text-2xl font-semibold text-white'>Room: {roomId}</h3>
        <div className="room-info text-2xl font-semibold text-white">
          <span>Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
          <span>Participants: {participants.length + 1}</span>
        </div>
        <button onClick={handleLeaveRoom} className="leave-button w-50 self-center">
          Leave Room
        </button>
      </div>

      <div className="video-grid flex justify-center">
        {localStream && (
          <VideoPlayer
            stream={localStream}
            isLocal={true}
            socketId="local"
          />
        )}
        
        {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
          <VideoPlayer
            key={socketId}
            stream={stream}
            socketId={socketId}
          />
        ))}
      </div>
    </div>
  );
};

export default VideoRoom;