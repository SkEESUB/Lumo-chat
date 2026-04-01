import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_BACKEND_URL || "https://lumo-backend-9lq7.onrender.com";

export const socket = io(URL, {
  autoConnect: false, // Don't connect until user clicks Join
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
}
