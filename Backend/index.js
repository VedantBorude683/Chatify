const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose'); // Import Mongoose
const authRoutes = require('./routes/auth');

// Load environment variables
dotenv.config();

// --- Database Connection Logic (Moved from db.js) ---
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    process.exit(1); // Exit process with failure
  }
};
// --- End of DB Logic ---

// Connect to database
connectDB();

const app = express();
app.use(cors());
app.use(express.json()); // Middleware to parse JSON bodies

// API Routes
app.use('/api/auth', authRoutes);


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for simplicity in development
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Socket.IO logic
io.on('connection', (socket) => {
  console.log(`✅ User Connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ User Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});