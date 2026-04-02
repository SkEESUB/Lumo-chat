import React from 'react';

export default function ChatLayout({ children }) {
  return (
    <div className="h-[100dvh] flex flex-col bg-[#020617] overflow-hidden">
      {children}
    </div>
  );
}
