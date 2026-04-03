const rooms = new Map(); // roomId => Map(userId => userData)
let messages = {}; // roomId => []
const roomMeta = new Map(); // roomId => { creatorName, creatorId }



export function initializeSocket(io) {
  function emitRoomData(roomId) {
    if (!rooms.has(roomId)) return;
    const users = Array.from(rooms.get(roomId).values());

    const counts = {
      online: users.filter(u => u.status === "online").length,
      idle: users.filter(u => u.status === "idle").length,
      offline: users.filter(u => u.status === "offline").length,
      total: users.length
    };

    io.to(roomId).emit("room_data", {
      users,
      counts
    });
  }

  // 5. IDLE DETECTION
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((roomUsers, roomId) => {
      let changed = false;
      roomUsers.forEach((user, userId) => {
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
      roomMeta.set(roomId, {
        creatorName: name,
        creatorId: userId
      });
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
          rooms.set(roomId, new Map());
        }

        const roomUsers = rooms.get(roomId);

        roomUsers.set(userId, {
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

        // Ensure roomMeta gets created if it somehow doesn't exist yet (e.g. joined before create_room or API)
        if (!roomMeta.has(roomId)) {
          roomMeta.set(roomId, {
            creatorName: userName,
            creatorId: userId
          });
        }

        const meta = roomMeta.get(roomId);
        socket.emit("room_info", {
          creatorName: meta?.creatorName || "Unknown"
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
        const roomUsers = rooms.get(roomToUpdate);
        if (roomUsers.has(userId)) {
          const user = roomUsers.get(userId);
          user.lastSeen = Date.now();
          user.status = "online";
          emitRoomData(roomToUpdate);
        }
      }
    });

    socket.on("reconnect_user", ({ userId }) => {
      rooms.forEach((roomUsers, roomId) => {
        if (roomUsers.has(userId)) {
          const user = roomUsers.get(userId);
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
        const roomUsers = rooms.get(roomId);
        if (roomUsers.has(socket.userId)) {
          const user = roomUsers.get(socket.userId);
          user.status = "idle";
          user.lastSeen = Date.now();
          emitRoomData(roomId);
        }
      }
    });

    socket.on("user_active", () => {
      const roomId = socket.currentRoom;
      if (rooms.has(roomId)) {
        const roomUsers = rooms.get(roomId);
        if (roomUsers.has(socket.userId)) {
          const user = roomUsers.get(socket.userId);
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
      rooms.forEach((roomUsers, roomId) => {
        let changed = false;
        roomUsers.forEach((user, userId) => {
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