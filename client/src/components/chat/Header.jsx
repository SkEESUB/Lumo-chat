import React from 'react';
import { Info, LogOut } from 'lucide-react';
import Icon from '../ui/Icon';

export default function Header({ roomId, onlineCount, onInfoClick, onLeaveRoom }) {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-b border-white/10 bg-white/5 backdrop-blur-xl z-10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8" />
        <div className="flex flex-col">
          <span className="font-bold text-white leading-tight mt-0.5">Lumo <span className="text-gray-400 font-normal">Room</span></span>
          <span className="text-[10px] text-brand-300/80 font-medium leading-[1]">{onlineCount} online</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <button 
          onClick={onInfoClick} 
          className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-r from-cyan-400 to-purple-500 shadow-[0_0_20px_rgba(0,234,255,0.6)] hover:scale-105 active:scale-95 transition-all text-white"
          title="Room Info"
        >
          <Info size={20} />
        </button>
        <button 
          onClick={onLeaveRoom} 
          className="p-2 text-red-300 bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.2)] hover:bg-[rgba(220,38,38,0.2)] rounded-lg transition-all 
          shadow-[0_4px_15px_rgba(220,38,38,0.2)] backdrop-blur-md active:scale-95"
          title="Leave Room"
        >
          <LogOut size={18} className="translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
