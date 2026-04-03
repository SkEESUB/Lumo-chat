// Replace roomManager to implement persistent messages and rooms
const users = new Map(); // key: userId, value: { name, status, lastSeen, socketId, roomId }
let messages = {}; // roomId => []
let roomCreators = {}; // roomId => userName

function getRoomUsers(roomId) {
  return Array.from(users.values()).filter(u => u.roomId === roomId).map(u => ({
    id: u.userId, // keep payload compatible with frontend which expects `id`
    username: u.name,
    status: u.status,
    lastSeen: u.lastSeen
  }));
}

// 5. IDLE DETECTION
setInterval(() => {
  const now = Date.now();
  users.forEach(user => {
    if (user.status === "online" && now - user.lastSeen > 60000) {
      user.status = "idle";
      // Need to inform room wait: 
      // User prompt doesn't say if setInterval should emit, but it makes sense to.
      // But user prompt simply says: 
      /*
      users.forEach(user => {
        if (user.status === "online" && now - user.lastSeen > 60000) {
          user.status = "idle";
        }
      });
      */
    }
  });
}, 10000);

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

        if (!roomCreators[roomId]) {
          roomCreators[roomId] = userName;
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = userName;
        socket.userId = userId;

        users.set(userId, {
          userId, // keep a copy inside
          name: userName,
          status: "online",
          lastSeen: Date.now(),
          socketId: socket.id,
          roomId
        });

        const oldMessages = messages[roomId] || [];
        socket.emit("load_messages", oldMessages);

        io.to(roomId).emit("user_online", {
          userId,
          userName
        });

        console.log("✅ User joined:", userName, roomId);

        // Send updated user list
        const roomUsers = getRoomUsers(roomId);
        io.to(roomId).emit('user_list', roomUsers);

        if (callback) {
          safeCallback(callback, {
            success: true,
            message: 'Joined successfully',
            room: { roomId, creator: roomCreators[roomId] }
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
    socket.on("user_activity", ({ userId }) => {
      if (users.has(userId)) {
        const user = users.get(userId);
        user.lastSeen = Date.now();
        user.status = "online";
        io.to(user.roomId).emit('user_list', getRoomUsers(user.roomId));
      }
    });

    socket.on("reconnect_user", ({ userId }) => {
      if (users.has(userId)) {
        const user = users.get(userId);
        user.status = "online";
        user.socketId = socket.id;
        socket.join(user.roomId);
        socket.currentRoom = user.roomId;
        socket.username = user.name;
        socket.userId = userId;
        io.to(user.roomId).emit('user_list', getRoomUsers(user.roomId));
      }
    });

    // Backwards compatibility with previous events (just to be safe)
    socket.on("user_idle", () => {
      if (users.has(socket.userId)) {
        const user = users.get(socket.userId);
        user.status = "idle";
        user.lastSeen = Date.now();
        io.to(user.roomId).emit('user_list', getRoomUsers(user.roomId));
      }
    });

    socket.on("user_active", () => {
      if (users.has(socket.userId)) {
        const user = users.get(socket.userId);
        user.status = "online";
        user.lastSeen = Date.now();
        io.to(user.roomId).emit('user_list', getRoomUsers(user.roomId));
      }
    });

    // ========================
    // DISCONNECT
    // ========================
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
      for (let [userId, user] of users.entries()) {
        if (user.socketId === socket.id) {
          user.status = "offline";
          user.lastSeen = Date.now();
          io.to(user.roomId).emit('user_list', getRoomUsers(user.roomId));
        }
      }
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