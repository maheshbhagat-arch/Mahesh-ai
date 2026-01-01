
import React from 'react';
import { Message, CompanionProfile } from '../types';

interface ChatBubbleProps {
  message: Message;
  profile: CompanionProfile;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, profile }) => {
  const isUser = message.role === 'user';

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
        className={`max-w-[75%] px-4 py-2.5 rounded-[22px] text-[15px] leading-tight transition-all duration-200
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
