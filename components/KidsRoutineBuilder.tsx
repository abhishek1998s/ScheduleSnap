
import React, { useState } from 'react';
import { Schedule, ChildProfile, ScheduleStep } from '../types';
import { validateBuilderRoutine } from '../services/geminiService';
import { t } from '../utils/translations';

interface KidsRoutineBuilderProps {
  profile: ChildProfile;
  onSave: (schedule: Schedule) => void;
  onExit: () => void;
}

const AVAILABLE_STEPS = [
    { id: 'wake', emoji: '🛏️', label: 'Wake Up' },
    { id: 'toilet', emoji: '🚽', label: 'Toilet' },
    { id: 'wash', emoji: '🧼', label: 'Wash Hands' },
    { id: 'teeth', emoji: '🦷', label: 'Brush Teeth' },
    { id: 'dress', emoji: '👕', label: 'Get Dressed' },
    { id: 'socks', emoji: '🧦', label: 'Put on Socks' },
    { id: 'shoes', emoji: '👟', label: 'Put on Shoes' },
    { id: 'breakfast', emoji: '🥣', label: 'Eat Breakfast' },
    { id: 'pack', emoji: '🎒', label: 'Pack Bag' },
    { id: 'car', emoji: '🚗', label: 'Go to Car' },
    { id: 'bus', emoji: '🚌', label: 'Bus' },
    { id: 'school', emoji: '🏫', label: 'School' },
    { id: 'play', emoji: '🧸', label: 'Play' },
    { id: 'tablet', emoji: '📱', label: 'iPad Time' },
    { id: 'bath', emoji: '🛁', label: 'Bath' },
    { id: 'pjs', emoji: '👚', label: 'Pyjamas' },
    { id: 'book', emoji: '📖', label: 'Read Book' },
    { id: 'sleep', emoji: '😴', label: 'Sleep' },
];

