import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleStep } from '../types';

interface ScheduleRunnerProps {
  schedule: Schedule;
  onExit: () => void;
  onComplete: () => void;
}

export const ScheduleRunner: React.FC<ScheduleRunnerProps> = ({ schedule, onExit, onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentStep = schedule.steps[currentStepIndex];
  const nextStep = schedule.steps[currentStepIndex + 1];

  const playAudio = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (currentStep && !isCompleted) {
      playAudio(`${currentStep.instruction}. ${currentStep.encouragement}`);
    }
  }, [currentStepIndex, isCompleted]);

  const handleNext = () => {
    if (currentStepIndex < schedule.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      finishRoutine();
    }
  };

  const finishRoutine = () => {
    setIsCompleted(true);
    setShowConfetti(true);
    playAudio(`Hurray! You finished the ${schedule.title}! You are amazing!`);
    setTimeout(() => {
        onComplete();
    }, 4000);
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
      {/* Top Bar */}
      <div className="bg-white p-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
             {currentStepIndex + 1}/{schedule.steps.length}
           </div>
           <span className="font-bold text-gray-700 truncate max-w-[150px]">{schedule.title}</span>
        </div>
        <button 
          onContextMenu={(e) => { e.preventDefault(); onExit(); }}
          className="text-gray-400 hover:text-red-500 text-sm px-3 py-1 border rounded-full"
        >
          Hold to Exit
        </button>
      </div>

      {/* First / Then Board (Simplified for header or focused view) */}
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
        
        {/* Visual Card */}
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
          <div className="mt-4 p-2 bg-gray-100 rounded-full">
            <i className="fa-solid fa-volume-high text-gray-400"></i>
          </div>
        </div>

      </div>

      {/* Bottom Action Area */}
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
