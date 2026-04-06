import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { socket, connectSocket, disconnectSocket } from '../services/socket';

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

  // ========================================
  // 1. PERSISTENT USER IDENTITY (localStorage)
  // ========================================
  const userIdRef = useRef(null);
  const userNameRef = useRef(null);

  if (!userIdRef.current) {
    let storedUserId = localStorage.getItem("userId");
    if (!storedUserId) {
      storedUserId = crypto.randomUUID();
      localStorage.setItem("userId", storedUserId);
    }
    userIdRef.current = storedUserId;
  }

  if (!userNameRef.current) {
    // Priority: route state > localStorage > prompt
    let name = state.username || localStorage.getItem("userName");
    if (!name) {
      name = prompt("Enter your name") || "Guest";
    }
    localStorage.setItem("userName", name);
    userNameRef.current = name;
  }

  const userId = userIdRef.current;
  const username = userNameRef.current;

  const [code] = useState(state.code || '');

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
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

  // Request Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "denied") {
      Notification.requestPermission();
    }
  }, []);

  // Handle Visibility Change (idle/active)
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

  // Send activity ping every 15s (keeps user "online" on server)
  useEffect(() => {
    if (!userId) return;
    const activityInterval = setInterval(() => {
      if (socket.connected && !document.hidden) {
        socket.emit("user_activity", { userId });
      }
    }, 15000);
    return () => clearInterval(activityInterval);
  }, [userId]);

  // ========================================
  // MAIN SOCKET LIFECYCLE — connect, join, listeners
  // ========================================
  useEffect(() => {
    if (!username) {
      navigate('/');
      return;
    }

    connectSocket();

    const tryJoin = () => {
      if (hasJoinedRef.current) return;
      if (!roomId || !userId || !username) return;

      localStorage.setItem("roomId", roomId);
      hasJoinedRef.current = true;

      socket.emit('join_room', { roomId, userId, name: username }, (res) => {
        if (res && (res.success || res.message === 'User already in room')) {
          socket.currentRoom = roomId;
          setIsConnected(true);
        } else if (res) {
          setError(res.message || 'Failed to join room');
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
      hasJoinedRef.current = false; // Allow rejoin on reconnect
      tryJoin();
    };

    const onDisconnect = () => {
      setIsConnected(false);
      hasJoinedRef.current = false;
    };

    // ========================
    // MESSAGE HANDLERS
    // ========================
    const onLoadMessages = (msgs) => {
      if (!Array.isArray(msgs)) return;
      setMessages(prev => {
        const currentIds = new Set(prev.map(m => m.id));
        const newMsgs = msgs.filter(m => m && m.id && !currentIds.has(m.id));
        if (newMsgs.length === 0) return prev;
        return [...prev, ...newMsgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      });
    };

    const onReceiveMessage = (data) => {
      if (!data || !data.id) return;

      // Handle reactions encoded as REACT:emoji:targetMsgId
      if (data.text && data.text.startsWith('REACT:')) {
        const parts = data.text.split(':');
        if (parts.length >= 3) {
          const emoji = parts[1];
          const targetMsgId = parts[2];
          setMessages(prev => prev.map(m => m.id === targetMsgId ? {
            ...m,
            reactions: [...(m.reactions || []), { emoji, senderId: data.senderId, senderName: data.senderName }]
          } : m));
        }
        return;
      }

      // Add message only if not already present (prevent duplicates)
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      // Browser notification for messages from others when tab is hidden
      if (document.hidden && "Notification" in window && Notification.permission === "granted" && data.senderId !== userId && data.text) {
        new Notification("New Message", { body: data.text });
      }

      // Trigger delivered status for messages from others
      if (data.senderId !== userId && data.roomId) {
        socket.emit("message_delivered", {
          messageId: data.id,
          roomId: data.roomId
        });
      }

      // Track recently active users for the glow effect
      if (data.senderName) {
        setRecentActiveUsers(prev => {
          const next = new Set(prev);
          next.add(data.senderName);
          return next;
        });
        setTimeout(() => {
          setRecentActiveUsers(prev => {
            const next = new Set(prev);
            next.delete(data.senderName);
            return next;
          });
        }, 5000);
      }
    };

    const onUserJoined = (data) => {
      if (!data) return;
      setMessages(prev => [...prev, { ...data, type: 'system' }]);
    };

    const onUserLeft = (data) => {
      if (!data) return;
      setMessages(prev => [...prev, { ...data, type: 'system' }]);
    };

    const onRoomData = (data) => {
      if (!data) return;
      setOnlineUsers(data.users || []);
      setCounts(data.counts || { online: 0, idle: 0, offline: 0, total: 0 });
      if (data.creator && data.creator.name) {
        setRoomCreator(data.creator.name);
      }
    };

    const onUserTyping = ({ username: typingUsername }) => {
      if (!typingUsername) return;
      setTypingUsers(prev => new Set(prev).add(typingUsername));
    };

    const onUserStopTyping = ({ username: typingUsername }) => {
      if (!typingUsername) return;
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(typingUsername);
        return next;
      });
    };

    const onUpdateStatus = ({ messageId, status }) => {
      if (!messageId || !status) return;
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, status } : msg));
    };

    const onUserOnline = ({ userId: uid, username: uname }) => {
      // Logged for debugging
    };

    const onUserOffline = ({ userId: uid }) => {
      // Logged for debugging
    };

    const onRoomInfo = (data) => {
      if (data && data.creatorName) {
        setRoomCreator(data.creatorName);
      }
    };

    // Register all listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
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
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
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

  // Handle "message seen" logic
  useEffect(() => {
    messages.forEach((msg) => {
      if (msg && msg.senderId !== userId && msg.status !== "seen" && msg.type === 'chat') {
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

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_message', { text: inputMessage }, () => { });
    setInputMessage('');
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
        console.error("CLOUDINARY ERROR:", await response.text());
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
        fileType: file.type.startsWith("image/") ? "image" : "file"
      }, () => { });
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
      />

      <MessagesList
        messages={messages}
        onReact={reactToMessage}
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
        userId={userId}
        onLeave={leaveRoom}
        isConnected={isConnected}
        roomCreator={roomCreator}
      />
    </div>
  );
}
