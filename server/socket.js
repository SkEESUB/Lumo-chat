import { roomManager } from './roomManager.js';

let users = {};

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔥 User connected: ${socket.id}`);

    // ========================
    // JOIN ROOM
    // ========================
    socket.on('join_room', (data = {}, callback) => {
      try {
        const { roomId, userId, userName, code } = data;
        console.log("JOIN RECEIVED:", data);

        if (!roomId || !userId) {
          console.log("❌ Invalid join data:", data);
          return safeCallback(callback, {
            success: false,
            message: 'Missing roomId or userId',
          });
        }

        const res = roomManager.joinRoom(roomId, code, {
          id: userId,
          username: userName,
        });

        if (!res.success) {
          return safeCallback(callback, res);
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = userName;
        socket.userId = userId;

        users[userId] = {
          socketId: socket.id,
          userName: userName,
          roomId,
          online: true
        };
        io.to(roomId).emit("user_online", {
          userId,
          userName: userName
        });

        console.log("✅ User joined:", userName, roomId);

        // Notify others
        socket.to(roomId).emit('user_joined', {
          id: socket.id,
          username,
          message: `${username} joined the chat`,
          timestamp: new Date(),
        });

        // Send updated user list
        const users = roomManager.getRoomUsers(roomId);
        io.to(roomId).emit('room_users', users);

        safeCallback(callback, {
          success: true,
          message: 'Joined successfully',
          room: res.room,
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
          senderId: socket.id,
          senderName: socket.username,
          roomId: room,
          text: data.text || '',
          fileUrl: data.fileUrl || null,
          fileType: data.fileType || null,
          status: 'sent',
          timestamp: Date.now(),
        };

        io.to(room).emit('receive_message', messageData);

        console.log(`📩 Message from ${socket.username}`);

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
      io.to(roomId).emit('update_status', {
        messageId,
        status: 'delivered'
      });
    });

    socket.on('message_seen', ({ messageId, roomId }) => {
      io.to(roomId).emit('update_status', {
        messageId,
        status: 'seen'
      });
    });

    // ========================
    // TYPING
    // ========================
    socket.on('typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      socket.to(roomId).emit('user_typing', {
        userId: socket.id,
        username: socket.username
      });
    });

    socket.on('stop_typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.id,
        username: socket.username
      });
    });

    // ========================
    // LEAVE ROOM
    // ========================
    socket.on('leave_room', () => {
      handleLeave(socket, io);
      socket.leave(socket.currentRoom);
      socket.currentRoom = null;
    });

    // ========================
    // DISCONNECT
    // ========================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      handleLeave(socket, io);
      
      for (let id in users) {
        if (users[id].socketId === socket.id) {
          const roomToNotify = users[id].roomId;
          users[id].online = false;
          io.to(roomToNotify).emit("user_offline", {
            userId: id
          });
        }
      }
    });
  });
}

// ========================
// HANDLE LEAVE
// ========================
function handleLeave(socket, io) {
  const room = socket.currentRoom;
  if (!room) return;

  const res = roomManager.leaveRoom(room, socket.userId || socket.id);

  socket.to(room).emit('user_left', {
    id: socket.userId || socket.id,
    username: socket.username,
    message: `${socket.username} left the chat`,
    timestamp: new Date(),
  });

  if (!res.roomDeleted) {
    const users = roomManager.getRoomUsers(room);
    io.to(room).emit('room_users', users);
  }

  console.log(`👋 ${socket.username} left room ${room}`);
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