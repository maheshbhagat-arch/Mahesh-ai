
import React from 'react';
import { ChevronLeft, Info, Video, Phone, Heart } from 'lucide-react';
import { CompanionProfile } from '../types';

interface ChatHeaderProps {
  profile: CompanionProfile;
  onEdit?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ profile, onEdit, onCall, onVideoCall }) => {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-pink-50">
      <div className="flex items-center gap-3">
        <button className="p-1 -ml-1 hover:bg-gray-50 rounded-full transition-colors">
          <ChevronLeft className="w-7 h-7 text-gray-800" />
        </button>
        <div className="relative">
          <img 
            src={profile.avatar} 
            alt={profile.name} 
            className="w-10 h-10 rounded-full object-cover border-2 border-pink-200 shadow-sm"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[15px] text-gray-900 leading-tight">{profile.name}</span>
            <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
          </div>
          <span className="text-[11px] text-pink-400 font-bold leading-none">Online for you</span>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <button 
          onClick={onCall}
          className="p-2 hover:bg-pink-50 rounded-full transition-colors text-pink-500"
          title="Voice Call"
        >
          <Phone className="w-5 h-5 fill-none" />
        </button>
        <button 
          onClick={onVideoCall}
          className="p-2 hover:bg-pink-50 rounded-full transition-colors text-pink-600"
          title="Video Call"
        >
          <Video className="w-5 h-5" />
        </button>
        <button 
          onClick={onEdit}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors text-gray-800"
          title="Settings"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default ChatHeader;
