import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, X } from 'lucide-react';

export default function MessageInput({ 
  inputMessage, 
  onInputChange, 
  onSendMessage, 
  onFileChange, 
  isUploading,
  replyTo,
  onCancelReply
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <footer className="chat-footer relative mt-auto pt-2">
      <AnimatePresence>
        {replyTo && (
          <motion.div 
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="absolute left-2 right-2 bottom-full bg-[rgba(15,23,42,0.85)] backdrop-blur-xl border-t border-x border-[rgba(255,255,255,0.1)] rounded-t-2xl px-4 py-3 flex items-center justify-between z-10 mx-auto max-w-[98%] shadow-[0_-10px_20px_rgba(0,0,0,0.3)] mb-[-5px] pb-5"
          >
            <div className="flex flex-col flex-1 truncate pr-4 border-l-[3px] border-cyan-400 pl-3">
              <span className="text-[11px] font-bold text-cyan-400 mb-0.5">
                Replying to {replyTo.senderName}
              </span>
              <span className="text-[11px] text-gray-300 truncate italic">
                {replyTo.text}
              </span>
            </div>
            <button 
              type="button" 
              onClick={onCancelReply} 
              className="text-gray-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={onSendMessage} className={`input-box relative z-20 shadow-xl bg-[rgba(15,23,42,0.9)] backdrop-blur-xl ${replyTo ? '!rounded-t-none border-t border-white/5' : ''}`}>
          <input
          type="file"
          className="hidden"
          ref={fileInputRef}
          onChange={onFileChange}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={handleFileUpload}
          disabled={isUploading}
          className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 relative"
          title="Upload File"
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Upload size={22} className="relative z-10" />
          )}
        </motion.button>
        {isUploading && <p className="text-xs text-brand-400 font-medium whitespace-nowrap hidden sm:block">Uploading...</p>}

        <div className="flex-1 relative bg-transparent overflow-hidden pl-2">
          <input
            type="text"
            value={inputMessage}
            onChange={onInputChange}
            placeholder="Type a message..."
            className="w-full bg-transparent text-white placeholder-gray-400 px-2 py-1 focus:outline-none transition-all font-medium text-[15px] leading-none"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!inputMessage.trim() && !isUploading}
          className="bg-gradient-to-br from-cyan-500 to-purple-500 disabled:opacity-50 text-white h-9 w-9 rounded-full flex items-center justify-center transition-all shadow-[0_4px_15px_rgba(6,182,212,0.4)] shrink-0 disabled:shadow-none"
        >
          <Send size={16} className={`${inputMessage.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}`} />
        </motion.button>
      </form>
    </footer>
  );
}
