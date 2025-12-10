
import React, { useState, useEffect } from 'react';
import { QuizQuestion } from '../types';
import { generateEmotionQuiz } from '../services/geminiService';
import { t } from '../utils/translations';

interface EmotionQuizProps {
  age: number;
  language?: string;
  onCorrect: () => void;
  onExit: () => void;
}

export const EmotionQuiz: React.FC<EmotionQuizProps> = ({ age, language, onCorrect, onExit }) => {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const loadQuestion = async () => {
    setLoading(true);
    setSelected(null);
    setIsCorrect(null);
    try {
        const q = await generateEmotionQuiz(age, language);
        setQuestion(q);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => { loadQuestion(); }, [age]);

  const handleAnswer = (option: string) => {
    if(!question) return;
    setSelected(option);
    if (option === question.correctAnswer) {
        setIsCorrect(true);
        onCorrect(); // Award Token
    } else {
        setIsCorrect(false);
    }
  };

  if (loading) {
     return (
        <div className="h-full flex flex-col items-center justify-center bg-yellow-50">
            <i className="fa-solid fa-star text-4xl text-yellow-400 fa-spin mb-4"></i>
            <p className="font-bold text-gray-500">{t(language, 'makingQuiz')}</p>
        </div>
     );
  }

  if (!question) return null;

  return (
    <div className="h-full bg-yellow-50 flex flex-col">
        <div className="flex justify-between items-center p-6 shrink-0">
            <button onClick={onExit} className="bg-white p-2 rounded-full shadow-sm">
                <i className="fa-solid fa-times"></i>
            </button>
            <div className="bg-yellow-200 px-4 py-1 rounded-full text-yellow-800 font-bold text-sm">
                {t(language, 'emotionQuiz')}
            </div>
            <div className="w-8"></div>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
            <div className="min-h-full flex flex-col items-center justify-center gap-6 p-6">
                <div className="text-[6rem] sm:text-[8rem] filter drop-shadow-md animate-bounce shrink-0">
                    {question.emoji}
                </div>
                
                <div className="bg-white p-6 rounded-3xl shadow-sm text-center w-full max-w-lg">
                    <p className="text-xl font-bold text-gray-800 mb-2">{question.question}</p>
                    {isCorrect === false && (
                        <p className="text-orange-500 font-bold text-sm animate-pulse">{t(language, 'hint')}: {question.hint}</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 w-full max-w-lg pb-6">
                    {question.options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => handleAnswer(opt)}
                            disabled={isCorrect === true}
                            className={`p-4 rounded-xl font-bold text-lg shadow-sm transition-all
                                ${selected === opt 
                                    ? (opt === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-red-500 text-white')
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                                }
                            `}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {isCorrect === true && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10 p-6">
                <div className="bg-white rounded-3xl p-8 text-center animate-slideUp">
                    <i className="fa-solid fa-trophy text-6xl text-yellow-400 mb-4"></i>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">{t(language, 'youGotIt')}</h2>
                    <p className="text-gray-500 mb-6">{t(language, 'tokenEarned')}</p>
                    <button 
                        onClick={loadQuestion}
                        className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-xl w-full"
                    >
                        {t(language, 'nextQuestion')}
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
