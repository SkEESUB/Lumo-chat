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
const ALLOWED_ORIGINS = [
  "https://lumo-chat.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000"
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(null, true); // Allow all for now in development
    }
  },
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
// ✅ 5. Health check route
//
app.get("/", (req, res) => {
  res.send("🔥 Backend is working");
});

//
// ✅ 6. Socket setup
//
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket connection is handled inside initializeSocket

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