import { roomManager } from './roomManager.js';

// Track users by socketId -> { socketId, userId, userName, roomId, status }
const usersBySocket = new Map();

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // ========================
    // JOIN ROOM
    // ========================
    socket.on('join_room', (payload, callback) => {
      try {
        const { roomId, userId, name } = payload || {};

        console.log('📥 join_room payload:', { roomId, userId, name });

        if (!roomId || !name) {
          return safeCallback(callback, {
            success: false,
            message: 'Missing roomId or username',
          });
        }

        // Use the persistent userId from the client, fallback to socket.id
        const finalUserId = userId || socket.id;

        const res = roomManager.joinRoom(roomId, null, {
          id: finalUserId,
          username: name,
        });

        if (!res.success && res.message !== 'User already in room') {
          return safeCallback(callback, res);
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = name;
        socket.visitorId = finalUserId;

        // Track this socket
        usersBySocket.set(socket.id, {
          socketId: socket.id,
          userId: finalUserId,
          userName: name,
          roomId,
          status: 'online',
        });

        console.log(`✅ ${name} joined room ${roomId}`);

        // Notify others
        socket.to(roomId).emit('user_joined', {
          id: finalUserId,
          username: name,
          message: `${name} joined the chat`,
          timestamp: Date.now(),
        });

        // Send updated room data
        broadcastRoomData(io, roomId);

        safeCallback(callback, {
          success: true,
          message: 'Joined successfully',
        });

      } catch (err) {
        console.error('❌ join_room error:', err);
        safeCallback(callback, {
          success: false,
          message: 'Server error while joining',
        });
      }
    });

    // ========================
    // SEND MESSAGE
    // ========================
    socket.on('send_message', (data = {}, callback) => {
      try {
        const room = socket.currentRoom;
        if (!room) return;

        if (!data.text && !data.fileUrl) {
          return safeCallback(callback, {
            success: false,
            message: 'Empty message',
          });
        }

        const messageData = {
          id: generateId(),
          senderId: socket.visitorId || socket.id,
          senderName: socket.username,
          roomId: room,
          text: data.text || '',
          type: data.type || 'chat',
          fileUrl: data.fileUrl || null,
          fileType: data.fileType || null,
          status: 'sent',
          timestamp: Date.now(),
        };

        io.to(room).emit('receive_message', messageData);

        console.log(`📨 Message from ${socket.username} in ${room}`);

        safeCallback(callback, {
          success: true,
          messageId: messageData.id,
        });

      } catch (err) {
        console.error('❌ send_message error:', err);
      }
    });

    // ========================
    // MESSAGE STATUS
    // ========================
    socket.on('message_delivered', ({ messageId, roomId }) => {
      if (messageId && roomId) {
        io.to(roomId).emit('update_status', {
          messageId,
          status: 'delivered',
        });
      }
    });

    socket.on('message_seen', ({ messageId, roomId }) => {
      if (messageId && roomId) {
        io.to(roomId).emit('update_status', {
          messageId,
          status: 'seen',
        });
      }
    });

    // ========================
    // TYPING
    // ========================
    socket.on('typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', {
        userId: socket.visitorId || socket.id,
        username: socket.username,
      });
    });

    socket.on('stop_typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (!roomId) return;
      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.visitorId || socket.id,
        username: socket.username,
      });
    });

    // ========================
    // USER PRESENCE
    // ========================
    socket.on('user_idle', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'idle';
        broadcastRoomData(io, user.roomId);
      }
    });

    socket.on('user_active', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'online';
        broadcastRoomData(io, user.roomId);
      }
    });

    socket.on('user_activity', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'online';
      }
    });

    // ========================
    // LEAVE ROOM
    // ========================
    socket.on('leave_room', (payload) => {
      handleLeave(socket, io);
      if (socket.currentRoom) {
        socket.leave(socket.currentRoom);
      }
      socket.currentRoom = null;
    });

    // ========================
    // DISCONNECT
    // ========================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      handleLeave(socket, io);
      usersBySocket.delete(socket.id);
    });
  });
}

// ========================
// HANDLE LEAVE
// ========================
function handleLeave(socket, io) {
  const room = socket.currentRoom;
  if (!room) return;

  const finalUserId = socket.visitorId || socket.id;
  const res = roomManager.leaveRoom(room, finalUserId);

  socket.to(room).emit('user_left', {
    id: finalUserId,
    username: socket.username,
    message: `${socket.username} left the chat`,
    timestamp: Date.now(),
  });

  if (!res.roomDeleted) {
    broadcastRoomData(io, room);
  }

  // Remove from tracking
  usersBySocket.delete(socket.id);

  console.log(`👋 ${socket.username} left room ${room}`);
}

// ========================
// BROADCAST ROOM DATA
// ========================
function broadcastRoomData(io, roomId) {
  if (!roomId) return;

  const roomUsers = roomManager.getRoomUsers(roomId);

  // Build user list with status from our tracking map
  const usersWithStatus = roomUsers.map((u) => {
    // Find this user's socket tracking entry
    for (const [, tracked] of usersBySocket) {
      if (tracked.userId === u.id && tracked.roomId === roomId) {
        return {
          id: u.id,
          username: u.username,
          status: tracked.status || 'online',
        };
      }
    }
    return { id: u.id, username: u.username, status: 'online' };
  });

  const online = usersWithStatus.filter((u) => u.status === 'online').length;
  const idle = usersWithStatus.filter((u) => u.status === 'idle').length;
  const total = usersWithStatus.length;

  io.to(roomId).emit('room_data', {
    users: usersWithStatus,
    counts: {
      online,
      idle,
      offline: 0,
      total,
    },
  });
}

// ========================
// SAFE CALLBACK
// ========================
function safeCallback(cb, data) {
  if (typeof cb === 'function') {
    cb(data);
  }
}

// ========================
// GENERATE ID
// ========================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
