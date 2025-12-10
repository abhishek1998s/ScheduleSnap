
import React, { useState, useEffect } from 'react';
import { QuizQuestion, QuizStats } from '../types';
import { generateEmotionQuiz } from '../services/geminiService';
import { t } from '../utils/translations';

interface EmotionQuizProps {
  age: number;
  language?: string;
  stats: QuizStats;
  onUpdateStats: (newStats: QuizStats) => void;
  onExit: () => void;
}

const XP_TO_LEVEL_UP = 100;
const XP_PER_QUESTION = 20;

export const EmotionQuiz: React.FC<EmotionQuizProps> = ({ age, language, stats, onUpdateStats, onExit }) => {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [visualType, setVisualType] = useState<'emoji' | 'cartoon' | 'photo'>('emoji');
  
  // Track previous question's answer to avoid repetition
  const [lastTopic, setLastTopic] = useState<string | undefined>(undefined);

  const loadQuestion = async () => {
    setLoading(true);
    setSelected(null);
    setIsCorrect(null);
    setShowExplanation(false);
    setShowLevelUp(false);
    
    try {
        const q = await generateEmotionQuiz(age, stats.level, language || 'English', lastTopic, visualType);
        setQuestion(q);
        setLastTopic(q.correctAnswer);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { 
      // Reset avoidance when level changes to allow fresh start
      setLastTopic(undefined);
      loadQuestion(); 
  }, [age, stats.level, visualType]); // Reload when visual type changes

  const handleAnswer = (option: string) => {
    if(!question) return;
    setSelected(option);
    
    if (option === question.correctAnswer) {
        setIsCorrect(true);
        setShowExplanation(true);
        
        // Calculate new stats
        let newXp = stats.xp + XP_PER_QUESTION;
        let newLevel = stats.level;
        let leveledUp = false;

        if (newXp >= XP_TO_LEVEL_UP && stats.level < 3) {
            newLevel += 1;
            newXp = 0;
            leveledUp = true;
        }

        const newStats = {
            ...stats,
            xp: newXp,
            level: newLevel,
            totalAnswered: stats.totalAnswered + 1
        };
        
        onUpdateStats(newStats);
        
        if (leveledUp) {
            setTimeout(() => setShowLevelUp(true), 1500);
        }
    } else {
        setIsCorrect(false);
    }
  };

  if (loading) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-yellow-50">
            <i className="fa-solid fa-star text-4xl text-yellow-400 fa-spin mb-4"></i>
            <p className="font-bold text-gray-500">{t(language, 'makingQuiz')}</p>
            <p className="text-xs font-bold text-yellow-600 mt-2 uppercase">{t(language, 'level')} {stats.level}</p>
        </div>
     );
  }

  if (!question) return null;

  return (
    <div className="h-full bg-yellow-50 flex flex-col relative overflow-hidden">
        
        {/* Header with Stats */}
        <div className="flex justify-between items-center p-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
            <button onClick={onExit} className="bg-white p-2 rounded-full shadow-sm">
                <i className="fa-solid fa-times"></i>
            </button>
            
            <div className="flex flex-col items-center w-full max-w-xs mx-4">
                <div className="flex justify-between w-full text-xs font-bold text-yellow-800 mb-1">
                    <span>{t(language, 'level')} {stats.level}</span>
                    <span>{stats.xp} / {XP_TO_LEVEL_UP} XP</span>
                </div>
                <div className="w-full h-3 bg-yellow-200 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-yellow-500 transition-all duration-500"
                        style={{ width: `${(stats.xp / XP_TO_LEVEL_UP) * 100}%` }}
                    ></div>
                </div>
            </div>
            
            <div className="bg-yellow-100 p-2 rounded-full text-yellow-600 font-bold text-sm">
                 {t(language, 'quiz')}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto w-full p-4 pb-24">
            <div className="flex flex-col items-center gap-6">
                
                {/* Visual Type Selector */}
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setVisualType('emoji')} className={`px-3 py-1 rounded-full text-xs font-bold border ${visualType === 'emoji' ? 'bg-yellow-400 text-white border-yellow-400' : 'bg-white text-gray-500 border-gray-200'}`}>😊 Emoji</button>
                  <button onClick={() => setVisualType('cartoon')} className={`px-3 py-1 rounded-full text-xs font-bold border ${visualType === 'cartoon' ? 'bg-yellow-400 text-white border-yellow-400' : 'bg-white text-gray-500 border-gray-200'}`}>🎨 Cartoon</button>
                  <button onClick={() => setVisualType('photo')} className={`px-3 py-1 rounded-full text-xs font-bold border ${visualType === 'photo' ? 'bg-yellow-400 text-white border-yellow-400' : 'bg-white text-gray-500 border-gray-200'}`}>📷 Photo</button>
                </div>

                {/* Visual */}
                <div className="text-center animate-bounce shrink-0 relative">
                     {question.visualType === 'scenario' || question.visualType === 'photo' || question.visualType === 'cartoon' ? (
                         <div className="bg-white p-6 rounded-3xl shadow-md border-2 border-yellow-100 max-w-sm">
                             {/* Since we don't have actual generated images, we use large emoji or text description as placeholder for 'photo'/'cartoon' modes */}
                             <div className="text-6xl mb-2">{question.emoji}</div>
                             <p className="text-sm text-gray-400 font-bold uppercase">{question.visualType}</p>
                         </div>
                     ) : (
                         <div className="text-[8rem] filter drop-shadow-md">
                             {question.emoji}
                         </div>
                     )}
                </div>
                
                {/* Question */}
                <div className="bg-white p-6 rounded-3xl shadow-sm text-center w-full max-w-lg">
                    <p className="text-xl font-bold text-gray-800">{question.question}</p>
                    
                    {/* Hint Section */}
                    {isCorrect === false && (
                        <div className="mt-4 bg-orange-50 p-3 rounded-xl border border-orange-100 animate-fadeIn">
                             <p className="text-orange-500 font-bold text-sm flex items-center justify-center gap-2">
                                <i className="fa-regular fa-lightbulb"></i>
                                {t(language, 'hint')}: {question.hint}
                             </p>
                        </div>
                    )}
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
                    {question.options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => !isCorrect && handleAnswer(opt)}
                            disabled={isCorrect === true}
                            className={`p-4 rounded-xl font-bold text-lg shadow-sm transition-all transform active:scale-95
                                ${selected === opt 
                                    ? (opt === question.correctAnswer ? 'bg-green-500 text-white ring-4 ring-green-200' : 'bg-red-500 text-white ring-4 ring-red-200')
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                }
                                ${isCorrect === true && opt !== question.correctAnswer ? 'opacity-50 grayscale' : ''}
                            `}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Correct Answer / Explanation Overlay */}
        {showExplanation && !showLevelUp && (
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] p-6 z-20 animate-slideUp">
                <div className="max-w-md mx-auto">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 text-xl">
                            <i className="fa-solid fa-check"></i>
                        </div>
                        <h3 className="text-2xl font-bold text-green-700">{t(language, 'youGotIt')}</h3>
                    </div>
                    
                    {/* Detailed Explanation */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-4 text-sm text-blue-900 space-y-2">
                        {typeof question.explanation === 'object' ? (
                            <>
                                <p><strong>👀 Face:</strong> {question.explanation.facialFeatures || "Look at the eyes and mouth."}</p>
                                <p><strong>💪 Body:</strong> {question.explanation.bodyLanguage || "Notice the posture."}</p>
                                <p><strong>💡 Why:</strong> {question.explanation.whyItLooksThisWay || question.explanation.text}</p>
                            </>
                        ) : (
                            <p>{question.explanation}</p>
                        )}
                    </div>

                    <button 
                        onClick={loadQuestion}
                        className="w-full bg-green-500 text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-green-600 transition-colors"
                    >
                        {t(language, 'nextQuestion')} <i className="fa-solid fa-arrow-right ml-2"></i>
                    </button>
                </div>
            </div>
        )}

        {/* Level Up Modal */}
        {showLevelUp && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6 animate-fadeIn">
                <div className="bg-white rounded-3xl p-8 text-center w-full max-w-sm relative overflow-hidden animate-bounceIn">
                    <div className="absolute inset-0 bg-yellow-400 opacity-10 animate-pulse pointer-events-none"></div>
                    
                    <i className="fa-solid fa-star text-6xl text-yellow-400 mb-4 animate-spin-slow"></i>
                    <h2 className="text-4xl font-bold text-gray-800 mb-2">{t(language, 'levelUp')}</h2>
                    <p className="text-xl text-yellow-600 font-bold mb-6">{t(language, 'level')} {stats.level}!</p>
                    
                    <div className="flex gap-2 justify-center mb-8">
                        <i className="fa-solid fa-lock-open text-gray-400"></i>
                        <span className="text-gray-500">{t(language, 'newChallenges')}</span>
                    </div>

                    <button 
                        onClick={loadQuestion}
                        className="w-full bg-yellow-400 text-black py-4 rounded-xl font-bold text-xl shadow-lg hover:bg-yellow-500 transition-colors"
                    >
                        {t(language, 'continue')}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
