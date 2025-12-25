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
const Conversation = require('./models/Conversation'); // Ensure Conversation model is required


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

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- ROUTES ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/groups', groupRoutes);

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
app.set("io", io);

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

// --- (!!!) COMPLETE PHASE 3 SOCKET LOGIC (!!!) ---
io.on('connection', (socket) => {
  console.log(`✅ A user connected: ${socket.id}`);

  // --- UPDATED: Join rooms on connect ---
  socket.on('addUser', async (userId) => {
    addUser(userId, socket.id);
    io.emit('getOnlineUsers', Object.keys(onlineUsers));

    // Join rooms for existing conversations
    try {
      const userConversations = await Conversation.find({ members: userId });
      userConversations.forEach(convo => {
        socket.join(convo._id.toString());
        console.log(`User ${userId} joined room ${convo._id.toString()}`);
      });
    } catch (err) {
      console.error(`Error fetching conversations for user ${userId} to join rooms:`, err);
    }
  });

  // --- UPDATED: 'sendMessage' using rooms ---
  socket.on('sendMessage', async (data) => {
    const {
      senderId,
      conversationId, // Use conversationId primarily
      text,
      timestamp,
      clientId,
      messageType,
      fileUrl,
    } = data;

    if (!conversationId) {
      console.error("sendMessage event received without conversationId:", data);
      return;
    }

    try {
      // Find the conversation (optional check, good for robustness)
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        console.error(`Conversation ${conversationId} not found for sendMessage.`);
        // Maybe handle sending an error back to the client?
        return;
      }

      const newMessage = new Message({
        conversationId: conversation._id,
        senderId,
        text,
        timestamp: timestamp || new Date(),
        readBy: [senderId],
        messageType: messageType || 'text',
        fileUrl: fileUrl || null
      });

      const savedMessage = await newMessage.save();

      conversation.lastMessage = savedMessage._id;
      // Also update the 'updatedAt' timestamp for sorting
      conversation.updatedAt = Date.now();
      await conversation.save();

      // Populate sender details for the message to be sent
      const populatedMessage = await Message.findById(savedMessage._id).populate('senderId', 'username email'); // Adjust fields as needed
      
      const messageToSend = populatedMessage.toObject();
      messageToSend.clientId = clientId; // Add back the clientId

      // --- ROOM BROADCAST ---
      // Emit to everyone else in the room (conversation)
      // We send the fully populated message object
      console.log(`Broadcasting receiveMessage to room ${conversationId.toString()}`);
      socket.to(conversationId.toString()).emit('receiveMessage', messageToSend);

      // Send confirmation (including populated sender) back to the original sender
      console.log(`Sending receiveMessage confirmation to sender ${socket.id}`);
      socket.emit('receiveMessage', messageToSend);

      // --- Optional: Notify users for sidebar update ---
      // This helps if a user isn't actively looking at the chat
      // but needs their sidebar conversation list updated immediately.
      // We already update the list inside the 'receiveMessage' handler on client,
      // but this could be an alternative or addition.
      // conversation.members.forEach(memberId => {
      //   const memberSocketId = onlineUsers[memberId.toString()];
      //   if (memberSocketId && memberSocketId !== socket.id) {
      //     io.to(memberSocketId).emit('updateConversationList', { /* maybe send updated convo object */ });
      //   }
      // });


    } catch (err) {
      console.error(`Error handling sendMessage for convo ${conversationId}:`, err);
      // Optionally emit an error back to the sender
      // socket.emit('sendMessageError', { clientId, error: 'Failed to send message' });
    }
  });

  // --- UPDATED: Typing events using rooms ---
  socket.on('startTyping', (data) => {
    const { conversationId, senderId } = data;
    if (conversationId && senderId) {
      // Broadcast to others in the room
      socket.to(conversationId.toString()).emit('userTyping', { conversationId, senderId });
    }
  });

  socket.on('stopTyping', (data) => {
    const { conversationId, senderId } = data;
    if (conversationId && senderId) {
      // Broadcast to others in the room
      socket.to(conversationId.toString()).emit('userStoppedTyping', { conversationId, senderId });
    }
  });

  // --- UPDATED: Delete notifications using rooms ---
  socket.on('notifyDeleteEveryone', (data) => {
    const { messageId, conversationId } = data;
    if (conversationId) {
      // Broadcast to others in the room
      socket.to(conversationId.toString()).emit('messageDeleted', { messageId, conversationId });
    }
  });

  // --- UPDATED: Leave rooms on disconnect ---
  socket.on('disconnect', async () => {
    const userId = Object.keys(onlineUsers).find(key => onlineUsers[key] === socket.id);
    if (userId) {
        // Leave rooms associated with the user
        try {
            const userConversations = await Conversation.find({ members: userId });
            userConversations.forEach(convo => {
                socket.leave(convo._id.toString());
                console.log(`User ${userId} left room ${convo._id.toString()}`);
            });
        } catch (err) {
            console.error(`Error fetching conversations for user ${userId} to leave rooms:`, err);
        }
    }
    removeUser(socket.id);
    console.log(`❌ User disconnected: ${socket.id} (was ${userId || 'unknown'})`);
    io.emit('getOnlineUsers', Object.keys(onlineUsers)); // Update online list for everyone
  });
});

// --- Server Listen ---
server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});