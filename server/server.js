const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "https://sai-sathwik-video-meet-app.netlify.app", "https://videomeet-app-nws3.onrender.com"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// In-memory room storage
const rooms = {}; // { roomId: [{ socketId, userId }] }

app.post('/api/create-room', (req, res) => {
  const { roomId } = req.body;
  const finalRoomId = roomId?.trim() || uuidv4();

  if (rooms[finalRoomId]) {
    return res.status(400).json({ error: 'Room already exists' });
  }

  rooms[finalRoomId] = [];
  return res.json({ roomId: finalRoomId, message: 'Room created successfully' });
});

app.get('/api/room/:roomId', (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ participants: room });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ roomId, userId }) => {
    const room = rooms[roomId];

    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    if (room.length >= 2) {
      socket.emit('error', 'Room is full');
      return;
    }

    const newUser = { socketId: socket.id, userId: userId || socket.id };
    room.push(newUser);
    socket.join(roomId);

    const existingUsers = room.filter(p => p.socketId !== socket.id);
    socket.emit('existing-users', existingUsers);

    socket.to(roomId).emit('user-joined', newUser);

    console.log(`${socket.id} joined room ${roomId}`);
  });

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

  socket.on('leave-room', ({ roomId }) => {
    const room = rooms[roomId];
    if (room) {
      rooms[roomId] = room.filter(p => p.socketId !== socket.id);
      socket.to(roomId).emit('user-left', { socketId: socket.id });
      socket.leave(roomId);
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const updatedRoom = room.filter(p => p.socketId !== socket.id);
      if (room.length !== updatedRoom.length) {
        rooms[roomId] = updatedRoom;
        socket.to(roomId).emit('user-left', { socketId: socket.id });
      }
    }

    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
