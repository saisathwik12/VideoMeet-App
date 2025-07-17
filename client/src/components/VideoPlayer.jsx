import React, { useEffect, useRef } from 'react';

const VideoPlayer = ({ stream, isLocal = false, socketId }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="video-container text-2xl text-white text-start border-2 p-10 mb-10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="video-stream"
      />
      <div className="video-label">
        {isLocal ? 'You' : `User ${socketId?.substring(0, 8)}`}
      </div>
    </div>
  );
};

export default VideoPlayer;