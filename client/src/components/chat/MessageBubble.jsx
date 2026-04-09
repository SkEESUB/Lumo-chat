import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload } from 'lucide-react';

export default function MessageBubble({ 
  msg, 
  isMe, 
  userHsl, 
  onRipple, 
  activeRipple, 
  onReact,
  onReply,
  showAvatarAndName = true,
  senderName = "Unknown"
}) {
  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end w-full relative group max-w-full`}>
      
      {/* Reactions Bar (Hover Context) */}
      <div className={`absolute top-[-30px] ${isMe ? 'right-0' : 'left-8 cursor-default'} bg-[rgba(255,255,255,0.08)] backdrop-blur-[20px] rounded-full px-2 py-1 shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.1)] opacity-0 scale-95 md:group-hover:opacity-100 md:group-hover:scale-100 active:opacity-100 active:scale-100 transition-all duration-200 flex gap-1 z-30`}>
        {['❤️', '😂', '🔥', '👍', '👀'].map(emoji => (
          <button 
            key={emoji} 
            onClick={() => onReact(msg.id, emoji)}
            className="hover:scale-125 md:active:scale-95 transition-transform text-[13px] md:text-sm cursor-pointer p-1"
          >
            {emoji}
          </button>
        ))}
        <div className="w-[1px] h-4 bg-white/20 my-auto mx-1"></div>
        <button 
          onClick={() => onReply && onReply(msg)}
          className="hover:scale-125 md:active:scale-95 transition-transform text-[13px] md:text-sm cursor-pointer p-1 brightness-125"
          title="Reply"
        >
          ↩️
        </button>
      </div>

      {/* Avatar Space (Render if showAvatarAndName, or keep space if same sender to align bubbles) */}
      {!isMe && (
        <div className="w-8 shrink-0 mr-2.5 mb-1 flex justify-center items-end">
          {showAvatarAndName && (
            <motion.div 
              initial={{ boxShadow: `0 0 0px hsla(${userHsl}, 0)` }}
              animate={{ boxShadow: [`0 0 20px hsla(${userHsl}, 0.5)`, `0 0 0px hsla(${userHsl}, 0)`] }}
              transition={{ duration: 2, ease: "easeOut" }}
              style={{ 
                backgroundColor: `hsla(${userHsl}, 0.15)`,
                borderColor: `hsla(${userHsl}, 0.3)`
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase border shadow-[0_4px_15px_rgba(0,0,0,0.3)] backdrop-blur-md"
            >
              <span style={{ color: `hsl(${userHsl})` }}>
                {senderName.substring(0, 2)}
              </span>
            </motion.div>
          )}
        </div>
      )}

      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full relative flex-1`}>
        {!isMe && showAvatarAndName && (
          <span 
            style={{ color: `hsl(${userHsl})`, textShadow: `0 0 8px hsla(${userHsl}, 0.4)` }}
            className="text-[11px] mb-1.5 ml-1 font-bold tracking-wide opacity-90"
          >
            {senderName}
          </span>
        )}

        <div className="relative cursor-pointer max-w-full" onClick={() => onRipple(msg.id)}>
          <AnimatePresence>
            {activeRipple === msg.id && (
              <motion.div 
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 1.15 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`absolute inset-0 pointer-events-none rounded-[18px] z-0 ${" "}
                  ${isMe ? 'bg-cyan-400 blur-[8px]' : 'bg-white/40 blur-[8px]'}
                `} 
                style={!isMe ? { backgroundColor: `hsla(${userHsl}, 0.6)` } : undefined}
              />
            )}
          </AnimatePresence>

          <motion.div 
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25, duration: 0.2 }}
            className={`relative overflow-hidden transition-all duration-300 z-10 w-fit break-words leading-relaxed text-[15px] max-w-full backdrop-blur-xl px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(0,200,255,0.15)] text-white ${
            isMe
              ? `bg-gradient-to-r from-cyan-500/40 to-purple-500/40 rounded-l-2xl rounded-tr-2xl ${showAvatarAndName ? 'rounded-br-sm' : 'rounded-br-2xl'}`
              : `bg-white/10 rounded-r-2xl rounded-tl-2xl ${showAvatarAndName ? 'rounded-bl-sm' : 'rounded-bl-2xl'}`
            }`}>
            {/* Inner Top Highlight for glass */}
            <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-[inherit]"></div>
            
            <div className="relative z-10 w-full overflow-hidden flex flex-col">
              {msg.replyTo && (
                <div 
                  className={`mb-2 p-2 rounded-lg text-xs border-l-[3px] ${isMe ? 'bg-black/20 border-cyan-400' : 'bg-white/10 border-white/40'} min-w-[120px]`}
                >
                  <div className={`font-bold mb-0.5 ${isMe ? 'text-cyan-200' : 'text-gray-200'}`}>
                    {msg.replyTo.senderName}
                  </div>
                  <div className="opacity-80 line-clamp-2 italic text-[11px]">
                    {msg.replyTo.text}
                  </div>
                </div>
              )}
              {msg.text && msg.text !== msg.fileUrl && <div className="max-w-full break-words">{msg.text}</div>}
              {msg.fileUrl && (
                <div className={`${msg.text && msg.text !== msg.fileUrl ? 'mt-2' : ''} relative`}>
                  {msg.fileType === 'image' ? (
                    <div className="relative overflow-hidden rounded-xl border border-white/10 shadow-lg group">
                       <a href={msg.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                        <img 
                          src={msg.fileUrl} 
                          alt="attachment" 
                          className="w-full max-w-[240px] max-h-[260px] object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </a>
                      <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent pointer-events-none"></div>
                    </div>
                  ) : (
                    <a href={msg.fileUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className={`flex items-center gap-2.5 p-3 rounded-xl border ${isMe ? 'bg-black/20 border-white/10 hover:bg-black/30' : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.1)]'} transition-colors text-sm backdrop-blur-md`}>
                      <div className={`p-2 rounded-lg ${isMe ? 'bg-white/10' : 'bg-black/20'} shadow-inner`}>
                        <Upload size={16} className={isMe ? 'text-cyan-200' : 'text-gray-300'} />
                      </div>
                      <span className="font-medium underline-offset-4 hover:underline text-[13px] tracking-wide w-max pr-2">Download File</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        <div className={`flex items-center gap-1.5 mt-1 mx-1 opacity-60 group-hover:opacity-100 transition-opacity ${isMe ? 'justify-end' : 'justify-start'} w-full`}>
          <span className="text-[10px] tracking-wide text-gray-400/80 font-medium">
            {time}
          </span>
          {isMe && (
            <span className="text-[11px] ml-0.5 tracking-[-2px]">
              {msg.status === 'seen' ? (
                <span className="text-[#3b82f6] font-bold">✓✓</span>
              ) : msg.status === 'delivered' ? (
                <span className="text-gray-400 font-bold">✓✓</span>
              ) : (
                <span className="text-gray-400 font-bold">✓</span>
              )}
            </span>
          )}
        </div>

        {/* Reactions floating below */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className={`absolute bottom-[-15px] ${isMe ? 'right-2' : 'left-2'} flex flex-wrap gap-1 z-20`}>
            {[...new Set(msg.reactions.map(r => r.emoji))].map(emoji => {
              const count = msg.reactions.filter(r => r.emoji === emoji).length;
              return (
                <motion.span 
                  initial={{ scale: 0, y: 5 }}
                  animate={{ scale: 1, y: 0 }}
                  key={emoji} 
                  className="bg-[rgba(15,23,42,0.85)] border border-[rgba(255,255,255,0.15)] rounded-full px-1.5 py-0.5 text-[11px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center gap-1 backdrop-blur-md cursor-default pointer-events-none"
                >
                  {emoji} <span className="text-gray-300/90 font-bold text-[10px]">{count > 1 ? count : ''}</span>
                </motion.span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
