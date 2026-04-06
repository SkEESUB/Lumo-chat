const rooms = new Map(); // roomId => { users: Map(userId => userData), creator: { userId, name } }
const messages = {}; // roomId => []
const socketToUser = new Map(); // socketId => { userId, roomId }

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
      creator: room.creator || null
    });
  }

  // Idle detection — marks users idle after 60s of no activity
  // Does NOT emit user_left or remove users
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      let changed = false;
      room.users.forEach((user) => {
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
    console.log(`[CONNECT] ${socket.id}`);

    // ========================
    // CREATE ROOM
    // ========================
    socket.on("create_room", ({ roomId, userId, name }) => {
      if (!roomId || !userId || !name) return;
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { userId, name }
        });
        console.log(`[CREATE] Room ${roomId} by ${name}`);
      }
    });

    // ========================
    // JOIN ROOM
    // ========================
    socket.on('join_room', (data, callback) => {
      try {
        const { roomId, userId, name } = data || {};

        if (!roomId || !userId || !name) {
          console.log("[JOIN] Invalid data:", data);
          if (callback) return safeCallback(callback, { success: false, message: 'Invalid data' });
          return;
        }

        // Create room if it doesn't exist yet
        if (!rooms.has(roomId)) {
          rooms.set(roomId, {
            users: new Map(),
            creator: { userId, name }
          });
        }

        const room = rooms.get(roomId);

        // Fix creator if it's missing or was "Unknown"
        if (!room.creator || !room.creator.name || room.creator.name === "Unknown") {
          room.creator = { userId, name };
        }

        // Track whether this is a brand-new user (never joined before)
        const isNewJoin = !room.users.has(userId);

        // Store/update user data — always update socketId for reconnects
        room.users.set(userId, {
          id: userId,
          userId,
          username: name,
          name,
          status: "online",
          lastSeen: Date.now(),
          socketId: socket.id,
          roomId
        });

        // Map this socket to the user for disconnect handling
        socketToUser.set(socket.id, { userId, roomId });

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = name;
        socket.userId = userId;

        // Send room creator info to the joining client
        socket.emit("room_info", {
          creatorName: room.creator.name || name
        });

        // Send existing messages to the joining client
        const oldMessages = messages[roomId] || [];
        socket.emit("load_messages", oldMessages);

        // Notify everyone that this user is online
        io.to(roomId).emit("user_online", {
          userId,
          username: name
        });

        // Only show "joined" system message for first-time joins
        if (isNewJoin) {
          io.to(roomId).emit("user_joined", {
            id: generateId(),
            message: `${name} has joined the chat`
          });
        }

        console.log(`[JOIN] ${name} -> ${roomId} (new: ${isNewJoin})`);

        emitRoomData(roomId);

        if (callback) {
          safeCallback(callback, {
            success: true,
            message: 'Joined successfully',
            room: { roomId }
          });
        }

      } catch (err) {
        console.error("[JOIN ERROR]", err);
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

        // Require at least some content
        if (!data.text && !data.fileUrl && !data.message) {
          return safeCallback(callback, {
            success: false,
            message: 'Empty message',
          });
        }

        const messageData = {
          id: generateId(),
          senderId: socket.userId || data.userId || 'unknown',
          senderName: socket.username || data.senderName || 'Unknown',
          roomId: room,
          text: data.text || '',
          fileUrl: data.fileUrl || null,
          fileType: data.fileType || null,
          type: data.type || 'chat',
          status: 'sent',
          timestamp: Date.now(),
        };

        if (!messages[room]) {
          messages[room] = [];
        }
        messages[room].push(messageData);

        io.to(room).emit('receive_message', messageData);

        console.log(`[MSG] ${socket.username}: ${messageData.text || '[file]'}`);

        safeCallback(callback, {
          success: true,
          messageId: messageData.id,
        });

      } catch (err) {
        console.error('[MSG ERROR]', err);
      }
    });

    // ========================
    // MESSAGE STATUS
    // ========================
    socket.on('message_delivered', ({ messageId, roomId }) => {
      if (roomId) io.to(roomId).emit('update_status', { messageId, status: 'delivered' });
    });

    socket.on('message_seen', ({ messageId, roomId }) => {
      if (roomId) io.to(roomId).emit('update_status', { messageId, status: 'seen' });
    });

    // ========================
    // TYPING
    // ========================
    socket.on('typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (roomId) {
        socket.to(roomId).emit('user_typing', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    socket.on('stop_typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (roomId) {
        socket.to(roomId).emit('user_stop_typing', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // ========================
    // USER STATUS (activity, idle, active)
    // ========================
    socket.on("user_activity", ({ userId, roomId }) => {
      const roomToUpdate = roomId || socket.currentRoom;
      if (!roomToUpdate || !rooms.has(roomToUpdate)) return;
      const room = rooms.get(roomToUpdate);
      const uid = userId || socket.userId;
      if (room.users.has(uid)) {
        const user = room.users.get(uid);
        user.lastSeen = Date.now();
        if (user.status !== "online") {
          user.status = "online";
          emitRoomData(roomToUpdate);
        }
      }
    });

    socket.on("user_idle", () => {
      const roomId = socket.currentRoom;
      if (!roomId || !rooms.has(roomId)) return;
      const room = rooms.get(roomId);
      if (room.users.has(socket.userId)) {
        const user = room.users.get(socket.userId);
        if (user.status !== "idle") {
          user.status = "idle";
          user.lastSeen = Date.now();
          emitRoomData(roomId);
        }
      }
    });

    socket.on("user_active", () => {
      const roomId = socket.currentRoom;
      if (!roomId || !rooms.has(roomId)) return;
      const room = rooms.get(roomId);
      if (room.users.has(socket.userId)) {
        const user = room.users.get(socket.userId);
        if (user.status !== "online") {
          user.status = "online";
          user.lastSeen = Date.now();
          emitRoomData(roomId);
        }
      }
    });

    // ========================
    // LEAVE ROOM (explicit)
    // ========================
    socket.on("leave_room", (data) => {
      const roomId = data?.roomId || socket.currentRoom;
      const userId = data?.userId || socket.userId;

      if (!roomId || !userId) return;

      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        if (room.users.has(userId)) {
          const user = room.users.get(userId);
          const userName = user.name || user.username || 'Someone';

          // Remove user completely on explicit leave
          room.users.delete(userId);
          socketToUser.delete(socket.id);

          io.to(roomId).emit("user_left", {
            id: generateId(),
            message: `${userName} has left the chat`
          });

          emitRoomData(roomId);

          // Clean up empty rooms
          if (room.users.size === 0) {
            rooms.delete(roomId);
            delete messages[roomId];
            console.log(`[CLEANUP] Room ${roomId} deleted (empty)`);
          }
        }
      }
    });

    // ========================
    // DISCONNECT (socket drop — NOT explicit leave)
    // Marks user as offline, does NOT remove them or emit "left"
    // ========================
    socket.on('disconnect', () => {
      console.log(`[DISCONNECT] ${socket.id}`);

      const mapping = socketToUser.get(socket.id);
      socketToUser.delete(socket.id);

      if (mapping) {
        const { userId, roomId } = mapping;
        if (rooms.has(roomId)) {
          const room = rooms.get(roomId);
          if (room.users.has(userId)) {
            const user = room.users.get(userId);
            // Only mark offline if this socket is still the active one for this user
            if (user.socketId === socket.id) {
              user.status = "offline";
              user.lastSeen = Date.now();
              emitRoomData(roomId);
              io.to(roomId).emit("user_offline", { userId });
            }
          }
        }
      }
    });
  });
}

function safeCallback(cb, data) {
  if (typeof cb === 'function') {
    try { cb(data); } catch (e) { /* ignore callback errors */ }
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}