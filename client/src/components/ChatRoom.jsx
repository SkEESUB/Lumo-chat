import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from '../services/socket';
import { requestNotificationPermission, onForegroundMessage } from '../services/firebase';

// Components
import ChatLayout from './chat/ChatLayout';
import Header from './chat/Header';
import RoomInfoPanel from './chat/RoomInfoPanel';
import MessagesList from './chat/MessagesList';
import MessageInput from './chat/MessageInput';
import LoadingScreen from './chat/LoadingScreen';

export default function ChatRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};

  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("userId", userId);
  }

  let userName = state.username || localStorage.getItem("userName");

  if (!userName) {
    userName = prompt("Enter your name") || "Guest";
  }

  localStorage.setItem("userName", userName);

  const [username] = useState(userName);
  const [code] = useState(state.code || '');

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [roomCreator, setRoomCreator] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [counts, setCounts] = useState({ online: 0, idle: 0, offline: 0, total: 0 });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [recentActiveUsers, setRecentActiveUsers] = useState(new Set());

  // UI State
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const typingTimeoutRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Push notification state
  const [notifyStatus, setNotifyStatus] = useState('idle'); // idle | sending | sent

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Handle Visibility Change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!socket.connected) return;
      if (document.hidden) {
        socket.emit("user_idle");
      } else {
        socket.emit("user_active");
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Send activity ping
  useEffect(() => {
    if (!socket || !userId) return;
    const activityInterval = setInterval(() => {
      if (socket.connected && !document.hidden) {
        socket.emit("user_activity", { userId });
      }
    }, 15000);
    return () => clearInterval(activityInterval);
  }, [userId]);

  // Initial connection and Room Join
  useEffect(() => {
    if (!username) {
      navigate('/');
      return;
    }

    connectSocket();

    const tryJoin = () => {
      if (hasJoinedRef.current) return;

      if (!roomId || !userId || !username) {
        console.log("❌ Missing join data", { roomId, userId, name: username });
        return;
      }

      localStorage.setItem("roomId", roomId);

      console.log("JOIN DATA:", { roomId, userId, name: username });
      console.log("✅ Joining room:", { roomId, userId, name: username });

      hasJoinedRef.current = true;

      socket.emit('join_room', { roomId, userId, name: username }, (res) => {
        if (res && (res.success || res.message === 'User already in room')) {
          socket.currentRoom = roomId;
          setIsConnected(true);
        } else if (res) {
          setError(res.message);
          setTimeout(() => navigate('/'), 3000);
        }
      });
    };

    if (socket.connected) {
      setIsConnected(true);
      tryJoin();
    }

    const onConnect = () => {
      setIsConnected(true);
      hasJoinedRef.current = false; // Reset to allow rejoin
      tryJoin();
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', () => {
      setIsConnected(false);
      hasJoinedRef.current = false;
    });

    const onLoadMessages = (msgs) => {
      if (msgs && Array.isArray(msgs)) {
        setMessages(prev => {
          const map = new Map(prev.map(m => [m.id, m]));
          msgs.forEach(m => map.set(m.id, m));
          return Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);
        });
      }
    };

    const onReceiveMessage = (data) => {
      if (!data) return;

      if (data.text && data.text.startsWith('REACT:')) {
        const [, emoji, targetMsgId] = data.text.split(':');
        setMessages((prev) => prev.map(m => m.id === targetMsgId ? {
          ...m,
          reactions: [...(m.reactions || []), { emoji, senderId: data.senderId, senderName: data.senderName }]
        } : m));
        return;
      }
      setMessages((prev) => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      if (document.hidden && "Notification" in window && Notification.permission === "granted" && data.senderId !== userId && data.text) {
        new Notification("New Message", {
          body: data.text
        });
      }

      // Trigger delivered status
      if (data.senderId !== userId && data.roomId) {
        socket.emit("message_delivered", {
          messageId: data.id,
          roomId: data.roomId
        });
      }

      if (data.senderName) {
        setRecentActiveUsers((prev) => {
          const next = new Set(prev);
          next.add(data.senderName);
          return next;
        });
        setTimeout(() => {
          setRecentActiveUsers((prev) => {
            const next = new Set(prev);
            next.delete(data.senderName);
            return next;
          });
        }, 5000);
      }
    };

    const onUserJoined = (data) => setMessages((prev) => [...prev, { ...data, type: 'system' }]);
    const onUserLeft = (data) => setMessages((prev) => [...prev, { ...data, type: 'system' }]);

    const onRoomData = (data) => {
      if (!data) return;
      setOnlineUsers(data.users || []);
      setCounts(data.counts || { online: 0, idle: 0, offline: 0, total: 0 });
      if (data.creator && data.creator.name) setRoomCreator(data.creator.name);
    };

    const onUserTyping = ({ username: typingUsername }) => {
      setTypingUsers((prev) => new Set(prev).add(typingUsername));
    };

    const onUserStopTyping = ({ username: typingUsername }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(typingUsername);
        return next;
      });
    };

    const onUpdateStatus = ({ messageId, status }) => {
      setMessages((prev) => prev.map(msg => msg.id === messageId ? { ...msg, status } : msg));
    };

    const onUserOnline = ({ userId, userName }) => {
      console.log(userName + " is online");
    };

    const onUserOffline = ({ userId }) => {
      console.log(userId + " is offline");
    };

    const onRoomInfo = (data) => {
      if (data) setRoomCreator(data.creatorName);
    };

    socket.on('load_messages', onLoadMessages);
    socket.on('receive_message', onReceiveMessage);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('room_data', onRoomData);
    socket.on('user_typing', onUserTyping);
    socket.on('user_stop_typing', onUserStopTyping);
    socket.on('update_status', onUpdateStatus);
    socket.on('room_info', onRoomInfo);
    socket.on('user_online', onUserOnline);
    socket.on('user_offline', onUserOffline);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('load_messages', onLoadMessages);
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('room_data', onRoomData);
      socket.off('user_typing', onUserTyping);
      socket.off('user_stop_typing', onUserStopTyping);
      socket.off('update_status', onUpdateStatus);
      socket.off('room_info', onRoomInfo);
      socket.off('user_online', onUserOnline);
      socket.off('user_offline', onUserOffline);
    };
  }, [roomId, code, username, navigate, userId]);

  // Register FCM token after connecting to room
  useEffect(() => {
    if (!isConnected) return;

    const registerFcm = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token && socket.connected) {
          socket.emit('register_fcm_token', { token });
          console.log('🔔 FCM token sent to server');
        }
      } catch (err) {
        // Silently fail — notifications are optional
        console.log('🔕 Push notifications not available');
      }
    };

    registerFcm();
  }, [isConnected]);

  // Handle foreground push notifications
  useEffect(() => {
    const unsubscribe = onForegroundMessage((payload) => {
      // Show as in-app notification if the message is from another room or user
      if (payload?.notification) {
        const { title, body } = payload.notification;
        // Use native Notification API for foreground too
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title || 'Lumo Chat', { body: body || '' });
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handle "message seen" logic dynamically based on messages rendered
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg.senderId !== userId && msg.status !== "seen" && msg.type === 'chat') {
        socket.emit("message_seen", {
          messageId: msg.id,
          roomId: msg.roomId || roomId
        });
      }
    });
  }, [messages, roomId, userId]);

  const copyRoomDetails = () => {
    const text = `Join my secure Lumo\nRoom ID: ${roomId}\nPIN: ${code}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    socket.emit("leave_room", { roomId, userId });
    disconnectSocket();
    navigate('/');
  };

  // Push notify all others in room
  const handleNotify = () => {
    if (!socket.connected) return;

    setNotifyStatus('sending');

    socket.emit('notify_room', {
      title: `${username} is online`,
      body: 'Tap to join chat',
      link: `https://lumo-chat.vercel.app/room/${roomId}`,
    }, (res) => {
      if (res?.success) {
        setNotifyStatus('sent');
        console.log(`🔔 Notified ${res.notified} user(s)`);
      } else {
        setNotifyStatus('idle');
        console.log('🔕 Notify failed:', res?.message);
      }
      setTimeout(() => setNotifyStatus('idle'), 3000);
    });
  };

  const reactToMessage = (messageId, emoji) => {
    socket.emit('send_message', { text: `REACT:${emoji}:${messageId}` }, () => { });
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    socket.emit('typing', roomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', roomId);
    }, 2000);
  };

  const handleReply = (msg) => {
    setReplyTo({ 
      messageId: msg.id, 
      senderName: msg.senderName || 'Unknown', 
      text: msg.text && msg.text !== msg.fileUrl ? msg.text : 'Attachment' 
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_message', { 
      text: inputMessage,
      replyTo: replyTo 
    }, () => { });
    
    setInputMessage('');
    setReplyTo(null);
    socket.emit('stop_typing', roomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "chat_upload");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dfdhdccgw/auto/upload",
        { method: "POST", body: formData }
      );
      if (!response.ok) {
        console.error("🚨 CLOUDINARY ERROR:", await response.text());
        throw new Error("Upload failed");
      }
      const data = await response.json();
      return data.secure_url;
    } catch (err) {
      alert("Failed to upload file. Please try again.");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("File is too large! Maximum 10MB allowed.");
      e.target.value = null;
      return;
    }

    const fileURL = await uploadFile(file);
    if (fileURL) {
      socket.emit("send_message", {
        roomId,
        text: "",
        type: "file",
        fileUrl: fileURL,
        fileType: file.type.startsWith("image/") ? "image" : "file",
        replyTo: replyTo
      }, () => { });
      
      setReplyTo(null);
    }
    e.target.value = null;
  };

  if (!isConnected && !error) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <ChatLayout>
        <div className="flex-1 flex items-center justify-center text-red-400 font-medium z-10 p-6">
          <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl flex items-center gap-3 backdrop-blur-md">
            <span>{error}</span>
          </div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <div className="chat-wrapper">
      <Header
        roomId={roomId}
        counts={counts}
        onInfoClick={() => setShowInfoPanel(true)}
        onLeaveRoom={leaveRoom}
        onNotify={handleNotify}
        notifyStatus={notifyStatus}
      />

      <MessagesList
        messages={messages}
        socketId={socket.id}
        onReact={reactToMessage}
        onReply={handleReply}
        typingUsers={typingUsers}
        username={username}
        userId={userId}
      />

      <MessageInput
        inputMessage={inputMessage}
        onInputChange={handleTyping}
        onSendMessage={sendMessage}
        onFileChange={handleFileChange}
        isUploading={isUploading}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />

      <div className="footer-brand">
        Powered by Eesub Labs
      </div>

      <RoomInfoPanel
        isOpen={showInfoPanel}
        onClose={() => setShowInfoPanel(false)}
        roomId={roomId}
        code={code}
        copied={copied}
        onCopy={copyRoomDetails}
        onlineUsers={onlineUsers}
        typingUsers={typingUsers}
        recentActiveUsers={recentActiveUsers}
        socketId={socket.id}
        onLeave={leaveRoom}
        isConnected={isConnected}
        roomCreator={roomCreator}
      />
    </div>
  );
}
