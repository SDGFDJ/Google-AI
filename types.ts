
export enum AppMode {
  CHAT = 'CHAT',
  LIVE = 'LIVE'
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  image?: string;
}

export interface VoiceTranscript {
  text: string;
  role: 'user' | 'assistant';
  timestamp: number;
}
