import React, { useState, useEffect, useRef } from 'react';
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

  // ✅ CLEAN USERNAME (NO localStorage)
  let userName = state.username;
  if (!userName) {
    userName = prompt("Enter your name") || "Guest";
  }

  const [username] = useState(userName);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [roomCreator, setRoomCreator] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [counts, setCounts] = useState({ online: 0, idle: 0, offline: 0 });
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const typingTimeoutRef = useRef(null);

  // ================= CONNECT & JOIN =================
  useEffect(() => {
    if (!roomId || !username) {
      navigate('/');
      return;
    }

    connectSocket();

    const joinRoom = () => {
      socket.emit('join_room', { roomId, name: username }, (res) => {
        if (res?.success) {
          setIsConnected(true);
        } else {
          setError(res?.message || "Join failed");
        }
      });
    };

    if (socket.connected) joinRoom();

    socket.on("connect", joinRoom);
    socket.on("disconnect", () => setIsConnected(false));

    // ================= SOCKET EVENTS =================

    socket.on("room_data", (data) => {
      setOnlineUsers(data.users || []);
      setCounts(data.counts || { online: 0, idle: 0, offline: 0 });

      if (data.creator) {
        setRoomCreator(data.creator.name);
      }
    });

    socket.on("load_messages", (msgs) => {
      setMessages(msgs || []);
    });

    socket.on("receive_message", (msg) => {
      setMessages((prev) => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on("room_info", (data) => {
      setRoomCreator(data.creatorName);
    });

    socket.on("user_typing", ({ username }) => {
      setTypingUsers(prev => new Set(prev).add(username));
    });

    socket.on("user_stop_typing", ({ username }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("room_data");
      socket.off("load_messages");
      socket.off("receive_message");
      socket.off("room_info");
      socket.off("user_typing");
      socket.off("user_stop_typing");
    };

  }, [roomId]);

  // ================= ACTIVITY =================
  useEffect(() => {
    const interval = setInterval(() => {
      if (socket.connected) {
        socket.emit("user_activity");
      }
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  // ================= VISIBILITY =================
  useEffect(() => {
    const handleVisibility = () => {
      if (!socket.connected) return;

      if (document.hidden) {
        socket.emit("user_idle");
      } else {
        socket.emit("user_active");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // ================= MESSAGE SEND =================
  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit("send_message", { text: inputMessage });
    setInputMessage("");
    socket.emit("stop_typing", roomId);
  };

  // ================= TYPING =================
  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    socket.emit("typing", roomId);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", roomId);
    }, 1500);
  };

  // ================= FILE UPLOAD =================
  const uploadFile = async (file) => {
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "chat_upload");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dfdhdccgw/auto/upload",
        { method: "POST", body: formData }
      );

      const data = await res.json();

      socket.emit("send_message", {
        fileUrl: data.secure_url,
        fileType: file.type.startsWith("image/") ? "image" : "file"
      });

    } catch (err) {
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Max 10MB");
      return;
    }

    await uploadFile(file);
  };

  // ================= LEAVE =================
  const leaveRoom = () => {
    disconnectSocket();
    navigate('/');
  };

  // ================= UI =================
  if (!isConnected && !error) return <LoadingScreen />;

  if (error) {
    return (
      <ChatLayout>
        <div className="text-red-400 p-6">{error}</div>
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
        socketId={socket.id}
        username={username}
        typingUsers={typingUsers}
      />

      <MessageInput
        inputMessage={inputMessage}
        onInputChange={handleTyping}
        onSendMessage={sendMessage}
        onFileChange={handleFileChange}
        isUploading={isUploading}
      />

      <RoomInfoPanel
        isOpen={showInfoPanel}
        onClose={() => setShowInfoPanel(false)}
        roomId={roomId}
        onlineUsers={onlineUsers}
        roomCreator={roomCreator}
        onLeave={leaveRoom}
      />

    </div>
  );
}