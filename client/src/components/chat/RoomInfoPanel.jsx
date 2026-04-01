import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, LogOut, X } from 'lucide-react';
import Logo from '../ui/Logo';
import { stringToHSL } from '../../utils/helpers';

export default function RoomInfoPanel({
  isOpen,
  onClose,
  roomId,
  code,
  copied,
  onCopy,
  onlineUsers,
  typingUsers,
  recentActiveUsers,
  socketId,
  onLeave,
  isConnected
}) {
  return (
    <>
      {/* Overlay Background */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[4px] z-30"
          />
        )}
      </AnimatePresence>

      {/* Slide-in Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: isOpen ? 0 : '100%' }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="absolute top-0 right-0 h-full w-[85%] max-w-[320px] bg-[rgba(15,23,42,0.85)] backdrop-blur-[24px] border-l border-[rgba(255,255,255,0.1)] flex flex-col p-6 z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-center justify-between mb-8">
          <Logo className="w-24 md:w-28" />
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] border border-[rgba(255,255,255,0.05)] rounded-lg transition-all active:scale-95 shadow-[0_4px_10px_rgba(0,0,0,0.2)]"
          >
            <X size={20} />
          </button>
        </div>

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
            onClick={onCopy}
            className="w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/5 text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-300" />}
            <span className={copied ? "text-green-400 font-medium" : "text-gray-200"}>{copied ? 'Copied' : 'Copy Invite'}</span>
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="text-xs text-brand-200/50 font-medium uppercase tracking-wider mb-4 flex items-center justify-between sticky top-0 bg-transparent py-1 backdrop-blur-md">
            <span>Online — {onlineUsers.length}</span>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`}></div>
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
                      <span className={`truncate transition-colors ${u.id === socketId ? 'font-semibold text-white' : 'text-gray-300'} group-hover:text-white ${isActive ? 'drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]' : ''}`}>
                        {u.username} {u.id === socketId && <span className="text-xs text-brand-400 opacity-80">(you)</span>}
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
          whileHover={{ scale: 1.02, backgroundColor: "rgba(220,38,38,0.2)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onLeave}
          className="mt-6 flex items-center justify-center gap-2 text-red-300 border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.1)] transition-all px-4 py-3 rounded-xl w-full shadow-[0_4px_15px_rgba(220,38,38,0.15)] backdrop-blur-md"
        >
          <LogOut size={18} className="translate-x-0.5" />
          <span className="font-medium">Leave Room</span>
        </motion.button>
      </motion.div>
    </>
  );
}
