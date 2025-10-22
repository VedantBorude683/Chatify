const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

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
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

app.use((err, req, res, next) => {
  console.error("--- UNHANDLED ERROR ---");
  console.error(err.stack);
  res.status(500).send('Server Error: Something broke!');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust in production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

let onlineUsers = {}; // Maps userId to socketId

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

  socket.on('addUser', (userId) => {
    addUser(userId, socket.id);
    io.emit('getOnlineUsers', Object.keys(onlineUsers));
  });

  socket.on('sendMessage', async (data) => {
    const { recipientId, senderId, text } = data;
    try {
      let conversation = await Conversation.findOne({ members: { $all: [senderId, recipientId] } });
      if (!conversation) {
        conversation = new Conversation({ members: [senderId, recipientId] });
      }
      const newMessage = new Message({
        conversationId: conversation._id,
        senderId,
        text,
        readBy: [senderId]
      });
      const savedMessage = await newMessage.save();
      conversation.lastMessage = savedMessage._id;
      await conversation.save();
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveMessage', savedMessage);
        io.to(recipientSocketId).emit('newUnreadMessage', { 
            conversationId: conversation._id.toString(),
            senderId: senderId 
        });
      }
    } catch (err) {
      console.error("Error saving or sending message:", err);
    }
  });
  
  socket.on('startTyping', (data) => {
    const recipientSocketId = onlineUsers[data.recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userTyping', { senderId: data.senderId });
    }
  });

  socket.on('stopTyping', (data) => {
    const recipientSocketId = onlineUsers[data.recipientId];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('userStoppedTyping', { senderId: data.senderId });
    }
  });
  
  // --- NEW: Handle real-time delete notifications ---
  socket.on('notifyDeleteEveryone', (data) => {
      const { messageId, conversationId, recipientId } = data;
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
          // Notify the other user(s) in the chat that the message was deleted
          io.to(recipientSocketId).emit('messageDeleted', { messageId, conversationId });
      }
      // Optionally notify sender's other sessions too
      // socket.broadcast.to(sender's room if implemented).emit('messageDeleted', { messageId, conversationId });
  });

  socket.on('disconnect', () => {
    removeUser(socket.id);
    console.log(`❌ A user disconnected: ${socket.id}`);
    io.emit('getOnlineUsers', Object.keys(onlineUsers));
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});