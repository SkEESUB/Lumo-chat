import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, Copy, LogOut, Check, CheckCheck, User, Users, MessageSquare } from 'lucide-react';
import { socket, connectSocket, disconnectSocket } from '../services/socket';

const stringToHSL = (str) => {
  if (!str) return '200, 65%, 60%';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `${Math.abs(hash) % 360}, 80%, 70%`;
};

const MessageStatus = () => {
  const [status, setStatus] = useState('sent');

  // Simulated timed transitions to mimic network lifecycle
  useEffect(() => {
    const deliveredTimer = setTimeout(() => setStatus('delivered'), 800);
    const seenTimer = setTimeout(() => setStatus('seen'), 2000);
    return () => {
      clearTimeout(deliveredTimer);
      clearTimeout(seenTimer);
    };
  }, []);

  const isSeen = status === 'seen';
  const isDelivered = status === 'delivered' || isSeen;

  const dotVariant = {
    hidden: { opacity: 0, scale: 0 },
    sent: { 
      opacity: 0.5, 
      scale: 1, 
      backgroundColor: 'rgba(255, 255, 255, 0.6)', 
      boxShadow: '0 0 0px rgba(0,0,0,0)',
      transition: { duration: 0.2 }
    },
    seen: { 
      opacity: 1,
      scale: [1, 1.25, 1], 
      backgroundColor: 'rgba(34, 197, 94, 1)', // Tailwind green-500
      boxShadow: '0 0 8px rgba(34, 197, 94, 0.9)',
      transition: { 
        duration: 0.3, // Glow and color fade-in
        scale: {
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      }
    }
  };

  return (
    <div className="flex items-center gap-[3px] justify-center ml-0.5">
      {/* First Dot (Sent/Seen) */}
      <motion.div
        variants={dotVariant}
        initial="hidden"
        animate={isSeen ? "seen" : "sent"}
        className="w-[3.5px] h-[3.5px] rounded-full"
      />
      
      {/* Second Dot (Delivered/Seen) */}
      <AnimatePresence>
        {isDelivered && (
          <motion.div
            key="dot2"
            variants={dotVariant}
            initial="hidden"
            animate={isSeen ? "seen" : "sent"}
            exit="hidden"
            className="w-[3.5px] h-[3.5px] rounded-full"
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function ChatRoom() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state || {};
  const [username, setUsername] = useState(state.username || '');
  const [code, setCode] = useState(state.code || '');

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [recentActiveUsers, setRecentActiveUsers] = useState(new Set());
  const [activeRipple, setActiveRipple] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const hasJoinedRef = useRef(false);
  const fileInputRef = useRef(null);

  // Auto-scroll Down
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial connection and Room Join logic
  useEffect(() => {
    if (!username) {
      // If refreshed, they lose state, kick them out
      navigate('/');
      return;
    }

    connectSocket();

    // Re-join logic if connected already
    if (!hasJoinedRef.current && socket.currentRoom !== roomId) {
      socket.emit('join_room', { roomId, code, username }, (res) => {
        if (res && (res.success || res.message === 'User already in room')) {
          socket.currentRoom = roomId;
        } else if (res) {
          setError(res.message);
          setTimeout(() => navigate('/'), 3000);
        }
      });
      hasJoinedRef.current = true;
    }

    // Socket Event Listeners
    const onReceiveMessage = (data) => {
      // Intercept reaction payloads
      if (data.text && data.text.startsWith('REACT:')) {
        const [, emoji, targetMsgId] = data.text.split(':');
        setMessages((prev) => prev.map(m => m.id === targetMsgId ? {
          ...m,
          reactions: [...(m.reactions || []), { emoji, senderId: data.senderId, senderName: data.senderName }]
        } : m));
        return;
      }
      setMessages((prev) => [...prev, { ...data, type: 'chat' }]);

      // Active User Highlight Logic
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
    const onUserJoined = (data) => {
      setMessages((prev) => [...prev, { ...data, type: 'system' }]);
    };
    const onUserLeft = (data) => {
      setMessages((prev) => [...prev, { ...data, type: 'system' }]);
    };
    const onRoomUsers = (users) => {
      setOnlineUsers(users);
    };
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
      // Cleanup listeners properly without disconnecting the entire socket
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

  const triggerRipple = (id) => {
    setActiveRipple(id);
    setTimeout(() => {
      setActiveRipple((prev) => (prev === id ? null : prev));
    }, 600);
  };

  const handleTyping = (e) => {
    setInputMessage(e.target.value);

    // Typing indication
    socket.emit('typing', true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing', false);
    }, 1500);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    socket.emit('send_message', { text: inputMessage }, (res) => {
      if (res.success) {
        // Message confirmed
      }
    });

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
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("🚨 CLOUDINARY ERROR:", errorText);
      }

      const data = await response.json();

      if (data.secure_url) {
        return data.secure_url;
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Cloudinary upload error:", err);
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
        // Pass to server in its expected format:
        fileUrl: fileURL,
        fileType: file.type.startsWith("image/") ? "image" : "file"
      }, (res) => {
        if (res && res.success) {
          // file message confirmed
        }
      });
    }

    e.target.value = null;
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full h-[100dvh] md:h-[90vh] max-w-6xl md:rounded-3xl flex flex-col md:flex-row shadow-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 relative">
      {/* Animated Subtle Background Blur inside Container */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-indigo-500/10 via-brand-500/5 to-purple-500/10 opacity-70 animate-pulse duration-[8000ms]"></div>

      {/* Sidebar - Hidden on small screens */}
      <div className="hidden md:flex w-72 bg-black/20 backdrop-blur-md border-r border-white/10 flex-col p-6 z-10">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent mb-8 flex items-center gap-3">
          <div className="relative flex items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-white/20 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] shrink-0">
            <motion.div 
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="w-3.5 h-3.5 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]"
            />
          </div>
          Lumo
        </h2>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-8 shadow-inner">
          <div className="text-xs text-brand-200/50 font-medium uppercase tracking-wider mb-3">Room Info</div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-400 text-sm">ID</span>
            <span className="font-mono text-white bg-black/40 px-2.5 py-1 rounded-lg text-xs border border-white/5 shadow-sm">{roomId}</span>
          </div>
          <div className="flex justify-between items-center text-sm mb-4">
            <span className="text-gray-400 text-sm">PIN</span>
            <span className="font-mono text-brand-300 tracking-widest text-lg bg-brand-500/10 px-2 py-0.5 rounded-lg">{code || '---'}</span>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={copyRoomDetails}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-300" />}
            <span className={copied ? "text-green-400 font-medium" : "text-gray-200"}>{copied ? 'Copied' : 'Copy Invite'}</span>
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-xs text-brand-200/50 font-medium uppercase tracking-wider mb-4 flex items-center justify-between sticky top-0 bg-transparent py-1">
            <span>Online — {onlineUsers.length}</span>
            <div className={`w-2 h-2 rounded-full ${socket.connected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
          </div>
          <ul className="space-y-3 relative z-10">
            <AnimatePresence>
              {onlineUsers.map((u) => {
                const isTyping = typingUsers.has(u.username);
                const isActive = isTyping || recentActiveUsers.has(u.username);
                const userHsl = stringToHSL(u.username);
                
                return (
                  <motion.li
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.8, filter: "blur(4px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    key={u.id}
                    className={`flex items-center gap-3 text-sm text-gray-200 bg-white/5 p-2 rounded-xl border border-white/5 shadow-sm hover:bg-white/10 transition-colors group relative ${isActive ? 'bg-white/10' : ''}`}
                  >
                    <div className="relative">
                      {/* Soft Glow Ring for Online/Active presence */}
                      <div className="absolute inset-0 rounded-full blur-[6px] transition-all duration-500" style={{ backgroundColor: `hsl(${userHsl})`, opacity: isActive ? 0.7 : 0.2 }}></div>
                      
                      <motion.div 
                        style={{ 
                          backgroundColor: `hsla(${userHsl}, 0.2)`, 
                          color: `hsl(${userHsl})`,
                          borderColor: `hsla(${userHsl}, 0.5)`
                        }}
                        className="w-9 h-9 rounded-full flex items-center justify-center uppercase font-bold text-xs shadow-inner border relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                        <span className="relative z-10">{u.username.substring(0, 2)}</span>
                      </motion.div>
                      
                      <div className="absolute bottom-[-1px] right-[-1px]">
                        <span className="relative flex h-3 w-3">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${isActive ? 'scale-150 duration-700' : ''}`}></span>
                          <span className={`relative inline-flex rounded-full h-3 w-3 bg-green-500 border-[2px] border-[#1e293b] shadow-[0_0_6px_rgba(34,197,94,0.8)] ${isActive ? 'shadow-[0_0_12px_rgba(34,197,94,1)]' : ''}`}></span>
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className={`truncate transition-colors ${u.id === socket.id ? 'font-semibold text-white' : 'text-gray-300'} group-hover:text-white ${isActive ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : ''}`}>
                        {u.username} {u.id === socket.id && <span className="text-xs text-brand-400 opacity-80">(you)</span>}
                      </span>
                      {isTyping && (
                        <span className="text-[10px] text-brand-300 animate-pulse mt-0.5">is typing...</span>
                      )}
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>

        <motion.button
          whileHover={{ scale: 1.02, backgroundColor: "rgba(239,68,68,0.15)" }}
          whileTap={{ scale: 0.98 }}
          onClick={leaveRoom}
          className="mt-6 flex items-center justify-center gap-2 text-red-400/80 hover:text-red-300 border border-red-500/20 bg-red-500/5 transition-all px-4 py-2.5 rounded-xl w-full"
        >
          <LogOut size={18} />
          <span className="font-medium">Leave Room</span>
        </motion.button>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 bg-slate-900/20 backdrop-blur-md overflow-hidden">
        {/* Soft light glow behind Messages */}
        <div className="absolute inset-x-0 bottom-0 h-[70%] pointer-events-none z-0 mix-blend-screen opacity-15 bg-gradient-to-t from-cyan-500 via-purple-500 to-transparent blur-[100px]"></div>

        {/* Mobile Header */}
        <div className="h-16 md:hidden border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md">
          <div className="font-bold flex items-center gap-2 text-white">
            <Users size={18} className="text-brand-400" />
            <div className="flex flex-col">
              <span className="leading-tight">Room {roomId}</span>
              <span className="text-[10px] text-gray-400 font-normal">{onlineUsers.length} online</span>
            </div>
          </div>
          <button onClick={leaveRoom} className="text-red-400 p-2 bg-red-500/10 rounded-lg"><LogOut size={18} /></button>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-400 font-medium z-10">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-2 backdrop-blur-md">
              <LogOut size={20} /> {error}
            </div>
          </div>
        ) : (
          <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth custom-scrollbar relative z-10 flex flex-col">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="m-auto flex flex-col items-center justify-center text-gray-400 gap-4"
                >
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
                    <div className="absolute inset-0 bg-brand-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
                    <MessageSquare size={48} className="text-brand-300/50 mb-2 relative z-10" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-white font-medium text-lg mb-1">Start the conversation 🚀</h3>
                    <p className="text-sm text-gray-500">Send a message or upload a file to begin.</p>
                  </div>
                </motion.div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  if (msg.type === 'system') {
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={idx}
                        className="flex justify-center my-4"
                      >
                        <span className="text-[11px] bg-white/5 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 shadow-sm backdrop-blur-md">
                          {msg.message}
                        </span>
                      </motion.div>
                    );
                  }

                  const isMe = msg.senderId === socket.id;
                  const userHsl = stringToHSL(msg.senderName);

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group w-full mb-3 mt-1`}
                    >
                      <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] md:max-w-[70%] relative`}>
                        
                        {/* Hover Reactions Bar */}
                        <div className={`absolute top-[-30px] ${isMe ? 'right-0' : 'left-8 cursor-default'} bg-slate-800/80 backdrop-blur-md rounded-full px-2 py-1 shadow-lg border border-white/10 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 flex gap-1 z-30`}>
                          {['❤️', '😂', '🔥', '👍', '👀'].map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => reactToMessage(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-sm cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>

                        {!isMe && (
                          <motion.div 
                            initial={{ boxShadow: `0 0 0px hsla(${userHsl}, 0)` }}
                            animate={{ boxShadow: [`0 0 20px hsla(${userHsl}, 0.8)`, `0 0 0px hsla(${userHsl}, 0)`] }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            style={{ 
                              backgroundColor: `hsla(${userHsl}, 0.15)`,
                              borderColor: `hsla(${userHsl}, 0.3)`
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase shrink-0 border mb-1 mr-2 shadow-[0_2px_10px_rgba(0,0,0,0.2)]"
                          >
                            <span style={{ color: `hsl(${userHsl})` }}>
                              {msg.senderName.substring(0, 2)}
                            </span>
                          </motion.div>
                        )}

                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {!isMe && (
                            <span 
                              style={{ color: `hsl(${userHsl})`, textShadow: `0 0 8px hsla(${userHsl}, 0.4)` }}
                              className="text-[11px] mb-1 ml-1 font-bold tracking-wide"
                            >
                              {msg.senderName}
                            </span>
                          )}

                          <div className="relative cursor-pointer" onClick={() => triggerRipple(msg.id)}>
                            {/* Message Reaction Ripple */}
                            <AnimatePresence>
                              {activeRipple === msg.id && (
                                <motion.div 
                                  initial={{ opacity: 0.6, scale: 1 }}
                                  animate={{ opacity: 0, scale: 1.15 }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className={`absolute inset-0 pointer-events-none rounded-2xl z-0 ${
                                    isMe ? 'bg-cyan-400 blur-[4px]' : 'bg-white/40 blur-[4px]'
                                  }`} 
                                  style={!isMe ? { backgroundColor: `hsla(${userHsl}, 0.5)` } : undefined}
                                />
                              )}
                            </AnimatePresence>

                            <motion.div 
                              whileHover={{ y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              className={`px-4 py-3 relative overflow-hidden transition-all duration-300 z-10 ${
                              isMe
                                ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-2xl rounded-br-sm shadow-[0_8px_25px_rgba(0,150,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)] border border-transparent'
                                : 'bg-white/10 backdrop-blur-md text-gray-100 rounded-2xl rounded-bl-sm border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                              }`}>
                              {isMe && <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[inherit]"></div>}
                              <div className="relative z-10 break-words leading-relaxed text-[15px]">
                                {msg.text && <div>{msg.text}</div>}
                              {msg.fileUrl && (
                                <div className="mt-2">
                                  {msg.fileType === 'image' ? (
                                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                      <img src={msg.fileUrl} alt="attachment" className="rounded-xl max-w-xs w-full max-h-60 object-cover border border-white/10 shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in" />
                                    </a>
                                  ) : (
                                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`flex items-center gap-2 p-3 rounded-xl border ${isMe ? 'bg-black/20 border-white/10 hover:bg-black/30' : 'bg-white/5 border-white/10 hover:bg-white/10'} transition-colors text-sm`}>
                                      <div className={`p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-black/20'}`}>
                                        <Upload size={16} />
                                      </div>
                                      <span className="font-medium underline-offset-4 hover:underline">Download File</span>
                                    </a>
                                  )}
                                </div>
                              )}
                              </div>
                            </motion.div>
                          </div>

                          <div className={`flex items-center gap-1 mt-1 mx-1.5 opacity-70 group-hover:opacity-100 transition-opacity ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-[10px] text-gray-200 font-medium tracking-wide">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <MessageStatus />}
                          </div>

                          {/* Render Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`absolute bottom-[-12px] ${isMe ? 'right-2' : 'left-2'} flex flex-wrap gap-1 z-20`}>
                              {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => {
                                const count = msg.reactions.filter(r => r.emoji === emoji).length;
                                return (
                                  <motion.span 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    key={emoji} 
                                    className="bg-slate-800/95 border border-white/20 rounded-full px-1.5 py-0.5 text-[10px] shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center gap-1 backdrop-blur-md cursor-default"
                                  >
                                    {emoji} <span className="text-gray-300 font-bold">{count > 1 ? count : ''}</span>
                                  </motion.span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Typing Indicator */}
              <AnimatePresence>
                {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== username).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                    className="flex items-end gap-2 mt-auto"
                  >
                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 mb-1 shrink-0">
                      {Array.from(typingUsers).filter(u => u !== username)[0].substring(0, 2).toUpperCase()}
                    </div>
                    <div className="bg-white/10 backdrop-blur-md border border-white/10 text-gray-300 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm w-fit flex items-center gap-2 mb-1">
                      <div className="flex space-x-1.5 items-center h-4">
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.15 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                        <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.3 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                      </div>
                      <span className="text-xs text-brand-300/80 font-medium ml-1">
                        {Array.from(typingUsers).filter(u => u !== username).join(', ')} is typing
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-2 shrink-0" />
            </div>

            {/* Input Form Area */}
            <div className="p-4 md:p-5 bg-black/30 backdrop-blur-xl border-t border-white/10 z-20">
              <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto items-end relative">
                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={handleFileUpload}
                  disabled={isUploading}
                  className="bg-white/5 border border-white/10 hover:bg-white/15 text-gray-300 h-12 w-12 rounded-2xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm relative overflow-hidden group"
                  title="Upload File"
                >
                  <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform pointer-events-none"></div>
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Upload size={20} className="group-hover:text-brand-300 transition-colors relative z-10" />
                  )}
                  {/* Subtle Ripple */}
                  <div className="absolute inset-0 bg-white/20 rounded-full scale-0 opacity-0 group-active:scale-[2.5] group-active:opacity-100 transition-all duration-500 ease-out origin-center pointer-events-none"></div>
                </motion.button>

                <div className="flex-1 relative bg-white/5 border border-white/10 rounded-2xl shadow-inner focus-within:bg-white/10 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all group overflow-hidden">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="w-full bg-transparent text-white placeholder-gray-500 px-5 py-3 focus:outline-none transition-all font-medium"
                  />
                  {/* Glowing line at the bottom when focused - Animated Width */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-brand-500/0 via-brand-400 to-brand-500/0 group-focus-within:w-4/5 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(56,189,248,0.8)] pointer-events-none"></div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, filter: "brightness(1.2)" }}
                  type="submit"
                  disabled={!inputMessage.trim() && !isUploading}
                  className="bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 disabled:opacity-50 disabled:from-brand-600/50 disabled:to-brand-600/50 text-white h-12 w-12 rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.6)] shrink-0 disabled:shadow-none relative group overflow-hidden"
                >
                  <motion.div
                    whileTap={{ scale: 0.8 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    <Send size={20} className={`${inputMessage.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}`} />
                  </motion.div>
                  <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  {/* Subtle Ripple */}
                  <div className="absolute inset-0 bg-white/30 rounded-full scale-0 opacity-0 group-active:scale-[2.5] group-active:opacity-100 transition-all duration-500 ease-out origin-center pointer-events-none"></div>
                </motion.button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
