import React from 'react';
import { Info, LogOut, Bell } from 'lucide-react';
import Icon from '../ui/Icon';

export default function Header({ roomId, counts, onInfoClick, onLeaveRoom, onNotify, notifyStatus }) {
  return (
    <header className="chat-header justify-between text-white">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8" />
        <div className="flex flex-col">
          <span className="font-bold text-white leading-tight mt-0.5">Lumo <span className="text-gray-400 font-normal">Room</span></span>
          <div className="text-[10px] text-gray-300 font-medium leading-[1] mt-1 flex gap-2">
            <span>🟢 {counts?.online || 0} Online</span>
            <span>🟡 {counts?.idle || 0} Idle</span>
            <span>⚫ {counts?.offline || 0} Offline</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        {onNotify && (
          <button 
            onClick={onNotify}
            disabled={notifyStatus === 'sending'}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all text-white active:scale-95 ${
              notifyStatus === 'sent'
                ? 'bg-green-500/30 border border-green-500/40 shadow-[0_0_15px_rgba(34,197,94,0.4)]'
                : notifyStatus === 'sending'
                  ? 'bg-yellow-500/20 border border-yellow-500/30 animate-pulse'
                  : 'bg-white/10 border border-white/10 hover:bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
            }`}
            title="Notify others"
          >
            <Bell size={18} className={notifyStatus === 'sent' ? 'text-green-400' : ''} />
          </button>
        )}
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
    </header>
  );
}
