
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decode, decodeAudioData, float32ToInt16Blob } from '../services/audioUtils';
import { VoiceTranscript } from '../types';

interface LiveVoiceInterfaceProps {
  onClose: () => void;
}

const LiveVoiceInterface: React.FC<LiveVoiceInterfaceProps> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [transcripts, setTranscripts] = useState<VoiceTranscript[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<GainNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const transcriptionRef = useRef({ input: '', output: '' });
  const transcriptScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (transcriptScrollRef.current) {
      transcriptScrollRef.current.scrollTop = transcriptScrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  const startSession = async () => {
    if (isActive) return;
    setIsConnecting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputNodeRef.current = audioContextRef.current.createGain();
      outputNodeRef.current = outputAudioContextRef.current.createGain();
      outputNodeRef.current.connect(outputAudioContextRef.current.destination);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            console.log('Session opened');
            setIsActive(true);
            setIsConnecting(false);

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = float32ToInt16Blob(inputData);
              
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: { data: pcmBlob, mimeType: 'audio/pcm;rate=16000' } });
              });
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Audio handling
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                outputAudioContextRef.current,
                24000,
                1
              );
              const source = outputAudioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNodeRef.current!);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            // Transcription handling
            if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.input += message.serverContent.inputTranscription.text;
            }
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.output += message.serverContent.outputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              const input = transcriptionRef.current.input;
              const output = transcriptionRef.current.output;
              
              setTranscripts(prev => [
                ...prev,
                { role: 'user', text: input, timestamp: Date.now() },
                { role: 'assistant', text: output, timestamp: Date.now() }
              ]);
              
              transcriptionRef.current = { input: '', output: '' };
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => {
            console.log('Session closed');
            setIsActive(false);
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setIsActive(false);
            setIsConnecting(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are Eon, a helpful AI assistant. Keep responses concise and conversational.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (error) {
      console.error('Failed to start session:', error);
      setIsConnecting(false);
    }
  };

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
    }
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex-1 glass rounded-3xl p-8 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl border border-white/5">
        
        {/* Connection Animation Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-20 pointer-events-none transition-opacity duration-500" style={{ opacity: isActive ? 0 : 1 }}>
          <div className="w-24 h-24 rounded-full border-4 border-t-blue-500 border-neutral-800 animate-spin mb-6"></div>
          <p className="text-neutral-400 font-medium tracking-wide">Initializing Voice Core...</p>
        </div>

        {/* Visualizer Circle */}
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
          {isActive && (
            <>
              <div className="absolute inset-0 bg-blue-500/10 rounded-full voice-active-ring"></div>
              <div className="absolute inset-0 bg-blue-500/5 rounded-full voice-active-ring delay-300"></div>
              <div className="absolute inset-0 bg-blue-500/5 rounded-full voice-active-ring delay-700"></div>
            </>
          )}
          <div className={`w-48 h-48 rounded-full flex items-center justify-center z-10 transition-all duration-500 shadow-2xl ${
            isActive ? 'bg-gradient-to-tr from-blue-600 to-indigo-500 scale-110 shadow-blue-500/40' : 'bg-neutral-800'
          }`}>
            <i className={`fas ${isActive ? 'fa-microphone-lines' : 'fa-microphone'} text-5xl text-white`}></i>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold tracking-tight">
            {isActive ? 'Listening...' : 'Voice Interface'}
          </h2>
          <p className="text-neutral-500 max-w-sm mx-auto text-sm leading-relaxed">
            {isActive 
              ? 'I can hear you. Speak naturally, ask questions, or just chat.' 
              : 'Prepare for a low-latency voice conversation with Gemini 2.5.'}
          </p>
        </div>

        {/* Controls */}
        <div className="mt-12 flex items-center gap-6">
          <button 
            onClick={isActive ? stopSession : startSession}
            disabled={isConnecting}
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl ${
              isActive 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
              : 'bg-green-600 hover:bg-green-500 shadow-green-500/20'
            }`}
          >
            <i className={`fas ${isActive ? 'fa-stop' : 'fa-play'} text-xl text-white`}></i>
          </button>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      </div>

      {/* Transcript Log */}
      <div className="h-48 glass rounded-3xl p-6 overflow-hidden flex flex-col border border-white/5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4 flex items-center gap-2">
          <i className="fas fa-file-lines"></i>
          Live Transcript
        </h3>
        <div ref={transcriptScrollRef} className="flex-1 overflow-y-auto space-y-3 scrollbar-hide text-sm">
          {transcripts.length === 0 ? (
            <p className="text-neutral-600 italic">Conversational history will appear here...</p>
          ) : (
            transcripts.map((t, i) => (
              <div key={i} className={`flex gap-3 ${t.role === 'user' ? 'text-blue-400' : 'text-neutral-300'}`}>
                <span className="font-bold opacity-50 uppercase text-[10px] w-12 pt-0.5">{t.role}:</span>
                <span className="flex-1">{t.text}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveVoiceInterface;
