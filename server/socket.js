// Replace roomManager to implement persistent messages and rooms
let users = {};
let rooms = {};
let messages = {}; // roomId => []

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔥 User connected: ${socket.id}`);

    // ========================
    // JOIN ROOM
    // ========================
    socket.on('join_room', (data, callback) => {
      try {
        const { roomId, userId, userName } = data || {};
        console.log("JOIN RECEIVED:", data);

        if (!roomId || !userId) {
          console.log("❌ Invalid join data:", data);
          if (callback) return safeCallback(callback, { success: false, message: 'Invalid data' });
          return;
        }

        if (!rooms[roomId]) rooms[roomId] = [];

        if (!rooms[roomId].includes(userId)) {
          rooms[roomId].push(userId);
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = userName;
        socket.userId = userId;

        users[userId] = {
          socketId: socket.id,
          userName: userName,
          roomId,
          status: "online",
          lastSeen: Date.now()
        };

        const oldMessages = messages[roomId] || [];
        socket.emit("load_messages", oldMessages);

        io.to(roomId).emit("user_online", {
          userId,
          userName
        });

        console.log("✅ User joined:", userName, roomId);

        // Send updated user list
        const roomUsers = rooms[roomId].map(id => ({
          id,
          username: users[id]?.userName || 'Unknown',
          status: users[id]?.status || 'offline',
          lastSeen: users[id]?.lastSeen || Date.now()
        }));
        io.to(roomId).emit('room_users', roomUsers);

        if (callback) {
          safeCallback(callback, {
            success: true,
            message: 'Joined successfully',
            room: { roomId }
          });
        }

      } catch (err) {
        console.error("JOIN ERROR:", err);
        if (callback) safeCallback(callback, { success: false, message: 'Server error while joining' });
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

        if (!messages[room]) {
          messages[room] = [];
        }
        messages[room].push(messageData);

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

    // ========================
    // STOP TYPING
    // ========================
    socket.on('stop_typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      socket.to(roomId).emit('user_stop_typing', {
        userId: socket.id,
        username: socket.username
      });
    });

    // ========================
    // USER STATUS
    // ========================
    const updateUserStatus = (socketId, status) => {
      const uId = Object.keys(users).find(key => users[key].socketId === socketId);
      if (uId && users[uId]) {
        users[uId].status = status;
        users[uId].lastSeen = Date.now();
        const roomId = users[uId].roomId;
        if (roomId && rooms[roomId]) {
          const roomUsers = rooms[roomId].map(id => ({
            id,
            username: users[id]?.userName || 'Unknown',
            status: users[id]?.status || 'offline',
            lastSeen: users[id]?.lastSeen || Date.now()
          }));
          io.to(roomId).emit('room_users', roomUsers);
        }
      }
    };

    socket.on("user_idle", () => {
      updateUserStatus(socket.id, "idle");
    });

    socket.on("user_active", () => {
      updateUserStatus(socket.id, "online");
    });

    // ========================
    // DISCONNECT
    // ========================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      updateUserStatus(socket.id, "offline");
    });
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