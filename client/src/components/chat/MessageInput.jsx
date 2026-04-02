import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Upload } from 'lucide-react';

export default function MessageInput({ 
  inputMessage, 
  onInputChange, 
  onSendMessage, 
  onFileChange, 
  isUploading 
}) {
  const fileInputRef = useRef(null);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <form onSubmit={onSendMessage} className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[95%] max-w-md bg-white/10 backdrop-blur-xl rounded-full px-4 py-3 flex items-center gap-2 z-20">
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
        className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
        title="Upload File"
      >
        {isUploading ? (
          <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <Upload size={22} className="relative z-10" />
        )}
      </motion.button>

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
  );
}
