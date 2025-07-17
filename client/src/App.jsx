import React, { useState } from 'react';
import JoinRoom from './components/JoinRoom';
import VideoRoom from './components/VideoRoom';
// import './App.css';

function App() {
  const [currentRoom, setCurrentRoom] = useState(null);

const handleCreateRoom = async (roomId) => {
  try {
    const response = await fetch('https://videomeet-app-nws3.onrender.com/api/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ roomId })
    });

    const data = await response.json();
    if (response.ok) {
      await handleJoinRoom(data.roomId);
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};


  const handleJoinRoom = async (roomId) => {
    try {
      const response = await fetch(`https://videomeet-app-nws3.onrender.com/api/room/${roomId}`);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentRoom(roomId);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  return (
    <div className="App">
      {!currentRoom ? (
        <JoinRoom
          onJoinRoom={handleJoinRoom}
          onCreateRoom={handleCreateRoom}
        />
      ) : (
        <VideoRoom
          roomId={currentRoom}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </div>
    

  );
}

export default App;
