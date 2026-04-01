import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

// Your custom modules
import { initializeSocket } from "./socket.js";
import { roomManager } from "./roomManager.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

//
// ✅ 1. CORS (CLEAN WAY — NOT manual headers)
//
app.use(cors({
  origin: "https://lumo-chat.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

//
// ✅ 2. JSON
//
app.use(express.json());

//
// ✅ 3. Rate limiting
//
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use("/api", apiLimiter);

//
// ✅ 4. Test route
//
app.get("/", (req, res) => {
  res.send("🔥 Backend is working");
});

//
// ✅ 5. API route
//
app.post("/api/rooms/create", (req, res) => {
  try {
    const room = roomManager.createRoom();

    console.log("✅ Room created:", room);

    res.status(201).json(room);
  } catch (err) {
    console.error("❌ Room creation error:", err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

//
// ✅ 6. Socket setup
//
const io = new Server(server, {
  cors: {
    origin: "https://lumo-chat.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

//
// ✅ 7. Debug socket connection
//
io.on("connection", (socket) => {
  console.log("🔥 Socket connected:", socket.id);
});

//
// ✅ 8. Initialize your custom socket logic
//
try {
  initializeSocket(io);
  console.log("✅ Socket initialized");
} catch (err) {
  console.error("❌ Socket init failed:", err);
}

//
// ✅ 9. Start server
//
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});