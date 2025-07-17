const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.post('/api/create-room', async (req, res) => {
  try {
    const { roomId } = req.body;

    // If no roomId provided, generate one
    const finalRoomId = roomId?.trim() || uuidv4();

    // Check if it already exists
    const existing = await Room.findOne({ roomId: finalRoomId });
    if (existing) {
      return res.status(400).json({ error: 'Room ID already exists. Try a different name.' });
    }

    const room = new Room({ roomId: finalRoomId });
    await room.save();
    res.json({ roomId: finalRoomId, message: 'Room created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});


app.get('/api/room/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Socket.io Connection Handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join Room
  socket.on('join-room', async ({ roomId, userId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (!room) {
        socket.emit('error', 'Room not found');
        return;
      }

      // Add user to room 
      socket.join(roomId);

      // Update room participants
      room.participants.push({
        socketId: socket.id,
        userId: userId || socket.id
      });
      await room.save();

      // Notify existing users
      socket.to(roomId).emit('user-joined', {
        userId: userId || socket.id,
        socketId: socket.id
      });

      // Send existing users to new user
      const existingUsers = room.participants.filter(p => p.socketId !== socket.id);
      socket.emit('existing-users', existingUsers);

      console.log(`User ${socket.id} joined room ${roomId}`);
    } catch (error) {
      socket.emit('error', 'Failed to join room');
    }
  });

  // WebRTC Signaling
  socket.on('offer', ({ offer, targetSocketId }) => {
    socket.to(targetSocketId).emit('offer', {
      offer,
      senderSocketId: socket.id
    });
  });

  socket.on('answer', ({ answer, targetSocketId }) => {
    socket.to(targetSocketId).emit('answer', {
      answer,
      senderSocketId: socket.id
    });
  });

  socket.on('ice-candidate', ({ candidate, targetSocketId }) => {
    socket.to(targetSocketId).emit('ice-candidate', {
      candidate,
      senderSocketId: socket.id
    });
  });

  // Leave Room
  socket.on('leave-room', async ({ roomId }) => {
    try {
      const room = await Room.findOne({ roomId });
      if (room) {
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
        await room.save();

        socket.to(roomId).emit('user-left', { socketId: socket.id });
        socket.leave(roomId);
      }
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    try {
      // Remove user from all rooms
      await Room.updateMany(
        { 'participants.socketId': socket.id },
        { $pull: { participants: { socketId: socket.id } } }
      );

      console.log('User disconnected:', socket.id);
    } catch (error) {
      console.error('Error on disconnect:', error);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
