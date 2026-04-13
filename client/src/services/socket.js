import { io } from 'socket.io-client';

const getBackendUrl = () => {
  try {
    const url = import.meta.env?.VITE_BACKEND_URL;
    if (url && typeof url === 'string' && url.startsWith('http')) {
      return url;
    }
  } catch (err) {
    console.warn("Env access blocked:", err);
  }
  // Safe default fallback
  return "https://lumo-backend-eknu.onrender.com";
};

const BACKEND_URL = getBackendUrl();
console.log("🔌 Socket target:", BACKEND_URL);

export const socket = io(BACKEND_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ["websocket", "polling"],
  forceNew: false, // Ensures socket isn't repeatedly duplicated on simple disconnects
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("✅ Socket connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection error:", err.message);
});

socket.on("disconnect", (reason) => {
  console.warn("⚠️ Socket disconnected:", reason);
  if (reason === "io server disconnect") {
    // Disconected by server, manual reconnect required
    socket.connect();
  }
});

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
  }
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.emit('leave_room');
    socket.disconnect();
  }
};
