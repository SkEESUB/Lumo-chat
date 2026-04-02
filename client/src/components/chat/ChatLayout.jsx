import React from 'react';

export default function ChatLayout({ children }) {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/bg.jpg" 
          className="w-full h-full object-cover blur-2xl scale-110 brightness-50" 
          alt="background"
        />
        <div className="absolute inset-0 bg-[#0a0f1e]/70 backdrop-blur-xl"></div>
      </div>
      
      {/* App layer */}
      <div className="relative z-10 h-full flex">
        {children}
      </div>
    </div>
  );
}
