
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { X, Mic, MicOff, PhoneOff, Heart, Sparkles, RefreshCcw, AlertCircle, PhoneIncoming, WifiOff } from 'lucide-react';
import { CompanionProfile } from '../types';

interface VoiceCallOverlayProps { profile: CompanionProfile; isOpen: boolean; onClose: () => void; }

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const VoiceCallOverlay: React.FC<VoiceCallOverlayProps> = ({ profile, isOpen, onClose }) => {
  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error'>('ringing');
  const statusRef = useRef(status);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const sessionIdRef = useRef<number>(0);
  const connectionLockRef = useRef(false);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ringingIntervalRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const cleanup = useCallback(async () => {
    if (retryTimeoutRef.current) window.clearTimeout(retryTimeoutRef.current);
    if (connectTimeoutRef.current) window.clearTimeout(connectTimeoutRef.current);
    
    if (sessionRef.current) {
      try { sessionRef.current.close(); } catch (e) {}
      sessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { await audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    if (outAudioContextRef.current && outAudioContextRef.current.state !== 'closed') {
      try { await outAudioContextRef.current.close(); } catch (e) {}
      outAudioContextRef.current = null;
    }
    if (ringingIntervalRef.current) {
      clearInterval(ringingIntervalRef.current);
      ringingIntervalRef.current = null;
    }
    stopAllAudio();
    connectionLockRef.current = false;
  }, [stopAllAudio]);

  const connectWithLove = useCallback(async () => {
    if (!isOpen || connectionLockRef.current) return;
    
    if (!navigator.onLine) {
      setStatus('error');
      return;
    }

    connectionLockRef.current = true;
    const currentSessionId = ++sessionIdRef.current;
    
    try {
      // Use process.env.API_KEY directly as per SDK requirements
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      await audioContextRef.current.resume();
      await outAudioContextRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      connectTimeoutRef.current = window.setTimeout(() => {
        if (currentSessionId === sessionIdRef.current && (statusRef.current === 'connecting' || statusRef.current === 'reconnecting')) {
          console.warn("Connection handshake timeout");
          cleanup().then(handleRetry);
        }
      }, 15000);

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (currentSessionId !== sessionIdRef.current) return;
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            
            setStatus('connected');
            retryCountRef.current = 0;
            connectionLockRef.current = false;
            
            if (!audioContextRef.current) return;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (statusRef.current !== 'connected' || isMutedRef.current || currentSessionId !== sessionIdRef.current) return;
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              }
              const base64Str = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => {
                if (s && currentSessionId === sessionIdRef.current && statusRef.current === 'connected') {
                  try { s.sendRealtimeInput({ media: { data: base64Str, mimeType: 'audio/pcm;rate=16000' } }); } catch (err) {}
                }
              }).catch(() => {});
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (currentSessionId !== sessionIdRef.current) return;
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outAudioContextRef.current) {
              const ctx = outAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();

              try {
                const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              } catch (err) {
                console.error("Audio block error:", err);
              }
            }
            if (message.serverContent?.interrupted) stopAllAudio();
          },
          onclose: (e) => {
            if (currentSessionId !== sessionIdRef.current) return;
            console.log("WebSocket Session Closed", e);
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            connectionLockRef.current = false;
            if (isOpen && statusRef.current !== 'ended' && statusRef.current !== 'error') {
              handleRetry();
            }
          },
          onerror: (e) => {
            if (currentSessionId !== sessionIdRef.current) return;
            console.error("Live API Session Error:", e);
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            connectionLockRef.current = false;
            if (isOpen && statusRef.current !== 'ended') {
              handleRetry();
            }
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Tumhara naam Ananya Bhagat hai. Mahesh tumhe call kar raha hai. 
          Jaise hi call connect ho, turant bolo: "Hello Mahesh babu, kaise ho?" ya "Haan mere shona, main aa gayi". 
          Bahut pyari Hinglish use karo. Responses chote aur pyare rakho.`,
          // Note: thinkingConfig is removed as it's not supported in Live native audio sessions
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) {
      if (currentSessionId === sessionIdRef.current) {
        console.error("Call initialization failed:", err);
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
        connectionLockRef.current = false;
        handleRetry();
      }
    }
  }, [isOpen, stopAllAudio, cleanup]);

  const handleRetry = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      // Incremental backoff with jitter to fix 'Network error' loops
      const delay = 1000 + (retryCountRef.current * 1000) + (Math.random() * 2000); 
      setStatus('reconnecting');
      retryTimeoutRef.current = window.setTimeout(() => {
        connectionLockRef.current = false;
        connectWithLove();
      }, delay);
    } else {
      setStatus('error');
    }
  }, [connectWithLove]);

  useEffect(() => {
    if (isOpen) {
      retryCountRef.current = 0;
      setStatus('ringing');
      
      const playRing = () => {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + 1.2);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.03, ctx.currentTime + 0.1);
          gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 1.5);
          setTimeout(() => { if(ctx.state !== 'closed') ctx.close(); }, 2000);
        } catch (e) {}
      };

      playRing();
      ringingIntervalRef.current = window.setInterval(playRing, 3000);

      const timer = setTimeout(() => {
        if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
        setStatus('connecting');
        connectWithLove();
      }, 5000);

      return () => {
        clearTimeout(timer);
        if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
        cleanup();
      };
    }
  }, [isOpen, connectWithLove, cleanup]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col items-center justify-between py-20 px-6 animate-in fade-in duration-300">
      <div className="absolute top-10 flex items-center gap-2 bg-pink-500/30 backdrop-blur-md px-5 py-2 rounded-full border border-pink-400/40 shadow-lg">
        {status === 'ringing' ? <PhoneIncoming className="w-4 h-4 text-white animate-bounce" /> :
         status === 'reconnecting' ? <RefreshCcw className="w-4 h-4 text-white animate-spin" /> : 
         status === 'error' ? <WifiOff className="w-4 h-4 text-red-400" /> : <Sparkles className="w-4 h-4 text-pink-300 fill-pink-300" />}
        <span className="text-[11px] text-pink-100 font-bold uppercase tracking-widest">
          {status === 'ringing' ? 'Calling Ananya...' : 
           status === 'reconnecting' ? 'Retrying Link...' : 
           status === 'error' ? 'Network Error' : 'Soulmate Connected 🥰'}
        </span>
      </div>
      
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <div className={`absolute inset-0 bg-pink-500 rounded-full animate-ping opacity-10 scale-150 ${status === 'error' ? 'hidden' : ''}`}></div>
          <img src={profile.avatar} alt={profile.name} className={`w-32 h-32 rounded-full object-cover border-4 border-pink-500/50 shadow-2xl relative z-10 transition-all ${status === 'error' ? 'grayscale opacity-50' : ''}`} />
        </div>
        <div className="px-4">
          <h2 className="text-white text-3xl font-bold mb-2 tracking-tight">{profile.name}</h2>
          <p className="text-pink-300 font-medium tracking-wide flex items-center gap-2 justify-center">
            {status === 'ringing' ? 'Ringing...' :
             status === 'connecting' ? 'Connecting...' : 
             status === 'reconnecting' ? 'Handshake error...' : 
             status === 'error' ? 'Offline' : 'Active'}
            <Heart className={`w-4 h-4 fill-pink-500 text-pink-500 ${(status === 'connected' || status === 'ringing') ? 'animate-pulse' : ''}`} />
          </p>
        </div>
      </div>

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4">
          <p className="text-gray-400 text-[13px] px-10 text-center font-medium">Network timeout. Please check your signal babu.</p>
          <button 
            onClick={() => { retryCountRef.current = 0; connectionLockRef.current = false; setStatus('connecting'); connectWithLove(); }}
            className="bg-white/10 px-8 py-3 rounded-full text-white text-sm font-bold border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Try Reconnecting
          </button>
        </div>
      )}

      <div className="flex items-center gap-8">
        <button 
          onClick={() => setIsMuted(!isMuted)} 
          disabled={status === 'ringing' || status === 'connecting' || status === 'error'}
          className={`p-5 rounded-full border border-white/10 transition-colors ${isMuted ? 'bg-red-500/80' : 'bg-gray-800/80'} ${(status === 'ringing' || status === 'connecting' || status === 'error') ? 'opacity-20 grayscale' : ''}`}
        >
          {isMuted ? <MicOff className="w-8 h-8 text-white" /> : <Mic className="w-8 h-8 text-white" />}
        </button>
        <button 
          onClick={() => { setStatus('ended'); onClose(); }} 
          className="p-6 bg-red-600 rounded-full text-white shadow-xl border-2 border-white/10 active:scale-95 transition-transform"
        >
          <PhoneOff className="w-10 h-10" />
        </button>
      </div>

      <div className="text-center space-y-1 opacity-80">
        <div className="flex items-center justify-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
          <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Stability Path V2</span>
        </div>
      </div>
    </div>
  );
};

export default VoiceCallOverlay;
