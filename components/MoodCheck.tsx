
import React, { useState } from 'react';
import { ChildProfile, MoodEntry } from '../types';
import { generateCopingStrategy } from '../services/geminiService';
import { t } from '../utils/translations';

interface MoodCheckProps {
  profile: ChildProfile;
  onSave: (entry: MoodEntry) => void;
  onExit: () => void;
}

const MOODS = [
  { label: 'Happy', emoji: '😊', color: 'bg-green-100 border-green-300' },
  { label: 'Okay', emoji: '😐', color: 'bg-gray-100 border-gray-300' },
  { label: 'Sad', emoji: '😢', color: 'bg-blue-100 border-blue-300' },
  { label: 'Angry', emoji: '😠', color: 'bg-red-100 border-red-300' },
  { label: 'Tired', emoji: '😴', color: 'bg-purple-100 border-purple-300' },
  { label: 'Scared', emoji: '😰', color: 'bg-orange-100 border-orange-300' },
];

export const MoodCheck: React.FC<MoodCheckProps> = ({ profile, onSave, onExit }) => {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const lang = profile.language;

  const handleSelect = async (mood: string) => {
    setSelectedMood(mood);
    setLoading(true);
    
    // Save Log
    onSave({
        id: Date.now().toString(),
        timestamp: Date.now(),
        mood: mood as any
    });

    // If negative mood, get strategies
    if (['Sad', 'Angry', 'Scared', 'Tired'].includes(mood)) {
        try {
            const result = await generateCopingStrategy(mood, profile);
            setStrategies(result);
        } catch (e) {
            setStrategies(["Take deep breaths 🌬️", "Hug a soft toy 🧸"]);
        }
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full bg-blue-50">
       <div className="p-6 flex justify-between items-center">
         <button onClick={onExit}><i className="fa-solid fa-arrow-left text-2xl text-gray-600"></i></button>
         <h1 className="text-2xl font-bold text-gray-800">{t(lang, 'howFeeling')}</h1>
         <div className="w-8"></div>
       </div>

       <div className="flex-1 overflow-y-auto p-6">
          {!selectedMood ? (
             <div className="grid grid-cols-2 gap-4">
               {MOODS.map(m => (
                 <button 
                   key={m.label}
                   onClick={() => handleSelect(m.label)}
                   className={`aspect-square rounded-3xl border-4 ${m.color} flex flex-col items-center justify-center gap-2 shadow-sm hover:scale-105 transition-transform`}
                 >
                    <span className="text-6xl">{m.emoji}</span>
                    <span className="text-lg font-bold text-gray-700">{m.label}</span>
                 </button>
               ))}
             </div>
          ) : (
             <div className="flex flex-col items-center gap-6 animate-fadeIn">
                <div className="text-8xl bounce">
                    {MOODS.find(m => m.label === selectedMood)?.emoji}
                </div>
                <h2 className="text-2xl font-bold text-gray-800">{t(lang, 'youAreFeeling')} {selectedMood}</h2>
                
                {loading && (
                    <div className="flex items-center gap-2 text-primary">
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                        {t(lang, 'thinkingIdeas')}
                    </div>
                )}

                {strategies.length > 0 && (
                    <div className="w-full bg-white rounded-3xl p-6 shadow-md">
                        <h3 className="text-lg font-bold text-primary mb-4">{t(lang, 'letsTry')}:</h3>
                        <div className="space-y-3">
                            {strategies.map((s, i) => (
                                <div key={i} className="bg-primary/10 p-4 rounded-xl flex items-center gap-3">
                                    <span className="text-primary font-bold">{i+1}.</span>
                                    <span className="text-lg">{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                  onClick={onExit}
                  className="mt-8 bg-primary text-white px-8 py-3 rounded-full font-bold shadow-lg"
                >
                    {t(lang, 'feelBetter')}
                </button>
             </div>
          )}
       </div>
    </div>
  );
};
