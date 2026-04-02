import React from 'react';

export default function ChatLayout({ children }) {
  return (
    <>
      <div className="fixed inset-0 z-0 text-white bg-black">
        <img 
          src="/bg.jpg" 
          className="w-full h-full object-cover blur-2xl scale-110 brightness-50" 
          alt=""
        />
      </div>
      <div className="fixed inset-0 bg-[#0a0f1e]/70 backdrop-blur-xl z-0"></div>
      
      <div className="relative z-10 flex flex-col h-screen max-w-md mx-auto">
        {children}
      </div>
    </>
  );
}
