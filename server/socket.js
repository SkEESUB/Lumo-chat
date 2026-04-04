const rooms = new Map(); // roomId => { users: Map(userId => userData), creator: { userId, name } }
let messages = {}; // roomId => []

export function initializeSocket(io) {
  function emitRoomData(roomId) {
    if (!rooms.has(roomId)) return;
    const room = rooms.get(roomId);
    const users = Array.from(room.users.values());

    const counts = {
      online: users.filter(u => u.status === "online").length,
      idle: users.filter(u => u.status === "idle").length,
      offline: users.filter(u => u.status === "offline").length,
      total: users.length
    };

    io.to(roomId).emit("room_data", {
      users,
      counts,
      creator: room.creator
    });
  }

  // 5. IDLE DETECTION
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      let changed = false;
      room.users.forEach((user, userId) => {
        if (user.status === "online" && now - user.lastSeen > 60000) {
          user.status = "idle";
          changed = true;
        }
      });
      if (changed) {
        emitRoomData(roomId);
      }
    });
  }, 10000);

  io.on('connection', (socket) => {
    console.log(`🔥 User connected: ${socket.id}`);

    // ========================
    // CREATE ROOM
    // ========================
    socket.on("create_room", ({ roomId, userId, name }) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { userId, name }
        });
      } else {
        const room = rooms.get(roomId);
        room.creator = { userId, name };
      }
    });

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

        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            users: new Map(),
            creator: { userId, name: userName }
          });
        }

        const room = rooms.get(roomId);

        room.users.set(userId, {
          id: userId, // Match frontend expectations safely
          userId,
          username: userName, // match frontend mappings
          name: userName,
          status: "online",
          lastSeen: Date.now(),
          socketId: socket.id,
          roomId
        });

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = userName;
        socket.userId = userId;

        socket.emit("room_info", {
          creatorName: room.creator?.name || "Unknown"
        });

        const oldMessages = messages[roomId] || [];
        socket.emit("load_messages", oldMessages);

        io.to(roomId).emit("user_online", {
          userId,
          userName
        });

        console.log("✅ User joined:", userName, roomId);

        emitRoomData(roomId);

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
    socket.on("user_activity", ({ userId, roomId }) => {
      const roomToUpdate = roomId || socket.currentRoom;
      if (rooms.has(roomToUpdate)) {
        const room = rooms.get(roomToUpdate);
        if (room.users.has(userId)) {
          const user = room.users.get(userId);
          user.lastSeen = Date.now();
          user.status = "online";
          emitRoomData(roomToUpdate);
        }
      }
    });

    socket.on("reconnect_user", ({ userId }) => {
      rooms.forEach((room, roomId) => {
        if (room.users.has(userId)) {
          const user = room.users.get(userId);
          user.status = "online";
          user.socketId = socket.id;
          socket.join(roomId);
          socket.currentRoom = roomId;
          socket.username = user.name;
          socket.userId = userId;
          emitRoomData(roomId);
        }
      });
    });

    // Backwards compatibility
    socket.on("user_idle", () => {
      const roomId = socket.currentRoom;
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        if (room.users.has(socket.userId)) {
          const user = room.users.get(socket.userId);
          user.status = "idle";
          user.lastSeen = Date.now();
          emitRoomData(roomId);
        }
      }
    });

    socket.on("user_active", () => {
      const roomId = socket.currentRoom;
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        if (room.users.has(socket.userId)) {
          const user = room.users.get(socket.userId);
          user.status = "online";
          user.lastSeen = Date.now();
          emitRoomData(roomId);
        }
      }
    });

    // ========================
    // DISCONNECT
    // ========================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      rooms.forEach((room, roomId) => {
        let changed = false;
        room.users.forEach((user, userId) => {
          if (user.socketId === socket.id) {
            user.status = "offline";
            user.lastSeen = Date.now();
            changed = true;
          }
        });
        if (changed) {
          emitRoomData(roomId);
        }
      });
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