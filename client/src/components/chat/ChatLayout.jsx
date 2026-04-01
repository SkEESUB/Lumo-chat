import React from 'react';

export default function ChatLayout({ children }) {
  return (
    <div className="w-full h-[100dvh] md:h-[90dvh] md:max-w-[500px] md:rounded-[2rem] flex flex-col shadow-[0_30px_60px_-12px_rgba(0,0,0,0.6),0_0_40px_-10px_rgba(34,211,238,0.1)] overflow-hidden bg-[rgba(255,255,255,0.03)] backdrop-blur-[20px] border border-[rgba(255,255,255,0.08)] relative mx-auto my-0 md:my-auto z-10 transition-all duration-500">
      {/* Animated Subtle Background Blur inside Container */}
      <div className="absolute inset-0 pointer-events-none z-0 bg-gradient-to-br from-[#0f172a]/40 to-[#020617]/40"></div>
      <div className="relative z-10 flex flex-col h-full w-full">
        {children}
      </div>
    </div>
  );
}
