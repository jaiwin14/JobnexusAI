// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const hireBotRoutes = require('./routes/hireBot');
const atsRoutes = require('./routes/ats');
const userHomeRoutes = require('./routes/userHome');
const http = require('http');
const socketIo = require('socket.io');
const app = express();

// Middleware
// Read allowed frontend origins from env (comma-separated) or fall back to defaults
const FRONTEND_ORIGINS = process.env.FRONTEND_ORIGINS
  ? process.env.FRONTEND_ORIGINS.split(",").map((s) => s.trim())
  : ["https://job-nexus-ai.vercel.app", "http://localhost:5173"];

app.use(
  cors({
    origin: FRONTEND_ORIGINS,
    methods: ["GET", "POST", "DELETE"],
    credentials: true,
  })
);
app.use(express.json());

// After creating the express app, add:
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: FRONTEND_ORIGINS,
    methods: ["GET", "POST"],
  }
});

app.set('io', io);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobnexus', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Routes
app.use('/api', authRoutes);
app.use('/api/hirebot', hireBotRoutes);
app.use('/api/ats', atsRoutes);
app.use('/api/userHome', userHomeRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;