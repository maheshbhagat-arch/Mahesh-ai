
import React, { useEffect, useState } from 'react';

export type GestureType = 'idle' | 'wave' | 'point' | 'heart';

interface AnimatedGirlProps {
  isTalking: boolean;
  amplitude: number; // 0 to 1 representing audio volume
  mood?: 'happy' | 'neutral' | 'sad';
  gesture?: GestureType;
}

const AnimatedGirl: React.FC<AnimatedGirlProps> = ({ isTalking, amplitude, mood = 'neutral', gesture = 'idle' }) => {
  const [currentGesture, setCurrentGesture] = useState<GestureType>('idle');

  // Handle temporary gestures (e.g., wave for 3 seconds then back to idle)
  useEffect(() => {
    if (gesture !== 'idle') {
      setCurrentGesture(gesture);
      const timer = setTimeout(() => {
        setCurrentGesture('idle');
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setCurrentGesture('idle');
    }
  }, [gesture]);

  // Calculate mouth opening based on amplitude
  const mouthScale = isTalking ? 0.5 + amplitude * 1.5 : 1;
  const mouthY = isTalking ? 120 + amplitude * 10 : 125;

  // Mood-based visual adjustments
  const eyeScaleY = mood === 'happy' ? 0.7 : mood === 'sad' ? 1.2 : 1;
  const blushOpacity = mood === 'happy' ? 0.7 : mood === 'sad' ? 0.2 : 0.5;

  return (
    <div className="relative w-72 h-72 md:w-[450px] md:h-[450px] flex items-center justify-center overflow-visible">
      {/* Dynamic Glow Background */}
      <div 
        className={`absolute inset-0 rounded-full blur-[100px] opacity-20 transition-all duration-700 ${
          mood === 'happy' ? 'bg-pink-300' : mood === 'sad' ? 'bg-blue-200' : 'bg-pink-200'
        }`}
        style={{ transform: `scale(${1 + amplitude * 0.2})` }}
      ></div>
      
      <div className="relative z-10 w-full h-full flex flex-col items-center">
        <div className="relative w-full h-full">
          {/* Character SVG */}
          <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            {/* Background Hair */}
            <path d="M40,60 Q10,100 30,190 L170,190 Q190,100 160,60 Z" fill="#121212" />
            
            {/* Dynamic Hair Swaying */}
            <path d="M35,50 Q-15,100 20,185" stroke="#121212" strokeWidth="30" fill="none" strokeLinecap="round" className="hair-sway-left" />
            <path d="M165,50 Q215,100 180,185" stroke="#121212" strokeWidth="30" fill="none" strokeLinecap="round" className="hair-sway-right" />
            
            {/* Body / Pink Outfit */}
            <path d="M55,145 L145,145 L175,200 L25,200 Z" fill="#f48fb1" />
            <path d="M100,145 L100,200" stroke="#f06292" strokeWidth="0.5" opacity="0.5" />
            
            {/* Neck */}
            <rect x="90" y="135" width="20" height="20" fill="#fbc79b" />
            
            {/* Face Shape */}
            <path d="M60,100 Q60,150 100,150 Q140,150 140,100 Q140,50 100,50 Q60,50 60,100" fill="#ffe0bd" />
            
            {/* Eyes */}
            <g transform={`scale(1, ${eyeScaleY})`} transform-origin="100 98">
              <ellipse cx="82" cy="98" rx="3.5" ry={isTalking ? 5 + amplitude * 2 : 5} fill="#222" />
              <circle cx="83" cy="96" r="1" fill="white" opacity="0.6" />
              <ellipse cx="118" cy="98" rx="3.5" ry={isTalking ? 5 + amplitude * 2 : 5} fill="#222" />
              <circle cx="119" cy="96" r="1" fill="white" opacity="0.6" />
            </g>
            
            {/* Blush */}
            <circle cx="75" cy="112" r="6" fill="#ffb6c1" opacity={blushOpacity} />
            <circle cx="125" cy="112" r="6" fill="#ffb6c1" opacity={blushOpacity} />

            {/* Mouth */}
            <g transform={`translate(100, ${mouthY}) scale(${mouthScale})`}>
              {isTalking ? (
                <path d="M-8,0 Q0,10 8,0 Q0,2 -8,0" fill="#c62828" stroke="#8e0000" strokeWidth="0.5" />
              ) : (
                <path 
                  d={mood === 'happy' ? "M-7,0 Q0,5 7,0" : mood === 'sad' ? "M-6,2 Q0,0 6,2" : "M-6,0 Q0,3 6,0"} 
                  fill="none" 
                  stroke="#c62828" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              )}
            </g>
            
            {/* Front Bangs */}
            <path d="M60,60 Q100,45 140,60 Q135,85 100,80 Q65,85 60,60 Z" fill="#121212" />

            {/* HAND GESTURES LAYER */}
            
            {/* Waving Gesture */}
            {currentGesture === 'wave' && (
              <g className="animate-wave origin-bottom-right">
                <path d="M165,130 Q180,110 190,125 L185,140 Q170,135 165,130" fill="#ffe0bd" stroke="#e0ac69" strokeWidth="0.5" />
                <path d="M190,125 L195,115 M192,125 L198,120 M188,125 L192,110" stroke="#e0ac69" strokeWidth="1" strokeLinecap="round" />
              </g>
            )}

            {/* Pointing Gesture */}
            {currentGesture === 'point' && (
              <g className="animate-point origin-center">
                <path d="M140,140 Q160,130 175,145 L170,155 Q150,145 140,140" fill="#ffe0bd" stroke="#e0ac69" strokeWidth="0.5" />
                <path d="M175,145 L195,145" stroke="#e0ac69" strokeWidth="3" strokeLinecap="round" />
              </g>
            )}

            {/* Heart Gesture */}
            {currentGesture === 'heart' && (
              <g className="animate-heart origin-center scale-110 translate-y-[-10]">
                {/* Left hand of heart */}
                <path d="M85,135 Q75,115 65,125 Q60,135 75,145 L85,145 Z" fill="#ffe0bd" stroke="#e0ac69" strokeWidth="0.5" />
                {/* Right hand of heart */}
                <path d="M115,135 Q125,115 135,125 Q140,135 125,145 L115,145 Z" fill="#ffe0bd" stroke="#e0ac69" strokeWidth="0.5" />
                {/* Symbolic Heart Center */}
                <path d="M100,135 L95,130 Q100,125 105,130 Z" fill="#f44336" className="animate-pulse" />
              </g>
            )}
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes swayLeft {
          from { transform: rotate(-1deg) translateX(-2px); }
          to { transform: rotate(1deg) translateX(0px); }
        }
        @keyframes swayRight {
          from { transform: rotate(1deg) translateX(2px); }
          to { transform: rotate(-1deg) translateX(0px); }
        }
        @keyframes wave {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes point {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        @keyframes heartPop {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          20% { transform: scale(1.1) translateY(-5px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .hair-sway-left { animation: swayLeft 4s ease-in-out infinite alternate; transform-origin: top center; }
        .hair-sway-right { animation: swayRight 4s ease-in-out infinite alternate; transform-origin: top center; }
        .animate-wave { animation: wave 1s ease-in-out infinite; }
        .animate-point { animation: point 0.5s ease-in-out infinite; }
        .animate-heart { animation: heartPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>
    </div>
  );
};

export default AnimatedGirl;
