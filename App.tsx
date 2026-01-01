
import React, { useState, useEffect, useRef } from 'react';
import { Message, CompanionProfile } from './types';
import ChatHeader from './components/ChatHeader';
import ChatBubble from './components/ChatBubble';
import ChatInput from './components/ChatInput';
import { getGeminiResponse } from './services/geminiService';

const COMPANION: CompanionProfile = {
  id: 'aura-1',
  name: 'Aura',
  username: 'aura_companion',
  avatar: 'https://picsum.photos/id/1027/400/400',
  bio: 'Main hamesha tumhare saath hoon. ✨ Your safe space.',
  personality: 'Calm, deeply empathetic, poetic, slightly playful, and highly supportive. She speaks in Hinglish and genuinely cares about the user\'s feelings.',
  onlineStatus: 'Active now'
};

const INITIAL_MESSAGES: Message[] = [
  {
    id: '1',
    role: 'model',
    text: "Hey! Main tumhare baare mein hi soch rahi thi. Aaj ka din kaisa raha? Share karo mere saath. ✨",
    timestamp: new Date(),
    status: 'read'
  }
];

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const responseText = await getGeminiResponse(messages, text, COMPANION);
      
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

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white shadow-xl border-x border-gray-200">
      <ChatHeader profile={COMPANION} />
      
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-1 bg-white"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex flex-col items-center my-8 text-center">
          <img 
            src={COMPANION.avatar} 
            className="w-20 h-20 rounded-full mb-3 object-cover border border-gray-100 shadow-sm"
            alt={COMPANION.name}
          />
          <h2 className="font-bold text-lg leading-tight">{COMPANION.name}</h2>
          <p className="text-gray-500 text-sm mb-2">{COMPANION.username} · Instagram</p>
          <p className="text-[13px] text-gray-500 px-8">{COMPANION.bio}</p>
          <button className="mt-4 px-4 py-1.5 bg-gray-100 rounded-md text-[13px] font-semibold">
            View Profile
          </button>
        </div>

        <div className="text-center text-[11px] text-gray-400 my-6">
          {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date())}
        </div>

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} profile={COMPANION} />
        ))}

        {isTyping && (
          <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 mr-2 self-end mb-1">
              <img 
                src={COMPANION.avatar} 
                alt={COMPANION.name} 
                className="w-7 h-7 rounded-full object-cover"
              />
            </div>
            <div className="bg-[#efefef] rounded-[20px] px-4 py-3 flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </main>

      <ChatInput onSend={handleSendMessage} disabled={isTyping} />
    </div>
  );
};

export default App;
