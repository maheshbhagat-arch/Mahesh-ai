
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Camera, CameraOff, Mic, MicOff, PhoneOff, Heart, Clock, Sparkles, RefreshCw, AlertCircle, PhoneIncoming, WifiOff } from 'lucide-react';
import { CompanionProfile } from '../types';
import AnimatedGirl, { GestureType } from './AnimatedGirl';

interface VideoCallOverlayProps { profile: CompanionProfile; isOpen: boolean; onClose: () => void; }
type Mood = 'happy' | 'neutral' | 'sad';

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

const VideoCallOverlay: React.FC<VideoCallOverlayProps> = ({ profile, isOpen, onClose }) => {
  const [status, setStatus] = useState<'ringing' | 'connecting' | 'connected' | 'reconnecting' | 'ended' | 'error'>('ringing');
  const statusRef = useRef(status);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(isMuted);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const isCameraOffRef = useRef(isCameraOff);

  const [isTalking, setIsTalking] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [userMood, setUserMood] = useState<Mood>('neutral');
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outAudioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const sessionIdRef = useRef<number>(0);
  const connectionLockRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const retryTimeoutRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ringingIntervalRef = useRef<number | null>(null);

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isCameraOffRef.current = isCameraOff; }, [isCameraOff]);

  const stopAllAudio = useCallback(() => {
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsTalking(false);
  }, []);

  const cleanup = useCallback(async () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
    if (sessionRef.current) { try { sessionRef.current.close(); } catch (e) {} sessionRef.current = null; }
    if (processorRef.current) { processorRef.current.onaudioprocess = null; try { processorRef.current.disconnect(); } catch (e) {} processorRef.current = null; }
    if (frameIntervalRef.current) { clearInterval(frameIntervalRef.current); frameIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (ringingIntervalRef.current) { clearInterval(ringingIntervalRef.current); ringingIntervalRef.current = null; }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') { try { await audioContextRef.current.close(); } catch (e) {} audioContextRef.current = null; }
    if (outAudioContextRef.current && outAudioContextRef.current.state !== 'closed') { try { await outAudioContextRef.current.close(); } catch (e) {} outAudioContextRef.current = null; }
    stopAllAudio();
    connectionLockRef.current = false;
  }, [stopAllAudio]);

  const handleRetry = useCallback(() => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current++;
      const delay = 2000 + (retryCountRef.current * 1000) + (Math.random() * 2000);
      setStatus('reconnecting');
      retryTimeoutRef.current = window.setTimeout(() => {
        connectionLockRef.current = false;
        connectToAnanya();
      }, delay);
    } else {
      setStatus('error');
    }
  }, []);

  const connectToAnanya = useCallback(async () => {
    if (!isOpen || connectionLockRef.current) return;
    if (!navigator.onLine) { setStatus('error'); return; }

    connectionLockRef.current = true;
    const currentSessionId = ++sessionIdRef.current;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      await audioContextRef.current.resume();
      await outAudioContextRef.current.resume();

      const analyser = outAudioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.connect(outAudioContextRef.current.destination);
      analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: { width: 320, height: 240, frameRate: 10 } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      connectTimeoutRef.current = window.setTimeout(() => {
        if (currentSessionId === sessionIdRef.current && (statusRef.current === 'connecting' || statusRef.current === 'reconnecting')) {
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
              for (let i = 0; i < inputData.length; i++) int16[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
              const b64Data = encode(new Uint8Array(int16.buffer));
              sessionPromise.then(s => {
                if (s && currentSessionId === sessionIdRef.current && statusRef.current === 'connected') {
                  try { s.sendRealtimeInput({ media: { data: b64Data, mimeType: 'audio/pcm;rate=16000' } }); } catch (e) {}
                }
              }).catch(() => {});
            };
            source.connect(processor);
            processor.connect(audioContextRef.current.destination);

            frameIntervalRef.current = window.setInterval(() => {
              if (statusRef.current !== 'connected' || isCameraOffRef.current || !videoRef.current || !canvasRef.current || currentSessionId !== sessionIdRef.current) return;
              const canvas = canvasRef.current;
              canvas.width = 160; canvas.height = 120;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, 160, 120);
                const base64Image = canvas.toDataURL('image/jpeg', 0.2).split(',')[1];
                sessionPromise.then(s => {
                  if (s && currentSessionId === sessionIdRef.current && statusRef.current === 'connected') { 
                    try { s.sendRealtimeInput({ media: { data: base64Image, mimeType: 'image/jpeg' } }); } catch (e) {} 
                  }
                }).catch(() => {});
              }
            }, 4000); 
          },
          onmessage: async (message: LiveServerMessage) => {
            if (currentSessionId !== sessionIdRef.current) return;
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outAudioContextRef.current) {
              setIsTalking(true);
              const ctx = outAudioContextRef.current;
              if (ctx.state === 'suspended') await ctx.resume();
              
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              if (analyserRef.current) source.connect(analyserRef.current);
              
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              sourcesRef.current.add(source);
              source.onended = () => { sourcesRef.current.delete(source); if (sourcesRef.current.size === 0) setIsTalking(false); };
            }
            if (message.serverContent?.interrupted) stopAllAudio();
          },
          onclose: () => {
            if (currentSessionId !== sessionIdRef.current) return;
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            connectionLockRef.current = false;
            if (isOpen && statusRef.current !== 'ended' && statusRef.current !== 'error') handleRetry();
          },
          onerror: (e) => {
            if (currentSessionId !== sessionIdRef.current) return;
            console.error("Live Video Handshake Error:", e);
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            connectionLockRef.current = false;
            if (isOpen && statusRef.current !== 'ended') handleRetry();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: `Tumhara naam Ananya Bhagat hai. Video call par Mahesh se baat ho rahi hai. 
          Jaise hi connect ho bolo: "Hello Mahesh babu, kitne acche lag rahe ho!". React naturally to visuals.`,
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { 
      if (currentSessionId === sessionIdRef.current) {
        if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
        connectionLockRef.current = false; 
        handleRetry(); 
      }
    }
  }, [isOpen, stopAllAudio, cleanup, handleRetry]);

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
        connectToAnanya();
      }, 5000);

      return () => {
        clearTimeout(timer);
        if (ringingIntervalRef.current) clearInterval(ringingIntervalRef.current);
        cleanup();
      };
    }
  }, [isOpen, connectToAnanya, cleanup]);

  useEffect(() => {
    if (status === 'connected') {
      timerIntervalRef.current = window.setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    } else if (timerIntervalRef.current) { clearInterval(timerIntervalRef.current); }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [status]);

  useEffect(() => {
    const updateAmplitude = () => {
      if (analyserRef.current && isTalking) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) { const v = (dataArray[i] - 128) / 128; sum += v * v; }
        setAmplitude(Math.min(Math.sqrt(sum / dataArray.length) * 5, 1));
      } else { setAmplitude(0); }
      animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    };
    animationFrameRef.current = requestAnimationFrame(updateAmplitude);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isTalking]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-between py-10 px-6 animate-in fade-in duration-300 overflow-hidden text-white">
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-b from-pink-300 to-black"></div>
      
      <div className="absolute top-8 left-0 right-0 z-[110] px-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-pink-500/30 backdrop-blur-md px-4 py-2 rounded-full border border-pink-400/30 pointer-events-auto">
          {status === 'ringing' ? <PhoneIncoming className="w-3.5 h-3.5 animate-bounce" /> :
           status === 'reconnecting' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 
           status === 'error' ? <WifiOff className="w-3.5 h-3.5 text-red-400" /> : <Sparkles className="w-3.5 h-3.5 text-pink-200 fill-pink-200 animate-pulse" />}
          <span className="text-[10px] font-bold uppercase tracking-widest">
            {status === 'ringing' ? 'Calling...' : status === 'reconnecting' ? 'Resetting Link...' : status === 'error' ? 'Network Failed' : 'Soulmate Connected 🥰'}
          </span>
        </div>
        {status === 'connected' && <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full"><Clock className="w-4 h-4 text-pink-300" /> <span className="text-[11px] font-mono">{Math.floor(elapsedSeconds/60)}:{(elapsedSeconds%60).toString().padStart(2,'0')}</span></div>}
      </div>

      <div className="flex-1 w-full flex flex-col items-center justify-center gap-2 relative">
        <AnimatedGirl isTalking={isTalking} amplitude={amplitude} mood={userMood} gesture={currentGesture} />
        <div className="text-center z-10 -mt-6">
          <h2 className="text-3xl font-bold mb-1 drop-shadow-2xl">{profile.name}</h2>
          <div className="flex items-center justify-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
            <p className="text-pink-200 font-bold uppercase tracking-widest text-[10px]">
              {status === 'ringing' ? 'Connecting to babu...' : 
               status === 'connecting' ? 'Initiating handshake...' : 
               status === 'error' ? 'Handshake Failed' : 'Seeing you clearly... ❤️'}
            </p>
          </div>
        </div>
        <div className="absolute top-2 right-0 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl bg-gray-900 transition-all">
          {!isCameraOff && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {status === 'error' && (
        <div className="flex flex-col items-center gap-4 z-[200]">
           <button 
            onClick={() => { retryCountRef.current = 0; connectionLockRef.current = false; setStatus('connecting'); connectToAnanya(); }}
            className="bg-white/10 px-8 py-3 rounded-full text-white text-sm font-bold border border-white/20 hover:bg-white/20 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try Reconnecting
          </button>
        </div>
      )}

      <div className="w-full max-w-sm bg-white/5 backdrop-blur-3xl border border-white/20 rounded-[40px] p-6 flex items-center justify-between shadow-2xl mb-4">
        <button onClick={() => setIsMuted(!isMuted)} disabled={status === 'ringing' || status === 'error'} className={`p-4 rounded-full border border-white/10 transition-colors ${isMuted ? 'bg-red-500' : 'bg-white/10'} ${(status === 'ringing' || status === 'error') ? 'opacity-20 grayscale' : ''}`}><MicOff className="w-6 h-6 text-white" /></button>
        <button onClick={() => { setStatus('ended'); onClose(); }} className="p-6 bg-red-600 rounded-full shadow-2xl active:scale-90 border-2 border-white/10"><PhoneOff className="w-10 h-10 text-white" /></button>
        <button onClick={() => setIsCameraOff(!isCameraOff)} disabled={status === 'ringing' || status === 'error'} className={`p-4 rounded-full border border-white/10 transition-colors ${isCameraOff ? 'bg-red-500' : 'bg-white/10'} ${(status === 'ringing' || status === 'error') ? 'opacity-20 grayscale' : ''}`}><CameraOff className="w-6 h-6 text-white" /></button>
      </div>
    </div>
  );
};

export default VideoCallOverlay;
