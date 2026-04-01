import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Upload } from 'lucide-react';
import { stringToHSL } from '../../utils/helpers';

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
      backgroundColor: 'rgba(34, 197, 94, 1)',
      boxShadow: '0 0 8px rgba(34, 197, 94, 0.9)',
      transition: { 
        duration: 0.3,
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
      <motion.div
        variants={dotVariant}
        initial="hidden"
        animate={isSeen ? "seen" : "sent"}
        className="w-[3.5px] h-[3.5px] rounded-full"
      />
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

export default function MessagesList({ 
  messages, 
  socketId, 
  onReact, 
  typingUsers, 
  username 
}) {
  const messagesEndRef = useRef(null);
  const [activeRipple, setActiveRipple] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const triggerRipple = (id) => {
    setActiveRipple(id);
    setTimeout(() => {
      setActiveRipple((prev) => (prev === id ? null : prev));
    }, 600);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 z-10 w-full">
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
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth custom-scrollbar relative z-10 flex flex-col w-full h-full">
      {/* Soft light glow behind Messages */}
      <div className="fixed inset-x-0 bottom-0 h-[70%] pointer-events-none z-0 mix-blend-screen opacity-15 bg-gradient-to-t from-cyan-500 via-purple-500 to-transparent blur-[100px]"></div>
      
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

          const isMe = msg.senderId === socketId;
          const userHsl = stringToHSL(msg.senderName);

          return (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group w-full mb-3 mt-1 relative z-10`}
            >
              <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end max-w-[85%] md:max-w-[70%] relative`}>
                
                {/* Hover Reactions Bar */}
                <div className={`absolute top-[-30px] ${isMe ? 'right-0' : 'left-8 cursor-default'} bg-slate-800/80 backdrop-blur-md rounded-full px-2 py-1 shadow-lg border border-white/10 opacity-0 scale-95 md:group-hover:opacity-100 md:group-hover:scale-100 active:opacity-100 active:scale-100 transition-all duration-200 flex gap-1 z-30`}>
                  {['❤️', '😂', '🔥', '👍', '👀'].map(emoji => (
                    <button 
                      key={emoji} 
                      onClick={() => onReact(msg.id, emoji)}
                      className="hover:scale-125 md:active:scale-95 transition-transform text-sm cursor-pointer p-1"
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

                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}>
                  {!isMe && (
                    <span 
                      style={{ color: `hsl(${userHsl})`, textShadow: `0 0 8px hsla(${userHsl}, 0.4)` }}
                      className="text-[11px] mb-1 ml-1 font-bold tracking-wide"
                    >
                      {msg.senderName}
                    </span>
                  )}

                  <div className="relative cursor-pointer max-w-full" onClick={() => triggerRipple(msg.id)}>
                    <AnimatePresence>
                      {activeRipple === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0.6, scale: 1 }}
                          animate={{ opacity: 0, scale: 1.15 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className={`absolute inset-0 pointer-events-none rounded-tl-2xl rounded-tr-2xl z-0 ${" "}
                            ${isMe ? 'bg-cyan-400 blur-[4px] rounded-bl-2xl rounded-br-sm' : 'bg-white/40 blur-[4px] rounded-br-2xl rounded-bl-sm'}
                          `} 
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
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-sm shadow-[0_8px_25px_rgba(0,150,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)] border border-transparent'
                        : 'bg-slate-800/80 backdrop-blur-md text-gray-100 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-sm border border-white/10 shadow-[0_4px_15px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,0.2)]'
                      }`}>
                      {isMe && <div className="absolute inset-x-0 top-0 h-[45%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none rounded-t-[inherit]"></div>}
                      <div className="relative z-10 break-words leading-relaxed text-[15px]">
                        {msg.text && <div>{msg.text}</div>}
                      {msg.fileUrl && (
                        <div className="mt-2">
                          {msg.fileType === 'image' ? (
                            <a href={msg.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                              <img src={msg.fileUrl} alt="attachment" className="rounded-xl w-full max-w-xs max-h-60 object-cover border border-white/10 shadow-sm hover:opacity-90 transition-opacity cursor-zoom-in" />
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

                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute bottom-[-12px] ${isMe ? 'right-2' : 'left-2'} flex flex-wrap gap-1 z-20`}>
                      {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => {
                        const count = msg.reactions.filter(r => r.emoji === emoji).length;
                        return (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            key={emoji} 
                            className="bg-slate-800/95 border border-white/20 rounded-full px-1.5 py-0.5 text-[10px] shadow-[0_2px_5px_rgba(0,0,0,0.5)] flex items-center gap-1 backdrop-blur-md cursor-default pointer-events-none"
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

      <AnimatePresence>
        {typingUsers.size > 0 && Array.from(typingUsers).filter(u => u !== username).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="flex items-end gap-2 mt-auto"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800/80 border border-white/5 flex items-center justify-center text-[10px] font-bold text-gray-500 mb-1 shrink-0">
              {Array.from(typingUsers).filter(u => u !== username)[0].substring(0, 2).toUpperCase()}
            </div>
            <div className="bg-slate-800/80 backdrop-blur-md border border-white/10 text-gray-300 rounded-tr-2xl rounded-br-2xl rounded-tl-xl rounded-bl-sm px-4 py-3 shadow-sm w-fit flex items-center gap-2 mb-1">
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

      <div ref={messagesEndRef} className="h-4 md:h-2 shrink-0" />
    </div>
  );
}
