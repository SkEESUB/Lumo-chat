import React from 'react';
import { motion } from 'framer-motion';
import Icon from '../ui/Icon';

export default function LoadingScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900/20 backdrop-blur-md relative z-10 w-full h-[100dvh]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="relative flex items-center justify-center w-24 h-24"
        >
          <div className="absolute inset-0 border-t-4 border-brand-400 rounded-full blur-[2px] opacity-70"></div>
          <div className="absolute inset-2 border-r-4 border-cyan-400 rounded-full blur-[1px] opacity-50"></div>
          <Icon className="w-10 h-10 z-10" />
        </motion.div>
        
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white tracking-wide mb-2 animate-pulse">Connecting...</h2>
          <p className="text-brand-200/60 text-sm">Securing your conversation</p>
        </div>
      </motion.div>
    </div>
  );
}
