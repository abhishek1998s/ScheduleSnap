
import React, { useState, useEffect } from 'react';
import { SocialScenario } from '../types';
import { generateSocialScenario } from '../services/geminiService';
import { t } from '../utils/translations';

interface SocialScenarioProps {
  age: number;
  language?: string;
  onComplete: (success: boolean) => void;
  onExit: () => void;
}

export const SocialScenarioPractice: React.FC<SocialScenarioProps> = ({ age, language, onComplete, onExit }) => {
  const [scenario, setScenario] = useState<SocialScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const loadScenario = async () => {
    setLoading(true);
    setSelectedOption(null);
    setShowFeedback(false);
    try {
        const s = await generateSocialScenario(age, language);
        setScenario(s);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadScenario(); }, [age]);

  const handleOptionSelect = (index: number) => {
    setSelectedOption(index);
    setShowFeedback(true);
    if (scenario?.options[index].isAppropriate) {
        setTimeout(() => {
            onComplete(true);
        }, 2000);
    }
  };

  if (loading) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-purple-50">
            <i className="fa-solid fa-users text-4xl text-purple-400 fa-bounce mb-4"></i>
            <p className="font-bold text-gray-500">{t(language, 'settingScene')}</p>
        </div>
     );
  }

  if (!scenario) return null;

  return (
    <div className="h-full bg-purple-50 flex flex-col p-6">
        <div className="flex justify-between items-center mb-6">
            <button onClick={onExit} className="bg-white p-2 rounded-full shadow-sm">
                <i className="fa-solid fa-times"></i>
            </button>
            <div className="bg-purple-200 px-4 py-1 rounded-full text-purple-800 font-bold text-sm">
                {t(language, 'socialSkills')}
            </div>
            <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 text-center">
                <div className="text-6xl mb-4">{scenario.emoji}</div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">{scenario.title}</h2>
                <p className="text-lg text-gray-600">{scenario.description}</p>
            </div>

            <div className="space-y-4">
                <p className="font-bold text-gray-500 ml-2">{t(language, 'whatDo')}</p>
                {scenario.options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        disabled={showFeedback}
                        className={`w-full p-4 rounded-2xl text-left shadow-sm border-2 transition-all
                            ${selectedOption === idx 
                                ? (opt.isAppropriate ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500') 
                                : 'bg-white border-transparent hover:border-purple-200'
                            }
                        `}
                    >
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-700 text-lg">{opt.text}</span>
                            {selectedOption === idx && (
                                <i className={`fa-solid ${opt.isAppropriate ? 'fa-check text-green-500' : 'fa-xmark text-red-500'} text-xl`}></i>
                            )}
                        </div>
                        {selectedOption === idx && (
                            <div className={`mt-2 text-sm font-bold ${opt.isAppropriate ? 'text-green-600' : 'text-red-600'} animate-fadeIn`}>
                                {opt.feedback}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        {showFeedback && scenario.options[selectedOption!].isAppropriate && (
             <button 
                onClick={loadScenario}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg animate-slideUp"
             >
                {t(language, 'tryAnother')}
             </button>
        )}
    </div>
  );
};
