
import React, { useState, useEffect } from 'react';
import { t } from '../utils/translations';

interface WaitTimerProps {
  onExit: () => void;
  language?: string;
}

export const WaitTimer: React.FC<WaitTimerProps> = ({ onExit, language }) => {
  const [duration, setDuration] = useState<number | null>(null); // in seconds
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isRunning && timeLeft !== null && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev !== null ? prev - 1 : 0);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play alarm sound or celebrate
      const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
      audio.play().catch(() => {});
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  const startTimer = (min: number) => {
    const sec = min * 60;
    setDuration(sec);
    setTimeLeft(sec);
    setIsRunning(true);
  };

  const calculateDashOffset = () => {
    if (duration === null || timeLeft === null) return 0;
    const fraction = timeLeft / duration;
    // Circumference of circle r=60 is roughly 377
    return 377 * (1 - fraction);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 flex items-center justify-between shrink-0">
         <button onClick={onExit}><i className="fa-solid fa-arrow-left text-2xl text-gray-400"></i></button>
         <h2 className="text-xl font-bold text-gray-700">{t(language, 'waitTimer')}</h2>
         <div className="w-8"></div>
      </div>

      <div className="flex-1 overflow-y-auto w-full">
         <div className="min-h-full flex flex-col items-center justify-center p-6 gap-8">
            {/* Visual Timer Display */}
            <div className="relative w-64 h-64 flex items-center justify-center shrink-0">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
                    <circle cx="128" cy="128" r="60" stroke="#f3f4f6" strokeWidth="120" fill="none" />
                    {duration && timeLeft !== null && (
                        <circle 
                            cx="128" cy="128" r="60" 
                            stroke={timeLeft < 10 ? '#ef4444' : '#3b82f6'} 
                            strokeWidth="120" 
                            fill="none" 
                            strokeDasharray="377"
                            strokeDashoffset={calculateDashOffset()}
                            className="transition-[stroke-dashoffset] duration-1000 linear"
                        />
                    )}
                </svg>
                {/* Centered Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                    {timeLeft !== null ? (
                        <>
                            <div className="text-6xl font-bold text-gray-800 drop-shadow-sm">
                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="text-gray-600 font-bold">{timeLeft === 0 ? t(language, 'done') : t(language, 'waiting')}</div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center text-gray-400">
                            <i className="fa-solid fa-hourglass-start text-5xl mb-2"></i>
                            <span className="font-bold text-lg">{t(language, 'setTime')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <div className="w-full max-w-md grid grid-cols-2 gap-4">
                {[1, 2, 5, 10].map(min => (
                    <button 
                        key={min}
                        onClick={() => startTimer(min)}
                        className="bg-blue-50 text-blue-600 font-bold py-4 rounded-xl border-2 border-blue-100 active:bg-blue-500 active:text-white transition-colors"
                    >
                        {min} Min
                    </button>
                ))}
            </div>
            
            {isRunning && (
                <button 
                    onClick={() => setIsRunning(false)}
                    className="w-full max-w-md bg-red-100 text-red-500 font-bold py-4 rounded-xl"
                >
                    {t(language, 'pause')}
                </button>
            )}
            {!isRunning && timeLeft !== null && timeLeft > 0 && (
                <button 
                    onClick={() => setIsRunning(true)}
                    className="w-full max-w-md bg-green-100 text-green-600 font-bold py-4 rounded-xl"
                >
                    {t(language, 'resume')}
                </button>
            )}
         </div>
      </div>
    </div>
  );
};
