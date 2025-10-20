const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

app.use((err, req, res, next) => {
  console.error("--- UNHANDLED ERROR ---");
  console.error(err.stack);
  res.status(500).send('Server Error: Something broke!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// --- Logic for Private Messaging ---
let onlineUsers = {}; 

const addUser = (userId, socketId) => {
  onlineUsers[userId] = socketId;
};

const removeUser = (socketId) => {
  for (let userId in onlineUsers) {
    if (onlineUsers[userId] === socketId) {
      delete onlineUsers[userId];
      break;
    }
  }
};

io.on('connection', (socket) => {
  console.log(`✅ A user connected: ${socket.id}`);

  // When a user connects, they emit their userId, and we add them to the list
  socket.on('addUser', (userId) => {
    addUser(userId, socket.id);
    console.log("Online Users Updated:", onlineUsers); // Added log for verification
  });

  // When a message is sent, find the recipient's socketId and send only to them
  socket.on('sendMessage', (data) => {
    const { recipientId, ...messageData } = data;
    const recipientSocketId = onlineUsers[recipientId];

    if (recipientSocketId) {
      // This sends the message ONLY to the specific recipient's socket
      io.to(recipientSocketId).emit('receiveMessage', messageData);
    } else {
      console.log(`FAILURE: Recipient ${recipientId} is NOT in the onlineUsers map.`);
    }
  });

  socket.on('disconnect', () => {
    removeUser(socket.id);
    console.log(`❌ A user disconnected: ${socket.id}`);
  });
});
// --- End of Logic ---

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});