
import React from 'react';
import { Message, CompanionProfile } from '../types';
import { Phone, Video as VideoIcon } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
  profile: CompanionProfile;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, profile }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex flex-col items-center w-full my-4 opacity-60">
        <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          {message.callType === 'voice' ? <Phone className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
          <span>{message.text}</span>
        </div>
        <span className="text-[9px] text-gray-400 mt-1">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 mr-2 self-end mb-1">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-7 h-7 rounded-full object-cover"
          />
        </div>
      )}
      <div 
        className={`max-w-[75%] px-4 py-2.5 rounded-[22px] text-[15px] leading-tight transition-all duration-200 shadow-sm
          ${isUser 
            ? 'bg-[#3797f0] text-white rounded-br-md' 
            : 'bg-[#efefef] text-black rounded-bl-md'
          }`}
      >
        {message.text}
      </div>
    </div>
  );
};

export default ChatBubble;
