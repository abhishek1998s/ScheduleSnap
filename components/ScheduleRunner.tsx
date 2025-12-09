
import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleStep, ChildProfile } from '../types';
import { LongPressButton } from './LongPressButton';

interface ScheduleRunnerProps {
  schedule: Schedule;
  onExit: () => void;
  onComplete: () => void;
  profile?: ChildProfile; // Added profile prop to access settings
}

export const ScheduleRunner: React.FC<ScheduleRunnerProps> = ({ schedule, onExit, onComplete, profile }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSubSteps, setCompletedSubSteps] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Timer State for F38 & Visuals
  const DEFAULT_STEP_DURATION = 120; // 2 minutes default if not specified
  const [stepDuration, setStepDuration] = useState(DEFAULT_STEP_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_STEP_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  const currentStep = schedule.steps[currentStepIndex];
  const nextStep = schedule.steps[currentStepIndex + 1];

  // Speech function respecting F29 Settings
  const playAudio = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Use profile settings or default to 1
    utterance.rate = profile?.audioPreferences?.speechRate || 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Reset timer on step change
    setTimeLeft(DEFAULT_STEP_DURATION);
    setIsTimerRunning(true);

    if (currentStep && !isCompleted) {
      playAudio(`${currentStep.instruction}. ${currentStep.encouragement}`);
    }
  }, [currentStepIndex, isCompleted]);

  // Timer Tick & Transition Warnings (F38)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && timeLeft > 0 && !isCompleted) {
        interval = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                // Transition Warnings
                if (next === 60) playAudio("One minute left!");
                if (next === 10) playAudio("Ten seconds remaining!");
                return next;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, isCompleted]);

  const handleSubStepToggle = (subStepId: string) => {
      const newSet = new Set(completedSubSteps);
      if(newSet.has(subStepId)) newSet.delete(subStepId);
      else newSet.add(subStepId);
      setCompletedSubSteps(newSet);
  };

  const handleNext = () => {
    if (currentStepIndex < schedule.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      finishRoutine();
    }
  };

  const finishRoutine = () => {
    setIsCompleted(true);
    playAudio(`Hurray! You finished the ${schedule.title}! You are amazing!`);
    setTimeout(() => {
        onComplete();
    }, 4000);
  };

  // Calculations for Pie Timer
  const calculateDashOffset = () => {
    const fraction = timeLeft / stepDuration;
    // r=20, circumference approx 126
    return 126 * (1 - fraction);
  };

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-primary text-white p-6 text-center animate-fadeIn">
        <i className="fa-solid fa-trophy text-8xl text-yellow-300 mb-6 animate-bounce"></i>
        <h1 className="text-4xl font-bold mb-4">You Did It!</h1>
        <p className="text-2xl mb-8">All done with {schedule.title}!</p>
        <div className="flex gap-2 mb-8">
            {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star text-3xl text-yellow-300 animate-pulse"></i>)}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      
      {/* Transition Warning Banners (F38) */}
      {timeLeft <= 60 && timeLeft > 55 && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-black text-center py-2 font-bold z-50 animate-pulse">
              1 Minute Remaining!
          </div>
      )}
      {timeLeft <= 10 && timeLeft > 0 && (
          <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-center py-2 font-bold z-50 animate-pulse">
              10 Seconds Left!
          </div>
      )}

      {/* Top Bar with Child Lock Exit */}
      <div className="bg-white p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
             {currentStepIndex + 1}/{schedule.steps.length}
           </div>
           <span className="font-bold text-gray-700 truncate max-w-[150px]">{schedule.title}</span>
        </div>
        
        {/* Child Lock Exit Button */}
        <LongPressButton 
          onComplete={onExit} 
          duration={3000}
          className="text-gray-400 hover:text-red-500 text-xs font-bold border rounded-full px-3 py-1 flex items-center gap-2"
        >
          <span>Hold to Exit</span>
        </LongPressButton>
      </div>

      {/* First / Then Board */}
      <div className="bg-primary/10 p-2 flex justify-center gap-4 border-b border-primary/20">
         <div className="flex items-center gap-2 opacity-100">
            <span className="text-xs font-bold text-primary uppercase tracking-wide">Now:</span>
            <span className="text-xl">{currentStep.emoji}</span>
         </div>
         {nextStep && (
             <div className="flex items-center gap-2 opacity-60">
                <i className="fa-solid fa-arrow-right text-primary/50 text-xs"></i>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Then:</span>
                <span className="text-xl">{nextStep.emoji}</span>
             </div>
         )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto">
        
        {/* Pie Timer (F3) */}
        <div className="flex flex-col items-center justify-center gap-1">
             <div className="relative w-16 h-16">
                 <svg className="w-full h-full transform -rotate-90">
                     <circle cx="32" cy="32" r="20" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                     <circle 
                        cx="32" cy="32" r="20" 
                        stroke={timeLeft < 10 ? '#ef4444' : '#3b82f6'} 
                        strokeWidth="6" 
                        fill="none" 
                        strokeDasharray="126"
                        strokeDashoffset={calculateDashOffset()}
                        className="transition-all duration-1000 linear"
                     />
                 </svg>
                 <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-500">
                     {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                 </div>
             </div>
        </div>

        <div 
          onClick={() => playAudio(currentStep.instruction)}
          className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border-4 border-transparent hover:border-primary/30 transition-all cursor-pointer transform hover:scale-[1.02]"
        >
          <div className="text-[8rem] leading-none mb-6 filter drop-shadow-sm">
            {currentStep.emoji}
          </div>
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-2 font-sans">
            {currentStep.instruction}
          </h2>
          <p className="text-xl text-primary font-medium text-center">
            {currentStep.encouragement}
          </p>
          
          {currentStep.subSteps && currentStep.subSteps.length > 0 && (
             <div className="mt-8 w-full space-y-3">
                {currentStep.subSteps.map(sub => (
                    <div 
                        key={sub.id} 
                        onClick={(e) => { e.stopPropagation(); handleSubStepToggle(sub.id); }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${completedSubSteps.has(sub.id) ? 'bg-green-50 border-green-200 opacity-60' : 'bg-gray-50 border-gray-100'}`}
                    >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${completedSubSteps.has(sub.id) ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
                            {completedSubSteps.has(sub.id) && <i className="fa-solid fa-check text-xs"></i>}
                        </div>
                        <span className={`text-lg font-bold ${completedSubSteps.has(sub.id) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                            {sub.text}
                        </span>
                    </div>
                ))}
             </div>
          )}
        </div>
      </div>

      <div className="p-6 bg-white border-t pb-8">
        <button
          onClick={handleNext}
          className="w-full bg-primary hover:bg-secondary text-white text-3xl font-bold py-6 rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-4"
        >
          <span>I Did It!</span>
          <i className="fa-solid fa-check-circle"></i>
        </button>
      </div>
    </div>
  );
};
