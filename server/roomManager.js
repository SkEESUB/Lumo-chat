// roomManager.js
// In-memory store for rooms
const rooms = new Map();

class Room {
  constructor(roomId, code) {
    this.roomId = roomId;
    this.code = code;
    this.users = new Map(); // id -> user object
    this.messages = []; // store messages
    this.maxUsers = 3;
    this.createdAt = new Date();
  }

  addUser(socketId, user) {
    if (this.users.size >= this.maxUsers) {
      return false;
    }
    this.users.set(socketId, user);
    return true;
  }

  removeUser(socketId) {
    this.users.delete(socketId);
    return this.users.size;
  }
}

export const roomManager = {
  createRoom: () => {
    // Generate unique roomId (simple random string)
    const roomId = Math.random().toString(36).substring(2, 9).toUpperCase();
    
    // Generate 6 digit pin
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    rooms.set(roomId, new Room(roomId, code));
    
    return { roomId, code };
  },

  joinRoom: (roomId, code, user) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return { success: false, message: 'Room not found' };
    }

    if (room.users.has(user.id)) {
      return { success: false, message: 'User already in room' };
    }

    const added = room.addUser(user.id, user);
    
    if (!added) {
      return { success: false, message: 'Room is full (Max 3 users)' };
    }

    return { success: true, room: room };
  },

  leaveRoom: (roomId, socketId) => {
    const room = rooms.get(roomId);
    if (!room) return { success: false, roomDeleted: false };

    const remaining = room.removeUser(socketId);

    // Smart Delete removed to ensure room stability
    return { success: true, roomDeleted: false };
  },

  getRoomUsers: (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return [];
    
    return Array.from(room.users.values());
  },
  
  roomExists: (roomId) => {
    return rooms.has(roomId);
  },

  addMessage: (roomId, message) => {
    const room = rooms.get(roomId);
    if (room) {
      room.messages.push(message);
      return true;
    }
    return false;
  },

  getRoomMessages: (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return [];
    return room.messages;
  }
};
