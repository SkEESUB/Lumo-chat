import React from 'react';

export default function ChatLayout({ children }) {
  return (
    <div className="w-full h-[100dvh] md:h-[90vh] max-w-6xl md:rounded-3xl flex flex-col md:flex-row shadow-2xl overflow-hidden bg-white/10 backdrop-blur-xl border border-white/20 relative mx-auto my-0 md:my-auto z-10">
      {/* Animated Subtle Background Blur inside Container */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-indigo-500/10 via-brand-500/5 to-purple-500/10 opacity-70 animate-pulse duration-[8000ms]"></div>
      {children}
    </div>
  );
}
