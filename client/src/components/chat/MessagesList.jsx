import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { stringToHSL } from '../../utils/helpers';
import MessageBubble from './MessageBubble';

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
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'} group w-full mb-5 mt-2 relative z-10`}
            >
              <MessageBubble 
                msg={msg} 
                isMe={isMe} 
                userHsl={userHsl} 
                onRipple={triggerRipple}
                activeRipple={activeRipple}
                onReact={onReact}
              />
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
