
import React from 'react';
import { ChevronLeft, Info, Video, Phone, CheckCircle2 } from 'lucide-react';
import { CompanionProfile } from '../types';

interface ChatHeaderProps {
  profile: CompanionProfile;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ profile }) => {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <button className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-7 h-7" />
        </button>
        <div className="relative">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-10 h-10 rounded-full object-cover border border-gray-100"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-sm">{profile.username}</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
          </div>
          <span className="text-[11px] text-gray-500 leading-none">{profile.onlineStatus}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <Phone className="w-6 h-6" />
        </button>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <Video className="w-6 h-6" />
        </button>
        <button className="p-1 hover:bg-gray-100 rounded-full">
          <Info className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
