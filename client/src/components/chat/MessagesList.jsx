import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { stringToHSL } from '../../utils/helpers';
import MessageBubble from './MessageBubble';

export default function MessagesList({
  messages,
  userId,
  onReact,
  typingUsers,
  username
}) {
  const chatRef = useRef(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [activeRipple, setActiveRipple] = useState(null);

  const handleScroll = () => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    setShowScrollBtn(!nearBottom);
  };

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;

    if (nearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, typingUsers]);

  const triggerRipple = (id) => {
    setActiveRipple(id);
    setTimeout(() => {
      setActiveRipple((prev) => (prev === id ? null : prev));
    }, 600);
  };

  if (!messages || messages.length === 0) {
    return (
      <main className="chat-body flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col gap-3 justify-center items-center h-full">
          <div className="bg-white/5 border border-white/10 p-6 rounded-3xl shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-brand-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"></div>
            <MessageSquare size={48} className="text-brand-300/50 mb-2 relative z-10" />
          </div>
          <div className="text-center">
            <h3 className="text-white font-medium text-lg mb-1">Start the conversation 🚀</h3>
            <p className="text-sm text-gray-500">Send a message or upload a file to begin.</p>
          </div>
        </div>
      </main>
    );
  }

  // Deduplicate messages safely
  const uniqueMessagesMap = new Map();
  messages.forEach(msg => {
    if (msg && msg.id) uniqueMessagesMap.set(msg.id, msg);
  });
  const filteredMessages = Array.from(uniqueMessagesMap.values());

  // Get typing users that are NOT the current user
  const otherTypingUsers = Array.from(typingUsers || []).filter(u => u !== username);

  return (
    <>
      <main className="chat-body" ref={chatRef} onScroll={handleScroll}>
        <div className="max-w-2xl mx-auto flex flex-col relative pb-4 px-2">
          <AnimatePresence initial={false}>
            {filteredMessages.map((msg, idx) => {
              // System messages (join/leave)
              if (msg.type === 'system') {
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={msg.id || `system-${idx}`}
                    className="flex justify-center my-4 w-full"
                  >
                    <span className="text-[11px] bg-white/5 text-gray-400 px-4 py-1.5 rounded-full border border-white/5 shadow-sm backdrop-blur-md">
                      {msg.message || "System event"}
                    </span>
                  </motion.div>
                );
              }

              // ========================================
              // MESSAGE ALIGNMENT: userId comparison
              // My messages → right, Others → left
              // ========================================
              const isMe = msg.senderId === userId;
              const senderName = msg.senderName || 'Unknown';
              const userHsl = stringToHSL(senderName);

              // Clustering logic (avatar once per cluster)
              const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
              const isSameSenderAsPrev = prevMsg && prevMsg.senderId === msg.senderId && prevMsg.type !== 'system';
              const showAvatarAndName = !isMe && !isSameSenderAsPrev;

              // Adjust margin top if cluster changed
              const marginTopClass = isSameSenderAsPrev ? 'mt-[2px]' : 'mt-3';

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  key={msg.id || `msg-${idx}`}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} group w-full ${marginTopClass} relative z-10`}
                >
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full md:max-w-[85%] max-w-[90%]`}>
                    <MessageBubble
                      msg={msg}
                      isMe={isMe}
                      userHsl={userHsl}
                      onRipple={triggerRipple}
                      activeRipple={activeRipple}
                      onReact={onReact}
                      showAvatarAndName={showAvatarAndName}
                      senderName={senderName}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          <AnimatePresence>
            {otherTypingUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="flex items-end gap-2 mt-auto"
              >
                <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 mb-1 shrink-0">
                  {otherTypingUsers[0] ? otherTypingUsers[0].substring(0, 2).toUpperCase() : '..'}
                </div>
                <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 text-gray-300 rounded-tr-2xl rounded-br-2xl rounded-tl-xl rounded-bl-sm px-4 py-3 shadow-sm w-fit flex items-center gap-2 mb-1">
                  <div className="flex space-x-1.5 items-center h-4">
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.15 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                    <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.3 }} className="w-1.5 h-1.5 bg-brand-400/80 rounded-full"></motion.div>
                  </div>
                  <span className="text-xs text-brand-300/80 font-medium ml-1">
                    {otherTypingUsers.join(', ')} is typing
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="shrink-0" />
        </div>
      </main>

      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            onClick={() => {
              if (chatRef.current) {
                chatRef.current.scrollTop = chatRef.current.scrollHeight;
              }
            }}
            className="fixed bottom-20 left-1/2 z-50 bg-[rgba(15,23,42,0.8)] backdrop-blur-md border border-[rgba(255,255,255,0.1)] text-white shadow-[0_4px_20px_rgba(0,0,0,0.5)] px-4 py-2 rounded-full text-xs font-semibold tracking-wide hover:bg-brand-500 transition-colors"
          >
            ↓ New Messages
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
