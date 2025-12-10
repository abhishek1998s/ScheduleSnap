
import React, { useEffect, useState } from 'react';
import { t } from '../utils/translations';

interface CalmModeProps {
  onExit: () => void;
  language?: string;
}

export const CalmMode: React.FC<CalmModeProps> = ({ onExit, language }) => {
  const [phase, setPhase] = useState<'In' | 'Hold' | 'Out'>('In');
  const [text, setText] = useState(t(language, 'breatheIn'));

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    
    const cycle = () => {
      // In: 4s
      setPhase('In');
      setText(t(language, 'breatheIn') + ' 🌬️');
      
      timeout = setTimeout(() => {
        // Hold: 4s
        setPhase('Hold');
        setText(t(language, 'hold') + ' ⏸️');
        
        timeout = setTimeout(() => {
          // Out: 4s
          setPhase('Out');
          setText(t(language, 'breatheOut') + ' 💨');
          
          timeout = setTimeout(() => {
            cycle();
          }, 4000);
        }, 4000);
      }, 4000);
    };

    cycle();

    return () => clearTimeout(timeout);
  }, [language]); // Depend on language to update text if props change

  return (
    <div className="fixed inset-0 z-50 bg-[#C8E6C9] flex flex-col items-center justify-center text-primary">
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 bg-white/50 p-3 rounded-full hover:bg-white/80 transition-colors"
      >
        <i className="fa-solid fa-times text-2xl"></i>
      </button>

      <h1 className="text-4xl font-bold mb-12 animate-pulse-slow">{t(language, 'calmDownCorner')}</h1>

      <div className={`relative flex items-center justify-center transition-all duration-[4000ms] ease-in-out
        ${phase === 'In' ? 'scale-150' : phase === 'Out' ? 'scale-75' : 'scale-150'}
      `}>
        <div className="w-64 h-64 bg-white/30 rounded-full absolute animate-ping opacity-20"></div>
        <div className="w-48 h-48 bg-primary/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/50">
           <span className="text-6xl">
             {phase === 'In' ? '🌬️' : phase === 'Hold' ? '😌' : '💨'}
           </span>
        </div>
      </div>

      <div className="mt-12 text-3xl font-bold text-primary/80 min-h-[3rem]">
        {text}
      </div>
      
      <p className="mt-4 text-primary/60">{t(language, 'followCircle')}</p>
    </div>
  );
};
