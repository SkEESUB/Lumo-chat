import { io } from 'socket.io-client';

// Use env variable, fallback to hardcoded Render URL
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://lumo-backend-eknu.onrender.com";

console.log("🔌 Socket target:", BACKEND_URL);

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  transports: ["websocket", "polling"],
});

// Debug connection events
socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.warn("⚠️ Socket disconnected:", reason);
});

socket.on("reconnect_attempt", (attempt) => {
  console.log(`🔄 Reconnect attempt #${attempt}`);
});

socket.on("reconnect", (attempt) => {
  console.log(`✅ Reconnected after ${attempt} attempts`);
});

export const connectSocket = () => {
  if (!socket.connected) {
    console.log("🔌 Connecting socket...");
    socket.connect();
  } else {
    console.log("✅ Socket already connected:", socket.id);
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.emit('leave_room');
    socket.disconnect();
    console.log("🔌 Socket disconnected by user");
  }
};
