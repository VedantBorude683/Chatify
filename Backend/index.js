const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const path = require('path');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const messageRoutes = require('./routes/messages');
const conversationRoutes = require('./routes/conversations');
const uploadRoutes = require('./routes/upload');
const groupRoutes = require('./routes/groups');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const User = require('./models/User');

dotenv.config();

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chatify';
  try {
    await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected to: ${uri}`);
  } catch (err) {
    console.error('⚠️ Primary MongoDB Connection failed, trying local fallback:', err.message);
    try {
      await mongoose.connect('mongodb://127.0.0.1:27017/chatify');
      console.log('✅ Connected to local MongoDB fallback at mongodb://127.0.0.1:27017/chatify');
    } catch (fallbackErr) {
      console.error('❌ Failed to connect to local MongoDB:', fallbackErr.message);
    }
  }
};

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);

app.use((err, req, res, next) => {
  console.error("--- UNHANDLED ERROR ---", err);
  res.status(500).json({ error: 'Server Error: Something broke!' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
app.set("io", io);

const PORT = process.env.PORT || 3001;

let onlineUsers = {}; // Maps userId -> socketId
let socketToUser = {}; // Maps socketId -> userId

const addUser = (userId, socketId) => {
  onlineUsers[userId] = socketId;
  socketToUser[socketId] = userId;
};

const removeUser = (socketId) => {
  const userId = socketToUser[socketId];
  if (userId) {
    delete onlineUsers[userId];
    delete socketToUser[socketId];
  }
  return userId;
};

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
  console.log(`⚡ Socket connected: ${socket.id}`);

  // Register online user
  socket.on('addUser', async (userId) => {
    if (!userId) return;
    addUser(userId, socket.id);
    io.emit('getOnlineUsers', Object.keys(onlineUsers));

    // Join all conversation rooms for this user
    try {
      const userConversations = await Conversation.find({ members: userId });
      userConversations.forEach(convo => {
        socket.join(convo._id.toString());
      });
      console.log(`User ${userId} joined ${userConversations.length} conversation rooms`);
    } catch (err) {
      console.error(`Error joining conversation rooms for user ${userId}:`, err);
    }
  });

  // Explicitly join a conversation room
  socket.on('joinConversation', (conversationId) => {
    if (conversationId) {
      socket.join(conversationId.toString());
      console.log(`Socket ${socket.id} joined conversation: ${conversationId}`);
    }
  });

  socket.on('joinNewGroupRoom', ({ conversationId }) => {
    if (conversationId) {
      socket.join(conversationId.toString());
      console.log(`Socket ${socket.id} joined new group room: ${conversationId}`);
    }
  });

  // Real-time message dispatch via socket
  socket.on('sendMessage', async (data) => {
    const {
      senderId,
      conversationId,
      text,
      timestamp,
      clientId,
      messageType,
      fileUrl,
      callInfo
    } = data;

    if (!conversationId) {
      console.error("sendMessage received without conversationId:", data);
      return;
    }

    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;

      let fallbackText = text;
      if (!fallbackText) {
        if (messageType === 'image') fallbackText = 'Sent an image';
        else if (messageType === 'video') fallbackText = 'Sent a video';
        else if (messageType === 'call') fallbackText = `${callInfo?.callType === 'audio' ? 'Audio' : 'Video'} call (${callInfo?.status || 'ended'})`;
        else fallbackText = 'Sent a file';
      }

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId,
        text: fallbackText,
        timestamp: timestamp || new Date(),
        readBy: [senderId],
        messageType: messageType || 'text',
        fileUrl: fileUrl || null,
        callInfo: callInfo || undefined
      });

      const savedMessage = await newMessage.save();

      conversation.lastMessage = savedMessage._id;
      conversation.updatedAt = Date.now();
      await conversation.save();

      const populatedMessage = await Message.findById(savedMessage._id)
        .populate('senderId', 'username email avatar status');
      
      const messageToSend = populatedMessage.toObject();
      messageToSend.clientId = clientId;

      // Broadcast to entire room including sender for perfect synchronization
      io.to(conversationId.toString()).emit('receiveMessage', messageToSend);

    } catch (err) {
      console.error(`Error handling sendMessage for convo ${conversationId}:`, err);
    }
  });

  // Typing indicators
  socket.on('startTyping', (data) => {
    const { conversationId, senderId, senderUsername } = data;
    if (conversationId && senderId) {
      socket.to(conversationId.toString()).emit('userTyping', { 
        conversationId, 
        senderId, 
        senderUsername 
      });
    }
  });

  socket.on('stopTyping', (data) => {
    const { conversationId, senderId } = data;
    if (conversationId && senderId) {
      socket.to(conversationId.toString()).emit('userStoppedTyping', { 
        conversationId, 
        senderId 
      });
    }
  });

  // Message deletion
  socket.on('notifyDeleteEveryone', (data) => {
    const { messageId, conversationId } = data;
    if (conversationId) {
      socket.to(conversationId.toString()).emit('messageDeleted', { messageId, conversationId });
    }
  });

  // Read status synchronization
  socket.on('markConversationRead', ({ conversationId, userId }) => {
    if (conversationId && userId) {
      socket.to(conversationId.toString()).emit('conversationRead', { conversationId, userId });
    }
  });

  // ==========================================
  // WEBRTC VIDEO CALL SIGNALING (1-ON-1 CALLS)
  // ==========================================

  socket.on('call:user', ({ userToCall, signalData, from, callerName, callerAvatar, isVideo, conversationId }) => {
    const targetSocketId = onlineUsers[userToCall];
    console.log(`📞 Call initiated from ${from} (${callerName}) to ${userToCall}. Online: ${!!targetSocketId}`);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:incoming', {
        signal: signalData,
        from,
        callerName,
        callerAvatar,
        isVideo: isVideo !== false,
        conversationId
      });
    } else {
      socket.emit('call:unavailable', { message: 'User is currently offline.' });
    }
  });

  socket.on('call:accept', ({ to, signal }) => {
    const targetSocketId = onlineUsers[to];
    console.log(`📞 Call accepted, sending signal back to ${to}`);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:accepted', { signal });
    }
  });

  socket.on('call:ice-candidate', ({ to, candidate }) => {
    const targetSocketId = onlineUsers[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ice-candidate', { candidate });
    }
  });

  socket.on('call:reject', ({ to, reason }) => {
    const targetSocketId = onlineUsers[to];
    console.log(`📞 Call rejected by user, notifying ${to}`);
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:rejected', { reason: reason || 'Call declined' });
    }
  });

  socket.on('call:end', ({ to, conversationId }) => {
    const targetSocketId = onlineUsers[to];
    if (targetSocketId) {
      io.to(targetSocketId).emit('call:ended', { conversationId });
    }
    if (conversationId) {
      socket.to(conversationId.toString()).emit('call:ended', { conversationId });
    }
  });

  // ==========================================
  // LIVE VIDEO STREAMING SIGNALING (ROOM BROADCAST)
  // ==========================================

  socket.on('stream:start', async ({ conversationId, streamTitle, host }) => {
    console.log(`🔴 Stream started in convo ${conversationId} by ${host?.username}`);
    try {
      await Conversation.findByIdAndUpdate(conversationId, {
        activeStream: {
          isLive: true,
          hostId: host?._id,
          streamTitle: streamTitle || `${host?.username}'s Live Stream`,
          startedAt: new Date()
        }
      });
      io.to(conversationId.toString()).emit('stream:started', {
        conversationId,
        streamTitle: streamTitle || `${host?.username}'s Live Stream`,
        host,
        startedAt: new Date()
      });
    } catch (err) {
      console.error('Error starting live stream:', err);
    }
  });

  socket.on('stream:join', ({ conversationId, viewer }) => {
    console.log(`👀 Viewer ${viewer?.username} joined stream in ${conversationId}`);
    socket.to(conversationId.toString()).emit('stream:viewer-joined', {
      conversationId,
      viewer,
      viewerSocketId: socket.id
    });
  });

  socket.on('stream:signal', ({ toSocketId, signal, fromViewer, fromHost }) => {
    if (toSocketId) {
      io.to(toSocketId).emit('stream:signal', {
        signal,
        fromSocketId: socket.id,
        fromViewer,
        fromHost
      });
    }
  });

  socket.on('stream:end', async ({ conversationId }) => {
    console.log(`⏹️ Stream ended in convo ${conversationId}`);
    try {
      await Conversation.findByIdAndUpdate(conversationId, {
        'activeStream.isLive': false,
        'activeStream.hostId': null
      });
      io.to(conversationId.toString()).emit('stream:ended', { conversationId });
    } catch (err) {
      console.error('Error ending live stream:', err);
    }
  });

  // Disconnect handling
  socket.on('disconnect', async () => {
    const userId = removeUser(socket.id);
    if (userId) {
      console.log(`❌ User disconnected: ${userId} (socket ${socket.id})`);
      io.emit('getOnlineUsers', Object.keys(onlineUsers));

      // If user was hosting a stream, close it
      try {
        const liveConvo = await Conversation.findOne({ 'activeStream.hostId': userId, 'activeStream.isLive': true });
        if (liveConvo) {
          liveConvo.activeStream.isLive = false;
          liveConvo.activeStream.hostId = null;
          await liveConvo.save();
          io.to(liveConvo._id.toString()).emit('stream:ended', { conversationId: liveConvo._id });
        }
      } catch (err) {
        console.error('Error cleaning up live stream on disconnect:', err);
      }
    }
  });
});

// Serve Frontend static assets in production if dist exists
const frontendDist = path.join(__dirname, '../Frontend/dist');
const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// --- SERVER LISTEN ---
server.listen(PORT, () => {
  console.log(`🚀 Chatify Backend listening on port ${PORT}`);
});