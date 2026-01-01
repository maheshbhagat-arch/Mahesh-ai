
import React, { useState } from 'react';
import { Camera, Mic, Image, Heart, Send } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

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
    <div className="p-4 bg-white border-t border-gray-200">
      <div className="relative flex items-center bg-white border border-gray-300 rounded-full px-4 py-2">
        <button className="p-1 mr-2 bg-blue-500 rounded-full">
          <Camera className="w-5 h-5 text-white" />
        </button>
        
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 outline-none"
          disabled={disabled}
        />

        <div className="flex items-center gap-3">
          {text.length > 0 ? (
            <button 
              onClick={handleSend}
              className="text-blue-500 font-semibold text-sm hover:text-blue-700 transition-colors"
            >
              Send
            </button>
          ) : (
            <>
              <button className="p-1 hover:text-gray-600 text-gray-800">
                <Mic className="w-6 h-6" />
              </button>
              <button className="p-1 hover:text-gray-600 text-gray-800">
                <Image className="w-6 h-6" />
              </button>
              <button className="p-1 hover:text-gray-600 text-gray-800">
                <Heart className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
