import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

// ✅ 1. CORS FIRST (VERY IMPORTANT)
app.use(cors({
  origin: "https://lumo-chat.vercel.app"
}));

// ✅ 2. JSON
app.use(express.json());

// ✅ 3. TEST ROUTE (to check backend works)
app.get("/", (req, res) => {
  res.send("Backend is working");
});

// ✅ 4. YOUR API ROUTE
app.post("/api/rooms/create", (req, res) => {
  res.json({
    roomId: "12345",
    code: "ABCD"
  });
});

// ✅ 5. START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("🔥 NEW VERSION DEPLOYED ON PORT", PORT);
});