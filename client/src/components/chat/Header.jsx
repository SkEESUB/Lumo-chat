import React from 'react';
import { Info, LogOut } from 'lucide-react';
import Icon from '../ui/Icon';

export default function Header({ roomId, onlineCount, onInfoClick, onLeaveRoom }) {
  return (
    <div className="h-16 shrink-0 border-b border-white/10 flex items-center justify-between px-4 bg-black/40 backdrop-blur-md sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8" />
        <div className="flex flex-col">
          <span className="font-bold text-white leading-tight mt-0.5">Lumo <span className="text-gray-400 font-normal">Room</span></span>
          <span className="text-[10px] text-brand-300/80 font-medium leading-[1]">{onlineCount} online</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onInfoClick} 
          className="p-2 text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors md:hidden"
        >
          <Info size={20} />
        </button>
        <button 
          onClick={onLeaveRoom} 
          className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors md:hidden"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
}
