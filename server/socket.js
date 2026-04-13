import { roomManager } from './roomManager.js';
import { sendPushNotification } from './notifications.js';

const usersBySocket = new Map();

// Track FCM tokens globally by userId -> { token, username }
const fcmTokensByUserId = new Map();

export function initializeSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    socket.on('create_room', (payload, callback) => {
      try {
        const { username } = payload || {};
        const room = roomManager.createRoom();

        safeCallback(callback, {
          success: true,
          roomId: room.roomId,
          code: room.code,
        });
      } catch (err) {
        safeCallback(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('join_room', (payload, callback) => {
      try {
        const { roomId, userId, name } = payload || {};

        if (!roomId || !name) {
          return safeCallback(callback, { success: false, message: 'Missing roomId or username' });
        }

        const finalUserId = userId || socket.id;
        
        for (const [sId, uData] of usersBySocket.entries()) {
          if (uData.userId === finalUserId && sId !== socket.id) {
             usersBySocket.delete(sId);
          }
        }

        const res = roomManager.joinRoom(roomId, null, {
          id: finalUserId,
          username: name,
          socketId: socket.id
        });

        if (!res.success) {
          return safeCallback(callback, res);
        }

        socket.join(roomId);
        socket.currentRoom = roomId;
        socket.username = name;
        socket.visitorId = finalUserId;

        usersBySocket.set(socket.id, {
          socketId: socket.id,
          userId: finalUserId,
          userName: name,
          roomId,
          status: 'online',
          lastSeen: Date.now()
        });

        socket.to(roomId).emit('user_joined', {
          id: finalUserId,
          username: name,
          message: `${name} joined the chat`,
          timestamp: Date.now(),
        });

        broadcastRoomData(io, roomId);

        const history = roomManager.getRoomMessages(roomId);
        socket.emit('load_messages', history);

        safeCallback(callback, { success: true, message: 'Joined successfully' });

      } catch (err) {
        safeCallback(callback, { success: false, message: 'Server error' });
      }
    });

    socket.on('send_message', (data = {}, callback) => {
      try {
        const room = socket.currentRoom;
        if (!room) return;

        if (!data.text && !data.fileUrl) {
          return safeCallback(callback, { success: false, message: 'Empty message' });
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
          replyTo: data.replyTo || null,
          status: 'sent',
          timestamp: Date.now(),
        };

        roomManager.addMessage(room, messageData);
        io.to(room).emit('receive_message', messageData);

        safeCallback(callback, { success: true, messageId: messageData.id });

      } catch (err) {
        console.error('❌ send_message error:', err);
      }
    });

    socket.on('message_delivered', ({ messageId, roomId }) => {
      if (messageId && roomId) io.to(roomId).emit('update_status', { messageId, status: 'delivered' });
    });

    socket.on('message_seen', ({ messageId, roomId }) => {
      if (messageId && roomId) io.to(roomId).emit('update_status', { messageId, status: 'seen' });
    });

    socket.on('typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', { userId: socket.visitorId || socket.id, username: socket.username });
    });

    socket.on('stop_typing', (roomId) => {
      if (!roomId) roomId = socket.currentRoom;
      if (!roomId) return;
      socket.to(roomId).emit('user_stop_typing', { userId: socket.visitorId || socket.id, username: socket.username });
    });

    socket.on('user_idle', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'idle';
        user.lastSeen = Date.now();
        broadcastRoomData(io, user.roomId);
      }
    });

    socket.on('user_active', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'online';
        user.lastSeen = Date.now();
        broadcastRoomData(io, user.roomId);
      }
    });

    socket.on('user_activity', () => {
      const user = usersBySocket.get(socket.id);
      if (user) {
        user.status = 'online';
        user.lastSeen = Date.now();
      }
    });

    socket.on('register_fcm_token', ({ token }) => {
      const visitorId = socket.visitorId || socket.id;
      if (!token) return;

      fcmTokensByUserId.set(visitorId, { token, username: socket.username });
    });

    socket.on('notify_user', (payload, callback) => {
      const room = socket.currentRoom;
      if (!room) {
        return safeCallback(callback, { success: false, message: 'Not in a room' });
      }

      const senderName = socket.username || 'Someone';
      const title = payload?.title || `${senderName} is online`;
      const body = payload?.body || 'Tap to join chat';
      const link = payload?.link || `https://lumo-chat.vercel.app/room/${room}`;

      const roomUsers = roomManager.getRoomUsers(room);
      const visitorId = socket.visitorId || socket.id;

      let sent = 0;
      const promises = [];

      for (const u of roomUsers) {
        if (u.id === visitorId) continue;
        
        const fcmData = fcmTokensByUserId.get(u.id);
        if (fcmData && fcmData.token) {
           promises.push(
             sendPushNotification(fcmData.token, title, body, link).then((res) => {
               if (res.success) sent++;
             })
           );
        }
      }

      Promise.all(promises).then(() => {
        safeCallback(callback, { success: true, notified: sent });
      });
    });

    socket.on('leave_room', () => {
       // Only trigger when explicit leave intended
       handleExplicitLeave(socket, io);
    });

    socket.on('disconnect', () => {
      setTimeout(() => {
        if (!usersBySocket.has(socket.id)) return;
        handleDisconnectSafely(socket, io);
      }, 5000);
    });
  });
}

function handleExplicitLeave(socket, io) {
  const room = socket.currentRoom;
  if (!room) return;

  const finalUserId = socket.visitorId || socket.id;
  roomManager.leaveRoom(room, finalUserId);

  socket.to(room).emit('user_left', {
    id: finalUserId,
    username: socket.username,
    message: `${socket.username} left the chat`,
    timestamp: Date.now(),
  });

  usersBySocket.delete(socket.id);
  broadcastRoomData(io, room);
  
  socket.leave(room);
  socket.currentRoom = null;
}

function handleDisconnectSafely(socket, io) {
    const room = socket.currentRoom;
    if (!room) return;

    const finalUserId = socket.visitorId || socket.id;
    
    let hasReconnected = false;
    for (const [sId, uData] of usersBySocket.entries()) {
       if (uData.userId === finalUserId && sId !== socket.id) {
           hasReconnected = true;
           break;
       }
    }
    
    if (!hasReconnected) {
      // Do NOT erase the room session completely to support reconnection.
      // But update status.
      const u = usersBySocket.get(socket.id);
      if (u) {
         u.status = 'offline';
         u.lastSeen = Date.now();
      }
      broadcastRoomData(io, room);
    }
    
    // Always clear the socket connection tracking
    usersBySocket.delete(socket.id);
}

function broadcastRoomData(io, roomId) {
  if (!roomId) return;

  const roomUsers = roomManager.getRoomUsers(roomId);

  const usersWithStatus = roomUsers.map((u) => {
    let status = 'offline';
    let lastSeen = null;
    
    for (const [, tracked] of usersBySocket) {
      if (tracked.userId === u.id && tracked.roomId === roomId) {
        status = tracked.status || 'online';
        lastSeen = tracked.lastSeen;
        break;
      }
    }
    return {
      id: u.id,
      username: u.username,
      status: status,
      lastSeen: lastSeen
    };
  });

  const online = usersWithStatus.filter((u) => u.status === 'online').length;
  const idle = usersWithStatus.filter((u) => u.status === 'idle').length;
  const total = usersWithStatus.length;

  io.to(roomId).emit('room_data', {
    users: usersWithStatus,
    counts: { online, idle, offline: total - online - idle, total },
  });
}

function safeCallback(cb, data) {
  if (typeof cb === 'function') {
    cb(data);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}
