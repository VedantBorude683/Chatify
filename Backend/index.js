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

  // --- (!!!) CORRECTED 'sendMessage' LISTENER (!!!) ---
  socket.on('sendMessage', async (data) => {
    // 1. Destructure *all* data from client, including our new clientId and timestamp
    const { recipientId, senderId, text, timestamp, clientId } = data;
    
    try {
      let conversation = await Conversation.findOne({ members: { $all: [senderId, recipientId] } });
      if (!conversation) {
        conversation = new Conversation({ members: [senderId, recipientId] });
      }

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId,
        text,
        // Use the client's timestamp for consistency
        timestamp: timestamp || new Date(), 
        readBy: [senderId]
      });
      
      const savedMessage = await newMessage.save();
      
      conversation.lastMessage = savedMessage._id;
      await conversation.save();

      // --- (!!!) THIS IS THE FIX (!!!) ---
      
      // 2. Convert the Mongoose document to a plain JS object
      const messageToSend = savedMessage.toObject();
      
      // 3. Add the clientId back so the client can find its temp message
      messageToSend.clientId = clientId; 

      // 4. Send to the recipient
      const recipientSocketId = onlineUsers[recipientId];
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receiveMessage', messageToSend);
        io.to(recipientSocketId).emit('newUnreadMessage', { 
            conversationId: conversation._id.toString(),
            senderId: senderId 
        });
      }
      
      // 5. (!!!) CRITICAL: Send confirmation back to the *sender*
      // This tells the sender's client to replace the temp message
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
      io.to(recipientSocketId).emit('userStoppedTyping', { senderId: data.senderId });
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