
import React from 'react';
import { t } from '../utils/translations';

interface AACBoardProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
}

export const AACBoard: React.FC<AACBoardProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  const AAC_BUTTONS = [
    { label: t(language, 'yes'), emoji: '✅', color: 'bg-green-500', voice: 'Yes' },
    { label: t(language, 'no'), emoji: '❌', color: 'bg-red-500', voice: 'No' },
    { label: t(language, 'help'), emoji: '🆘', color: 'bg-blue-500', voice: 'I need help' },
    { label: t(language, 'done'), emoji: '🏁', color: 'bg-purple-500', voice: 'I am all done' },
    { label: t(language, 'moreTime'), emoji: '⏰', color: 'bg-orange-500', voice: 'I need more time' },
    { label: t(language, 'break'), emoji: '☕', color: 'bg-yellow-700', voice: 'I need a break' },
  ];

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    // If we have language set in profile, try to use that for synthesis if browser supports
    // Note: This assumes browser supports locale codes, might need mapping 'Spanish' -> 'es-ES' etc.
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center sm:items-center p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-slideUp">
        <div className="bg-gray-100 p-4 flex justify-between items-center border-b">
          <h2 className="text-xl font-bold text-gray-700">{t(language, 'communication')}</h2>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"
          >
            <i className="fa-solid fa-times text-xl"></i>
          </button>
        </div>
        
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AAC_BUTTONS.map((btn) => (
            <button
              key={btn.label}
              onClick={() => speak(btn.voice)}
              className={`${btn.color} text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md active:scale-95 transition-transform h-24 sm:h-32`}
            >
              <span className="text-3xl sm:text-4xl">{btn.emoji}</span>
              <span className="font-bold text-lg">{btn.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
