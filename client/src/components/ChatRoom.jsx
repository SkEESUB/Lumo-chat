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
  const [username] = useState(state.username || '');
  const [code] = useState(state.code || '');

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [recentActiveUsers, setRecentActiveUsers] = useState(new Set());
  
  // UI State
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const typingTimeoutRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Initial connection and Room Join
  useEffect(() => {
    if (!username) {
      navigate('/');
      return;
    }

    connectSocket();

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    if (!hasJoinedRef.current && socket.currentRoom !== roomId) {
      socket.emit('join_room', { roomId, code, username }, (res) => {
        if (res && (res.success || res.message === 'User already in room')) {
          socket.currentRoom = roomId;
          setIsConnected(true);
        } else if (res) {
          setError(res.message);
          setTimeout(() => navigate('/'), 3000);
        }
      });
      hasJoinedRef.current = true;
    }

    const onReceiveMessage = (data) => {
      if (data.text && data.text.startsWith('REACT:')) {
        const [, emoji, targetMsgId] = data.text.split(':');
        setMessages((prev) => prev.map(m => m.id === targetMsgId ? {
          ...m,
          reactions: [...(m.reactions || []), { emoji, senderId: data.senderId, senderName: data.senderName }]
        } : m));
        return;
      }
      setMessages((prev) => [...prev, { ...data, type: 'chat' }]);

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
    };

    const onUserJoined = (data) => setMessages((prev) => [...prev, { ...data, type: 'system' }]);
    const onUserLeft = (data) => setMessages((prev) => [...prev, { ...data, type: 'system' }]);
    const onRoomUsers = (users) => setOnlineUsers(users);
    
    const onUserTyping = ({ userId, username: typingUsername, isTyping }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        if (isTyping) next.add(typingUsername);
        else next.delete(typingUsername);
        return next;
      });
    };

    socket.on('receive_message', onReceiveMessage);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('room_users', onRoomUsers);
    socket.on('user_typing', onUserTyping);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('receive_message', onReceiveMessage);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('room_users', onRoomUsers);
      socket.off('user_typing', onUserTyping);
    };
  }, [roomId, code, username, navigate]);

  const copyRoomDetails = () => {
    const text = `Join my secure Lumo\nRoom ID: ${roomId}\nPIN: ${code}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveRoom = () => {
    disconnectSocket();
    navigate('/');
  };

  const reactToMessage = (messageId, emoji) => {
    socket.emit('send_message', { text: `REACT:${emoji}:${messageId}` }, () => {});
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);
    socket.emit('typing', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1500);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_message', { text: inputMessage }, () => {});
    setInputMessage('');
    socket.emit('typing', false);
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
        message: fileURL,
        type: "file",
        fileUrl: fileURL,
        fileType: file.type.startsWith("image/") ? "image" : "file"
      }, () => {});
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
        onlineCount={onlineUsers.length}
        onInfoClick={() => setShowInfoPanel(true)}
        onLeaveRoom={leaveRoom}
      />
      
      <MessagesList 
        messages={messages}
        socketId={socket.id}
        onReact={reactToMessage}
        typingUsers={typingUsers}
        username={username}
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
        code={code}
        copied={copied}
        onCopy={copyRoomDetails}
        onlineUsers={onlineUsers}
        typingUsers={typingUsers}
        recentActiveUsers={recentActiveUsers}
        socketId={socket.id}
        onLeave={leaveRoom}
        isConnected={isConnected}
      />
    </div>
  );
}
