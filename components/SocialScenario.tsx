
import React, { useState, useEffect } from 'react';
import { SocialScenario, ChildProfile } from '../types';
import { generateSocialScenario } from '../services/geminiService';
import { t } from '../utils/translations';

interface SocialScenarioProps {
  age: number;
  language?: string;
  profile?: ChildProfile; // NEW
  audioEnabled?: boolean; // NEW
  onComplete: (success: boolean) => void;
  onExit: () => void;
}

export const SocialScenarioPractice: React.FC<SocialScenarioProps> = ({ age, language, profile, audioEnabled = true, onComplete, onExit }) => {
  const [scenario, setScenario] = useState<SocialScenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // TTS Helper
  const speak = (text: string) => {
    if (!audioEnabled) return;
    if (profile?.sensoryProfile?.soundSensitivity === 'high') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile?.audioPreferences?.speechRate || 1;

    if (profile?.audioPreferences?.voiceId) {
        const voices = window.speechSynthesis.getVoices();
        const voiceId = profile.audioPreferences.voiceId;
        const isMale = ['Kore', 'Fenrir', 'Charon'].includes(voiceId);
        const isFemale = ['Puck', 'Aoede'].includes(voiceId);
        const langCode = profile.language === 'Spanish' ? 'es' : profile.language === 'Hindi' ? 'hi' : 'en';
        
        const langVoices = voices.filter(v => v.lang.startsWith(langCode));
        let selectedVoice = langVoices[0];

        if (isMale) {
            selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('google us english')) || langVoices[0];
        } else if (isFemale) {
            selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')) || langVoices[0];
        }
        
        if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const loadScenario = async () => {
    setLoading(true);
    setSelectedOption(null);
    setShowFeedback(false);
    try {
        const s = await generateSocialScenario(age, language || 'English');
        setScenario(s);
        speak(s.description);
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
    
    const feedback = scenario?.options[index].feedback || '';
    speak(feedback);

    if (scenario?.options[index].isAppropriate) {
        setTimeout(() => {
            onComplete(true);
        }, 3000);
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
        <div className="flex justify-between items-center mb-6 shrink-0">
            <button onClick={onExit} className="bg-white p-2 rounded-full shadow-sm">
                <i className="fa-solid fa-times"></i>
            </button>
            <div className="bg-purple-200 px-4 py-1 rounded-full text-purple-800 font-bold text-sm">
                {t(language, 'socialSkills')}
            </div>
            <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
            <div className="min-h-full flex flex-col justify-center">
                <div className="bg-white p-6 rounded-3xl shadow-sm mb-6 text-center relative">
                    <button 
                        onClick={() => speak(scenario.description)}
                        className="absolute top-2 right-2 text-purple-300 hover:text-purple-500"
                    >
                        <i className="fa-solid fa-volume-high"></i>
                    </button>
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
        </div>

        {showFeedback && scenario.options[selectedOption!].isAppropriate && (
             <button 
                onClick={loadScenario}
                className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg animate-slideUp shrink-0"
             >
                {t(language, 'tryAnother')}
             </button>
        )}
    </div>
  );
};
