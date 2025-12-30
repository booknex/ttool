import { useLocation } from "wouter";
import { useState } from "react";

export function BooknexMascot() {
  const [, setLocation] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    setLocation("/messages");
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed top-20 right-6 z-50 cursor-pointer group"
      title="Click to chat with us!"
    >
      <div className={`relative transition-transform duration-200 ${isHovered ? 'scale-110' : ''}`}>
        <svg
          width="80"
          height="100"
          viewBox="0 0 80 100"
          className="animate-float drop-shadow-lg"
        >
          <defs>
            <linearGradient id="clipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
          </defs>
          
          <g className="animate-wiggle origin-center">
            <path
              d="M55 15 C55 8, 48 3, 40 3 C32 3, 25 8, 25 15 L25 75 C25 82, 32 87, 40 87 C48 87, 55 82, 55 75 L55 25 C55 20, 50 17, 45 17 C40 17, 35 20, 35 25 L35 65"
              fill="none"
              stroke="url(#clipGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
            
            <ellipse
              cx="40"
              cy="35"
              rx="12"
              ry="14"
              fill="white"
              stroke="url(#clipGradient)"
              strokeWidth="2"
            />
            
            <g className="animate-blink">
              <ellipse cx="35" cy="33" rx="3" ry="4" fill="#1e293b" />
              <ellipse cx="45" cy="33" rx="3" ry="4" fill="#1e293b" />
              <ellipse cx="36" cy="32" rx="1" ry="1.5" fill="white" />
              <ellipse cx="46" cy="32" rx="1" ry="1.5" fill="white" />
            </g>
            
            <path
              d="M36 40 Q40 44, 44 40"
              fill="none"
              stroke="#1e293b"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            
            <ellipse cx="30" cy="38" rx="3" ry="2" fill="#fecaca" opacity="0.6" />
            <ellipse cx="50" cy="38" rx="3" ry="2" fill="#fecaca" opacity="0.6" />
          </g>
        </svg>
        
        <div className={`absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-md transition-all duration-300 ${isHovered ? 'scale-110 bg-green-500' : ''}`}>
          <span className="animate-pulse">Chat</span>
        </div>
      </div>
      
      <div className={`absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm transition-all duration-300 whitespace-nowrap ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="font-semibold text-primary">Hi, I'm Booknex!</div>
        <div className="text-gray-600">Click me to send a message</div>
        <div className="absolute top-0 right-4 transform -translate-y-1/2 rotate-45 w-2 h-2 bg-white border-l border-t border-gray-200"></div>
      </div>
    </div>
  );
}
