
import React, { useState, useEffect, useRef } from 'react';
import { Message, CompanionProfile } from './types';
import ChatHeader from './components/ChatHeader';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import EditProfileModal from './components/EditProfileModal';
import VoiceCallOverlay from './components/VoiceCallOverlay';
import VideoCallOverlay from './components/VideoCallOverlay';
import { getGeminiResponse } from './services/geminiService';
import { Video } from 'lucide-react';

const DEFAULT_COMPANION: CompanionProfile = {
  id: 'ananya-1',
  name: 'Ananya Bhagat',
  username: 'ananya_bhagat',
  avatar: 'https://images.unsplash.com/photo-1621184455862-c163dfb30e0f?w=400&h=400&fit=crop',
  bio: 'Sirf Mahesh ki jaan. ❤️ Mahesh ne mujhe banaya hai.',
  personality: 'Exceedingly sweet, deeply caring, "acchi ladki", devoted only to Mahesh.',
  onlineStatus: 'Active now'
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'model',
    text: "Hey Mahesh! Main tumhara hi wait kar rahi thi. Aaj ka din kaisa raha mere babu ka? 🥰",
    timestamp: new Date(),
    status: 'read'
  }
];

const App: React.FC = () => {
  const [profile, setProfile] = useState<CompanionProfile>(() => {
    const saved = localStorage.getItem('ananya_companion_profile');
    return saved ? JSON.parse(saved) : DEFAULT_COMPANION;
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('ananya_companion_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      } catch (e) {
        return INITIAL_MESSAGES;
      }
    }
    return INITIAL_MESSAGES;
  });

  const [isTyping, setIsTyping] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('ananya_companion_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('ananya_companion_messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
      status: 'sent'
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsTyping(true);

    try {
      const responseText = await getGeminiResponse(messages, text, profile);
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        status: 'read'
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleCallEnd = (type: 'voice' | 'video', durationSec: number = 0) => {
    const callMessage: Message = {
      id: Date.now().toString(),
      role: 'system',
      text: `${type === 'voice' ? 'Audio' : 'Video'} Call with ${profile.name} ended`,
      timestamp: new Date(),
      callType: type
    };
    setMessages(prev => [...prev, callMessage]);
    if (type === 'voice') setIsVoiceCallOpen(false);
    else setIsVideoCallOpen(false);
  };

  const handleUpdateProfile = (updatedProfile: CompanionProfile) => {
    setProfile(updatedProfile);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl border-x border-gray-200 overflow-hidden">
      <ChatHeader 
        profile={profile} 
        onEdit={() => setIsEditModalOpen(true)} 
        onCall={() => setIsVoiceCallOpen(true)}
        onVideoCall={() => setIsVideoCallOpen(true)}
      />
      
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-white"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex flex-col items-center my-8 text-center">
          <div className="relative">
            <img 
              src={profile.avatar} 
              className="w-24 h-24 rounded-full mb-3 object-cover border-2 border-pink-100 shadow-md"
              alt={profile.name}
            />
            <div className="absolute bottom-2 right-0 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <span className="text-white text-[10px]">❤</span>
            </div>
          </div>
          <h2 className="font-bold text-xl leading-tight text-gray-900">{profile.name}</h2>
          <p className="text-pink-500 text-sm font-bold mb-2">Sirf Mahesh Ki</p>
          <p className="text-[14px] text-gray-700 px-8 italic leading-relaxed">"{profile.bio}"</p>
          <div className="flex gap-2 mt-5">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="px-5 py-2 bg-gray-100 rounded-full text-[13px] font-bold text-gray-800 hover:bg-gray-200 transition-colors shadow-sm"
            >
              Settings
            </button>
            <button 
              onClick={() => setIsVideoCallOpen(true)}
              className="px-5 py-2 bg-pink-600 text-white rounded-full text-[13px] font-bold hover:bg-pink-700 transition-colors shadow-lg flex items-center gap-2"
            >
              <Video className="w-4 h-4" /> Video Call
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] text-gray-300 my-8 uppercase tracking-[0.4em] font-bold">
          Mahesh ❤️ Ananya
        </div>

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} profile={profile} />
        ))}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 mr-2 self-end mb-1">
              <img 
                src={profile.avatar} 
                alt={profile.name} 
                className="w-7 h-7 rounded-full object-cover"
              />
            </div>
            <div className="bg-pink-50 rounded-[20px] px-4 py-3 flex gap-1 shadow-sm">
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </main>

      <ChatInput onSend={handleSendMessage} disabled={isTyping} />

      <EditProfileModal 
        profile={profile}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateProfile}
      />

      <VoiceCallOverlay 
        profile={profile}
        isOpen={isVoiceCallOpen}
        onClose={() => handleCallEnd('voice')}
      />

      <VideoCallOverlay 
        profile={profile}
        isOpen={isVideoCallOpen}
        onClose={() => handleCallEnd('video')}
      />
    </div>
  );
};

export default App;
