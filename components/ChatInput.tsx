
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Image, Heart, Send, Square, Zap } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAutoSend, setIsAutoSend] = useState(true); // Default to on for "instant" feel
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'hi-IN';

      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript = event.results[i][0].transcript;
            
            if (isAutoSend && finalTranscript.trim()) {
              onSend(finalTranscript.trim());
              setText('');
              // Brief pause to allow recognition to continue if needed, 
              // but usually final result means we can clear and wait
            } else {
              setText((prev) => prev + finalTranscript + ' ');
            }
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start(); // Keep listening if we didn't manually stop
        }
      };
    }
  }, [isAutoSend, onSend, isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Aapka browser speech recognition support nahi karta. Please use Chrome.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSend = () => {
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="p-4 bg-white border-t border-gray-100">
      <div className="flex items-center justify-between mb-2 px-2">
        <button 
          onClick={() => setIsAutoSend(!isAutoSend)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${isAutoSend ? 'text-pink-600 bg-pink-50' : 'text-gray-400 bg-gray-50'}`}
        >
          <Zap className={`w-3.5 h-3.5 ${isAutoSend ? 'fill-current' : ''}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {isAutoSend ? 'Auto-Send On' : 'Auto-Send Off'}
          </span>
        </button>
      </div>

      <div className={`relative flex items-center bg-white border ${isRecording ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'} rounded-[26px] px-4 py-2 transition-all duration-300 shadow-sm`}>
        <button className="p-1.5 mr-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors">
          <Camera className="w-5 h-5 text-white" />
        </button>
        
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRecording ? (isAutoSend ? "Listening... Answer will be instant!" : "Listening...") : "Message..."}
          className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-1 outline-none text-gray-900 placeholder-gray-400"
          disabled={disabled}
        />

        <div className="flex items-center gap-3">
          {text.length > 0 ? (
            <button 
              onClick={handleSend}
              className="text-blue-500 font-bold text-sm hover:text-blue-700 transition-colors pr-1"
            >
              Send
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleRecording}
                className={`p-1 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:text-gray-600 text-gray-800'}`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-6 h-6" />}
              </button>
              {!isRecording && (
                <>
                  <button className="p-1 hover:text-gray-600 text-gray-800">
                    <Image className="w-6 h-6" />
                  </button>
                  <button className="p-1 hover:text-gray-600 text-gray-800">
                    <Heart className="w-6 h-6 text-red-500 fill-none hover:fill-red-500 transition-all" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
