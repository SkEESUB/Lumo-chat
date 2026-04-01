import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// ✅ Move imports to top (IMPORTANT)
import { initializeSocket } from './socket.js';
import { roomManager } from './roomManager.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ CORS (make it explicit)
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://lumo-chat.vercel.app"
  ],
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// ✅ Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', apiLimiter);

// ✅ Socket setup
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173",
      "https://lumo-chat.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// ✅ DEBUG: check socket working
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id);
});

// ✅ Initialize your custom socket logic
try {
  initializeSocket(io);
  console.log("✅ Socket initialized successfully");
} catch (err) {
  console.error("❌ Socket init failed:", err);
}

// ✅ API route
app.post('/api/rooms/create', (req, res) => {
  try {
    const room = roomManager.createRoom();
    console.log("✅ Room created:", room);
    res.status(201).json(room);
  } catch (err) {
    console.error("❌ Room creation error:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Server is running.');
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});