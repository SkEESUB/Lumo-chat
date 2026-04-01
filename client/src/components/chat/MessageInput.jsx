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
    <div className="p-3 md:p-5 bg-black/40 backdrop-blur-xl border-t border-white/10 z-20 w-full fixed bottom-0 md:static md:bottom-auto">
      <form onSubmit={onSendMessage} className="flex gap-2 md:gap-3 max-w-4xl mx-auto items-end relative">
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
          className="bg-white/5 border border-white/10 hover:bg-white/15 text-gray-300 h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm relative overflow-hidden group"
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

        <div className="flex-1 relative bg-white/5 border border-white/10 rounded-xl md:rounded-2xl shadow-inner focus-within:bg-white/10 focus-within:border-brand-500/50 focus-within:ring-1 focus-within:ring-brand-500/50 transition-all group overflow-hidden">
          <input
            type="text"
            value={inputMessage}
            onChange={onInputChange}
            placeholder="Message..."
            className="w-full bg-transparent text-white placeholder-gray-500 px-4 py-3 md:px-5 md:py-3 focus:outline-none transition-all font-medium text-[15px] md:text-base leading-none"
          />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 bg-gradient-to-r from-brand-500/0 via-brand-400 to-brand-500/0 group-focus-within:w-4/5 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(56,189,248,0.8)] pointer-events-none"></div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, filter: "brightness(1.2)" }}
          type="submit"
          disabled={!inputMessage.trim() && !isUploading}
          className="bg-gradient-to-br from-brand-500 to-brand-600 hover:from-brand-400 hover:to-brand-500 disabled:opacity-50 disabled:from-brand-600/50 disabled:to-brand-600/50 text-white h-11 w-11 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center transition-all shadow-[0_4px_20px_rgba(37,99,235,0.4)] hover:shadow-[0_4px_25px_rgba(37,99,235,0.6)] shrink-0 disabled:shadow-none relative group overflow-hidden"
        >
          <motion.div
            whileTap={{ scale: 0.8 }}
            className="relative z-10 flex items-center justify-center"
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
