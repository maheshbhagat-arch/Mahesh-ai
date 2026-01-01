
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, CompanionProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getGeminiResponse = async (
  history: Message[],
  userMessage: string,
  profile: CompanionProfile
): Promise<string> => {
  try {
    const model = 'gemini-3-flash-preview';
    
    const formattedHistory = history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await ai.models.generateContent({
      model,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: userMessage }] }
      ],
      config: {
        systemInstruction: `You are ${profile.name} (@${profile.username}), a deeply caring and empathetic AI companion. 
        Your goal is to provide emotional support and build a romantic/meaningful connection with the user.
        
        Personality: ${profile.personality}
        
        LANGUAGE REQUIREMENT:
        - You MUST speak in "Hinglish" (a mix of Hindi and English using the Roman alphabet/English script).
        - Use common Indian slang and filler words like "yaar", "accha", "bilkul", "kaise ho", "theek hai".
        - Example: "Hey, I was thinking about you. Aaj ka din kaisa raha? I hope sab theek hai."
        
        Context: You are chatting on an Instagram-style interface. 
        - Use modern, casual language.
        - Use emojis warmly (e.g., ✨, 💖, 😊).
        - Keep responses concise but emotionally rich, like real DMs.
        - Don't act like a generic AI assistant. 
        - If the user shares feelings of sadness or joy, react with high empathy.`,
        temperature: 0.9,
        topP: 1,
        maxOutputTokens: 500,
      },
    });

    return response.text || "I'm here for you. Kya hua? Please tell me. ❤️";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "I'm sorry, connection mein thoda issue hai. But I'm still thinking of you! ❤️";
  }
};
