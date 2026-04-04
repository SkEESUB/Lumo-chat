const rooms = new Map();
let messages = {};

export function initializeSocket(io) {

  function emitRoomData(roomId) {
    if (!rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    const users = Array.from(room.users.values());

    const counts = {
      online: users.filter(u => u.status === "online").length,
      idle: users.filter(u => u.status === "idle").length,
      offline: users.filter(u => u.status === "offline").length
    };

    io.to(roomId).emit("room_data", {
      users,
      counts,
      creator: room.creator
    });
  }

  // IDLE DETECTION
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

      if (changed) emitRoomData(roomId);
    });

  }, 10000);


  io.on("connection", (socket) => {

    console.log("🔥 Connected:", socket.id);

    // ================= CREATE ROOM =================
    socket.on("create_room", ({ roomId, name }) => {
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { name } // set ONCE only
        });
      }
    });

    // ================= JOIN ROOM =================
    socket.on("join_room", ({ roomId, name }, callback) => {

      if (!roomId || !name) {
        return safeCallback(callback, { success: false });
      }

      // create room if not exists
      if (!rooms.has(roomId)) {
        rooms.set(roomId, {
          users: new Map(),
          creator: { name }
        });
      }

      const room = rooms.get(roomId);

      // 🔥 FIX: use socket.id (NOT userId)
      room.users.set(socket.id, {
        id: socket.id,
        name,
        status: "online",
        lastSeen: Date.now()
      });

      socket.join(roomId);
      socket.roomId = roomId;
      socket.username = name;

      // send creator
      socket.emit("room_info", {
        creatorName: room.creator?.name || "Unknown"
      });

      // load messages
      socket.emit("load_messages", messages[roomId] || []);

      emitRoomData(roomId);

      safeCallback(callback, { success: true });
    });


    // ================= SEND MESSAGE =================
    socket.on("send_message", (data = {}, callback) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const message = {
        id: generateId(),
        senderName: socket.username,
        text: data.text || "",
        fileUrl: data.fileUrl || null,
        timestamp: Date.now()
      };

      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push(message);

      io.to(roomId).emit("receive_message", message);

      safeCallback(callback, { success: true });
    });


    // ================= USER ACTIVITY =================
    socket.on("user_activity", () => {
      const roomId = socket.roomId;
      if (!rooms.has(roomId)) return;

      const user = rooms.get(roomId).users.get(socket.id);
      if (!user) return;

      user.lastSeen = Date.now();
      user.status = "online";

      emitRoomData(roomId);
    });


    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);

      rooms.forEach((room, roomId) => {
        if (room.users.has(socket.id)) {
          const user = room.users.get(socket.id);
          user.status = "offline";
          user.lastSeen = Date.now();

          emitRoomData(roomId);
        }
      });
    });

  });
}


// ================= HELPERS =================
function safeCallback(cb, data) {
  if (typeof cb === "function") cb(data);
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}