export const KidsRoutineBuilder: React.FC<KidsRoutineBuilderProps> = ({ profile, onSave, onExit }) => {
  const [selectedSteps, setSelectedSteps] = useState<typeof AVAILABLE_STEPS>([]);
  const [snapMessage, setSnapMessage] = useState<string>(t(profile.language, 'builderWelcome'));
  const [isChecking, setIsChecking] = useState(false);
  const [routineName, setRoutineName] = useState("My Routine");

  // TTS Helper
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile.audioPreferences?.speechRate || 0.9;
    utterance.pitch = 1.2; // Higher pitch for Snap
    window.speechSynthesis.speak(utterance);
    setSnapMessage(text);
  };

  const handleAddItem = (item: typeof AVAILABLE_STEPS[0]) => {
      setSelectedSteps([...selectedSteps, item]);
      speak(`${t(profile.language, 'added')} ${item.label}`);
  };

  const handleRemoveItem = (index: number) => {
      const newSteps = [...selectedSteps];
      newSteps.splice(index, 1);
      setSelectedSteps(newSteps);
  };

  const checkRoutine = async () => {
      if (selectedSteps.length === 0) {
          speak(t(profile.language, 'builderEmpty'));
          return;
      }

      setIsChecking(true);
      try {
          const feedback = await validateBuilderRoutine(selectedSteps.map(s => s.label), profile);
          speak(feedback.message);
          
          if (!feedback.isValid && feedback.suggestedOrder) {
               // Optional: Auto-fix logic could go here, but for kids, gentle feedback is better
          }
      } catch (e) {
          speak(t(profile.language, 'goodJob'));
      } finally {
          setIsChecking(false);
      }
  };

  const handleSave = () => {
      if (selectedSteps.length === 0) return;

      const newSchedule: Schedule = {
          id: `kid-built-${Date.now()}`,
          title: routineName,
          type: 'General',
          socialStory: `I built this routine all by myself! I am going to ${selectedSteps[0].label} and finish with ${selectedSteps[selectedSteps.length-1].label}.`,
          createdAt: Date.now(),
          steps: selectedSteps.map((s, i) => ({
              id: `step-${Date.now()}-${i}`,
              emoji: s.emoji,
              instruction: s.label,
              encouragement: "You are doing it!",
              completed: false
          }))
      };
      
      onSave(newSchedule);
      speak(t(profile.language, 'savedRoutine'));
  };

  return (
    <div className="h-full flex flex-col bg-blue-50 relative overflow-hidden">
        
        {/* Header */}
        <div className="p-4 flex items-center justify-between bg-white shadow-sm z-10 shrink-0">
             <button onClick={onExit} className="bg-gray-100 p-2 rounded-full">
                 <i className="fa-solid fa-arrow-left text-gray-500"></i>
             </button>
             <input 
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="font-bold text-lg text-center text-blue-800 bg-transparent outline-none border-b border-transparent focus:border-blue-300 placeholder-blue-300"
                placeholder="Name Your Routine"
             />
             <button 
                onClick={handleSave}
                disabled={selectedSteps.length === 0}
                className="bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-md disabled:opacity-50 active:scale-95 transition-transform"
             >
                 {t(profile.language, 'save')}
             </button>
        </div>

        {/* Snap's Feedback Area */}
        <div className="p-4 flex items-start gap-4 z-10">
             <div className="w-16 h-16 bg-white rounded-full border-4 border-purple-200 shadow-lg flex items-center justify-center shrink-0">
                 {isChecking ? (
                     <i className="fa-solid fa-circle-notch fa-spin text-2xl text-purple-500"></i>
                 ) : (
                     <div className="relative">
                         <div className="w-10 h-8 bg-purple-500 rounded-lg"></div>
                         <div className="absolute top-[30%] left-[20%] w-2 h-2 bg-white rounded-full"></div>
                         <div className="absolute top-[30%] right-[20%] w-2 h-2 bg-white rounded-full"></div>
                     </div>
                 )}
             </div>
             <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-purple-100 flex-1 relative">
                 <p className="text-gray-700 font-bold text-sm">{snapMessage}</p>
                 <button 
                    onClick={checkRoutine}
                    disabled={isChecking || selectedSteps.length === 0}
                    className="absolute -bottom-3 -right-3 bg-purple-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform"
                    title="Check with Snap"
                 >
                     <i className="fa-solid fa-check"></i>
                 </button>
             </div>
        </div>

        {/* Workspace: Timeline (Target) */}
        <div className="flex-1 overflow-x-auto p-4 flex flex-col justify-center bg-blue-50/50">
            <div className="flex items-center gap-2 min-w-full px-4 py-8">
                 {selectedSteps.length === 0 && (
                     <div className="w-full text-center text-blue-300 font-bold border-2 border-dashed border-blue-200 rounded-2xl p-8">
                         {t(profile.language, 'dragHere')}
                     </div>
                 )}
                 
                 {selectedSteps.map((step, index) => (
                     <div key={index} className="relative group shrink-0 animate-popIn">
                         {index > 0 && (
                             <div className="absolute -left-3 top-1/2 -translate-y-1/2 text-blue-200 z-0">
                                 <i className="fa-solid fa-arrow-right"></i>
                             </div>
                         )}
                         <div className="w-4 h-4 bg-blue-500 text-white rounded-full absolute -top-2 -left-2 flex items-center justify-center text-xs font-bold z-20 border-2 border-white shadow-sm">
                             {index + 1}
                         </div>
                         <button 
                             onClick={() => handleRemoveItem(index)}
                             className="w-24 h-32 bg-white rounded-xl shadow-md border-b-4 border-blue-200 flex flex-col items-center justify-center gap-2 relative z-10 active:scale-95 transition-transform"
                         >
                             <span className="text-4xl">{step.emoji}</span>
                             <span className="text-xs font-bold text-gray-600 text-center leading-tight px-1">{step.label}</span>
                             
                             <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <div className="bg-red-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px]">
                                     <i className="fa-solid fa-times"></i>
                                 </div>
                             </div>
                         </button>
                     </div>
                 ))}
            </div>
        </div>

        {/* Library: Available Steps (Source) */}
        <div className="h-1/3 bg-white border-t shadow-lg overflow-y-auto p-4 shrink-0 z-20">
             <h3 className="font-bold text-gray-500 uppercase text-xs mb-2 tracking-wide text-center">{t(profile.language, 'builderLibrary')}</h3>
             <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                 {AVAILABLE_STEPS.map(step => (
                     <button
                         key={step.id}
                         onClick={() => handleAddItem(step)}
                         className="aspect-square bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center justify-center gap-1 active:scale-90 transition-transform hover:bg-blue-50"
                     >
                         <span className="text-2xl">{step.emoji}</span>
                         <span className="text-[10px] text-gray-500 font-bold text-center leading-none">{step.label}</span>
                     </button>
                 ))}
             </div>
        </div>
    </div>
  );
};
