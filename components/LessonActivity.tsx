
import React, { useState, useEffect } from 'react';
import { Lesson, ChildProfile } from '../types';
import { generateLessonContent } from '../services/geminiService';
import { t } from '../utils/translations';

interface LessonActivityProps {
  lesson: Lesson;
  profile: ChildProfile;
  onComplete: () => void;
  onExit: () => void;
  audioEnabled?: boolean; // New prop
}

export const LessonActivity: React.FC<LessonActivityProps> = ({ lesson, profile, onComplete, onExit, audioEnabled = true }) => {
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // For multi-step content
  const lang = profile.language;

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        // If content already exists in lesson (e.g. cached), use it, otherwise generate
        if (lesson.content) {
            setContent(lesson.content);
            setLoading(false);
        } else {
            try {
                const data = await generateLessonContent(lesson, profile);
                setContent(data);
            } catch (e) {
                console.error(e);
                // Set empty object to trigger fallback view
                setContent({});
            } finally {
                setLoading(false);
            }
        }
    };
    load();
  }, [lesson, profile]);

  const speak = (text: string) => {
      // Safety Check: Block if child has high sound sensitivity or audio is off
      if (!audioEnabled) return;
      if (profile.sensoryProfile.soundSensitivity === 'high') return;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = profile.audioPreferences?.speechRate || 0.9;

      // Voice Selection Logic
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

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-white">
              <i className="fa-solid fa-shapes text-6xl text-blue-400 fa-bounce mb-6"></i>
              <p className="text-xl font-bold text-gray-500 animate-pulse">Preparing your lesson...</p>
          </div>
      );
  }

  if (!content) return <div className="p-4 text-center h-full flex items-center justify-center">Error loading lesson.</div>;

  // --- Renderers based on Lesson Type ---

  const renderQuiz = () => {
      // Content: { question, options[], correctAnswer, explanation }
      if (!content.question || !content.options) return null; // Safety check

      return (
          <div className="flex flex-col h-full p-6 bg-yellow-50 justify-center">
              <div className="bg-white p-6 rounded-3xl shadow-sm border-2 border-yellow-100 text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">{content.question}</h2>
              </div>
              <div className="grid grid-cols-1 gap-4">
                  {content.options?.map((opt: string, i: number) => (
                      <button 
                        key={i}
                        onClick={() => {
                            if (opt === content.correctAnswer) {
                                speak("Correct! " + content.explanation);
                                alert("Correct!");
                                onComplete();
                            } else {
                                speak("Try again.");
                            }
                        }}
                        className="p-4 bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-yellow-300 font-bold text-lg active:scale-95 transition-all"
                      >
                          {opt}
                      </button>
                  ))}
              </div>
          </div>
      );
  };

  const renderStory = () => {
      // Content: { title, pages: [{text, emoji}] }
      const page = content.pages?.[step];
      if (!page) return null;

      const next = () => {
          if (step < (content.pages?.length || 0) - 1) {
              setStep(s => s + 1);
          } else {
              onComplete();
          }
      };

      return (
          <div className="flex flex-col h-full p-6 bg-indigo-50">
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="text-9xl mb-8 animate-bounce">{page.emoji}</div>
                  <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-indigo-100">
                      <p className="text-2xl font-bold text-indigo-900 leading-relaxed">{page.text}</p>
                  </div>
                  <button onClick={() => speak(page.text)} className="mt-4 p-3 bg-indigo-200 rounded-full text-indigo-700">
                      <i className="fa-solid fa-volume-high"></i>
                  </button>
              </div>
              <button 
                onClick={next}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg mt-6"
              >
                  {step < (content.pages?.length || 0) - 1 ? "Next Page" : "Finish Story"}
              </button>
          </div>
      );
  };

  const renderPractice = () => {
      // Content: { steps: string[], parentTips: string[] }
      if (!content.steps) return null; // Safety check

      return (
          <div className="flex flex-col h-full p-6 bg-green-50 overflow-y-auto">
              <div className="min-h-full flex flex-col justify-center">
                  <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">{lesson.title}</h2>
                  
                  <div className="space-y-4 mb-8">
                      {content.steps?.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-4 bg-white p-4 rounded-2xl shadow-sm">
                              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">{i+1}</div>
                              <p className="text-lg font-medium text-gray-700">{s}</p>
                          </div>
                      ))}
                  </div>

                  {content.parentTips && (
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 mb-6">
                          <h3 className="font-bold text-blue-800 mb-2"><i className="fa-solid fa-circle-info mr-2"></i>Parent Tips</h3>
                          <ul className="list-disc list-inside text-sm text-blue-900 space-y-1">
                              {content.parentTips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}
                          </ul>
                      </div>
                  )}

                  <button onClick={onComplete} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-xl shadow-lg">
                      I Did It!
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
        <button onClick={onExit} className="absolute top-4 left-4 z-10 w-10 h-10 bg-black/10 rounded-full flex items-center justify-center">
            <i className="fa-solid fa-times"></i>
        </button>
        
        {lesson.type === 'quiz' && content.question && renderQuiz()}
        {lesson.type === 'story' && content.pages && renderStory()}
        {lesson.type === 'practice' && content.steps && renderPractice()}
        
        {/* Default / Fallback - Render if no specific type matched OR content missing fields */}
        {(!['quiz', 'story', 'practice'].includes(lesson.type) || 
          (lesson.type === 'quiz' && !content.question) ||
          (lesson.type === 'story' && !content.pages) ||
          (lesson.type === 'practice' && !content.steps)) && (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">{lesson.title}</h2>
                <p className="mb-8">{lesson.description || "Activity Ready!"}</p>
                {/* Visual Placeholder if content failed */}
                <div className="text-6xl mb-8 animate-bounce">{lesson.emoji || '✨'}</div>
                
                <button onClick={onComplete} className="bg-primary text-white px-8 py-3 rounded-xl font-bold">Complete Lesson</button>
            </div>
        )}
    </div>
  );
};
