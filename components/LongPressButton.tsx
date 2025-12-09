
import React, { useState, useEffect, useRef } from 'react';

interface LongPressButtonProps {
  onComplete: () => void;
  duration?: number; // ms, default 3000
  children: React.ReactNode;
  className?: string;
  activeColor?: string;
}

export const LongPressButton: React.FC<LongPressButtonProps> = ({ 
  onComplete, 
  duration = 3000, 
  children, 
  className = "",
  activeColor = "#ef4444" // red-500
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent default context menu on mobile
    if (e.type === 'contextmenu') e.preventDefault();
    
    setIsPressing(true);
    startTimeRef.current = Date.now();
    setProgress(0);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);

      if (p >= 100) {
        stopPress();
        onComplete();
      }
    }, 50);
  };

  const stopPress = () => {
    setIsPressing(false);
    setProgress(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return (
    <button
      onMouseDown={startPress}
      onMouseUp={stopPress}
      onMouseLeave={stopPress}
      onTouchStart={startPress}
      onTouchEnd={stopPress}
      className={`relative overflow-hidden select-none ${className}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Background Progress Fill */}
      {isPressing && (
        <div 
          className="absolute inset-0 opacity-20 transition-all duration-75 ease-linear"
          style={{ 
            width: `${progress}%`,
            backgroundColor: activeColor
          }}
        />
      )}
      
      {/* Visual Circular Indicator (appears when pressing) */}
      {isPressing && (
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <svg width="40" height="40" viewBox="0 0 40 40" className="transform -rotate-90">
                <circle cx="20" cy="20" r="16" fill="none" stroke="#e5e7eb" strokeWidth="4" />
                <circle 
                    cx="20" cy="20" r="16" 
                    fill="none" 
                    stroke={activeColor} 
                    strokeWidth="4" 
                    strokeDasharray="100"
                    strokeDashoffset={100 - progress}
                />
            </svg>
         </div>
      )}

      <div className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
};
