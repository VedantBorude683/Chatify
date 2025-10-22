const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path'); // <-- ADDED for file paths
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const uploadRoutes = require('./routes/upload'); // <-- ADDED for uploads
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

// --- ADD STATIC FILE SERVING ---
// This makes your 'uploads' folder public
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes); // <-- ADDED upload route

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

  // --- (!!!) UPDATED 'sendMessage' LISTENER (!!!) ---
  socket.on('sendMessage', async (data) => {
    const { 
      recipientId, 
      senderId, 
      text, 
      timestamp, 
      clientId,
      messageType, // <-- ADDED
      fileUrl      // <-- ADDED
    } = data;
    
    try {
      let conversation = await Conversation.findOne({ members: { $all: [senderId, recipientId] } });
      if (!conversation) {
        conversation = new Conversation({ members: [senderId, recipientId] });
      }

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId,
        text,
        timestamp: timestamp || new Date(), 
        readBy: [senderId],
        // --- ADD NEW FIELDS ---
        messageType: messageType || 'text',
        fileUrl: fileUrl || null
      });
      
      const savedMessage = await newMessage.save();
      
      // Update last message in conversation
      conversation.lastMessage = savedMessage._id;
      await conversation.save();

      // Convert to plain object to add clientId
      const messageToSend = savedMessage.toObject();
      messageToSend.clientId = clientId; 

      // Send to recipient
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveMessage', messageToSend);
        io.to(recipientSocketId).emit('newUnreadMessage', { 
            conversationId: conversation._id.toString(),
            senderId: senderId 
        });
      }
      
      // Send confirmation back to sender
      socket.emit('receiveMessage', messageToSend);

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
      io.to(recipientSocketId).emit('userStoppedTpng', { senderId: data.senderId });
    }
  });
  
  socket.on('notifyDeleteEveryone', (data) => {
      const { messageId, conversationId, recipientId } = data;
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
          io.to(recipientSocketId).emit('messageDeleted', { messageId, conversationId });
      }
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