import React, { useState } from 'react';

const JoinRoom = ({ onJoinRoom, onCreateRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async () => {
    if (!roomId.trim()) return;
    
    setIsLoading(true);
    try {
      await onJoinRoom(roomId);
    } catch (error) {
      alert('Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

const handleCreate = async () => {
  if (!roomId.trim()) return;

  setIsLoading(true);
  try {
    await onCreateRoom(roomId); // pass roomId to App.jsx
  } catch (error) {
    alert('Failed to create room');
  } finally {
    setIsLoading(false);
  }
};


  return (
    <div className="flex flex-col gap-5 bg-gray-600 p-10 h-screen text-center mx-auto">
      <h2 className='text-6xl text-gray-100 font-black'>Video Streaming App</h2>
      
      <div className="flex flex-col gap-5 w-fit mx-auto">
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={isLoading}
          className='border-2 rounded p-2 w-80 text-white'
        />
        <button onClick={handleJoin} disabled={isLoading || !roomId.trim()} className='button'>
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
      </div>

      <div className="create-section">
        <button onClick={handleCreate} disabled={isLoading} className='button'>
          {isLoading ? 'Creating...' : 'Create New Room'}
        </button>
      </div>
    </div>
  );
};

export default JoinRoom;
