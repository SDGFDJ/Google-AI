
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppMode, Message } from './types';
import ChatInterface from './components/ChatInterface';
import LiveVoiceInterface from './components/LiveVoiceInterface';
import Sidebar from './components/Sidebar';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.CHAT);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am Eon, your multimodal AI assistant. How can I help you today?',
      timestamp: Date.now()
    }
  ]);

  const toggleMode = useCallback(() => {
    setMode(prev => prev === AppMode.CHAT ? AppMode.LIVE : AppMode.CHAT);
  }, []);

  return (
    <div className="flex h-screen w-full bg-neutral-950 text-neutral-200 overflow-hidden">
      <Sidebar 
        currentMode={mode} 
        onModeChange={setMode} 
        messageCount={messages.length} 
      />
      
      <main className="flex-1 relative flex flex-col items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-5xl h-full flex flex-col relative z-10">
          {mode === AppMode.CHAT ? (
            <ChatInterface 
              messages={messages} 
              onMessagesChange={setMessages} 
              onSwitchToVoice={() => setMode(AppMode.LIVE)}
            />
          ) : (
            <LiveVoiceInterface 
              onClose={() => setMode(AppMode.CHAT)} 
            />
          )}
        </div>

        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/30 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-600/30 blur-[120px] rounded-full" />
        </div>
      </main>
    </div>
  );
};

export default App;
