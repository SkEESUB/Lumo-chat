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
    <div className="p-4 pb-6 md:pb-6 bg-transparent w-full z-20 mt-auto shrink-0 transition-all duration-300">
      <form onSubmit={onSendMessage} className="flex gap-2 max-w-[500px] mx-auto items-center relative bg-[rgba(255,255,255,0.05)] backdrop-blur-[20px] rounded-[24px] p-2 border border-[rgba(255,255,255,0.08)] shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
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
          className="bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-400 h-10 w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_10px_rgba(0,0,0,0.1)] relative overflow-hidden group"
          title="Upload File"
        >
          <div className="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform pointer-events-none"></div>
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Upload size={20} className="group-hover:text-brand-300 transition-colors relative z-10" />
          )}
          <div className="absolute inset-0 bg-white/20 rounded-full scale-0 opacity-0 group-active:scale-[2.5] group-active:opacity-100 transition-all duration-500 ease-out origin-center pointer-events-none"></div>
        </motion.button>

        <div className="flex-1 relative bg-transparent transition-all group overflow-hidden pl-2">
          <input
            type="text"
            value={inputMessage}
            onChange={onInputChange}
            placeholder="Type a message..."
            className="w-full bg-transparent text-white placeholder-gray-500/80 px-2 py-3 focus:outline-none transition-all font-medium text-[15px] leading-none"
          />
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={!inputMessage.trim() && !isUploading}
          className="bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-600 text-white h-10 w-10 md:h-11 md:w-11 rounded-full flex items-center justify-center transition-all shadow-[0_4px_15px_rgba(6,182,212,0.4)] hover:shadow-[0_4px_20px_rgba(6,182,212,0.6)] shrink-0 disabled:shadow-none relative group overflow-hidden"
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="relative z-10 flex items-center justify-center pl-0.5"
          >
            <Send size={18} className={`md:w-5 md:h-5 ${inputMessage.trim() ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}`} />
          </motion.div>
          <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="absolute inset-0 bg-white/30 rounded-full scale-0 opacity-0 group-active:scale-[2.5] group-active:opacity-100 transition-all duration-500 ease-out origin-center pointer-events-none"></div>
        </motion.button>
      </form>
    </div>
  );
}
