
import React from 'react';
import { AppMode } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  messageCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange, messageCount }) => {
  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-neutral-800 bg-neutral-900/50 p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <i className="fas fa-microchip text-white text-xl"></i>
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">Eon AI</h1>
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Advanced Core</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <button 
          onClick={() => onModeChange(AppMode.CHAT)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentMode === AppMode.CHAT 
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          <i className="fas fa-message text-sm"></i>
          <span className="font-medium">Text Chat</span>
        </button>

        <button 
          onClick={() => onModeChange(AppMode.LIVE)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            currentMode === AppMode.LIVE 
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' 
            : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
          }`}
        >
          <i className="fas fa-headset text-sm"></i>
          <span className="font-medium">Voice Live</span>
        </button>
      </nav>

      <div className="mt-auto pt-6 border-t border-neutral-800">
        <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700/50">
          <p className="text-xs text-neutral-500 mb-1">Session Data</p>
          <p className="text-sm font-semibold">{messageCount} interactions</p>
        </div>
        <p className="text-[10px] text-neutral-600 mt-4 text-center">Powered by Gemini 3.0</p>
      </div>
    </aside>
  );
};

export default Sidebar;
