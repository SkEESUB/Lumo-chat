const rooms = new Map(); // roomId => { users: Map(), creator }
let messages = {};

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

  // Idle detection
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room, roomId) => {
      let changed = false;

      room.users.forEach(user => {
        if (user.status === "online" && now - user.lastSeen > 60000) {
          user.status = "idle";
          changed = true;
        }
      });

      if (changed) emitRoomData(roomId);
    });
  }, 10000);

  io.on("connection", (socket) => {

    // CREATE ROOM
    socket.on("create_room", ({ roomId, userId, name }) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { userId, name }
        });
      }
    });

    // JOIN ROOM
    socket.on("join_room", ({ roomId, userId, name }, callback) => {

      if (!roomId || !userId || !name) {
        return callback?.({ success: false, message: "Invalid join data" });
      }

      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { userId, name }
        });
      }

      const room = rooms.get(roomId);

      room.users.set(userId, {
        userId,
        name,
        status: "online",
        lastSeen: Date.now(),
        socketId: socket.id
      });

      socket.join(roomId);
      socket.currentRoom = roomId;
      socket.userId = userId;
      socket.username = name;

      socket.emit("room_info", {
        creatorName: room.creator?.name || "Unknown"
      });

      socket.emit("load_messages", messages[roomId] || []);

      emitRoomData(roomId);

      callback?.({ success: true });
    });

    // SEND MESSAGE
    socket.on("send_message", (data) => {
      const roomId = socket.currentRoom;
      if (!roomId) return;

      const message = {
        id: Date.now().toString(),
        senderId: socket.userId,
        senderName: socket.username,
        text: data.text || "",
        fileUrl: data.fileUrl || null,
        fileType: data.fileType || null,
        roomId,
        status: "sent",
        timestamp: Date.now()
      };

      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push(message);

      io.to(roomId).emit("receive_message", message);
    });

    // ACTIVITY
    socket.on("user_activity", ({ userId, roomId }) => {
      if (!rooms.has(roomId)) return;

      const room = rooms.get(roomId);
      const user = room.users.get(userId);

      if (user) {
        user.status = "online";
        user.lastSeen = Date.now();
        emitRoomData(roomId);
      }
    });

    // DISCONNECT
    socket.on("disconnect", () => {
      rooms.forEach((room, roomId) => {
        room.users.forEach(user => {
          if (user.socketId === socket.id) {
            user.status = "offline";
            user.lastSeen = Date.now();
          }
        });
        emitRoomData(roomId);
      });
    });
  });
}