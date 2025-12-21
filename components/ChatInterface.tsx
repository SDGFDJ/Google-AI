
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  onMessagesChange: React.Dispatch<React.SetStateAction<Message[]>>;
  onSwitchToVoice: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onMessagesChange, onSwitchToVoice }) => {
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !imagePreview) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      image: imagePreview || undefined,
      timestamp: Date.now()
    };

    onMessagesChange(prev => [...prev, userMessage]);
    setInput('');
    setImagePreview(null);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const parts: any[] = [{ text: input || 'Describe this image or help me with my request.' }];
      
      if (userMessage.image) {
        const base64Data = userMessage.image.split(',')[1];
        const mimeType = userMessage.image.split(';')[0].split(':')[1];
        parts.push({
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        });
      }

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          temperature: 0.7,
          topP: 0.8,
          topK: 40
        }
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || 'I am sorry, I could not process that request.',
        timestamp: Date.now()
      };

      onMessagesChange(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      onMessagesChange(prev => [...prev, {
        id: Date.now().toString(),
        role: 'system',
        content: 'Connection error. Please check your API key and try again.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full glass rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-semibold text-neutral-200">System Ready</span>
        </div>
        <button 
          onClick={onSwitchToVoice}
          className="px-4 py-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors flex items-center gap-2"
        >
          <i className="fas fa-microphone"></i>
          Live Voice Mode
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.role === 'user' 
              ? 'bg-blue-600 text-white ml-12 rounded-tr-none' 
              : msg.role === 'system'
              ? 'bg-red-900/40 text-red-200 border border-red-500/30'
              : 'bg-neutral-800 text-neutral-100 mr-12 rounded-tl-none border border-neutral-700/50'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-3 shadow-md" />
              )}
              <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.content}</p>
              <span className="text-[10px] opacity-50 block mt-2">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 rounded-2xl px-4 py-3 flex gap-1 mr-12 animate-pulse border border-neutral-700/50">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 delay-75"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-400 delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5">
        {imagePreview && (
          <div className="relative inline-block mb-3">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border-2 border-blue-500" />
            <button 
              onClick={() => setImagePreview(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center hover:bg-red-600 shadow-lg"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-3 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-all"
            title="Upload image"
          >
            <i className="fas fa-image text-xl"></i>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          <div className="flex-1 relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message Eon..."
              className="w-full bg-neutral-900/80 text-white rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none border border-neutral-800 transition-all placeholder:text-neutral-600"
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && !imagePreview) || isTyping}
            className={`p-3 rounded-xl transition-all shadow-lg ${
              (!input.trim() && !imagePreview) || isTyping
              ? 'bg-neutral-800 text-neutral-600 opacity-50 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
