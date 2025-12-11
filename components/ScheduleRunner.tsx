
import React, { useState, useEffect } from 'react';
import { Schedule, ScheduleStep, ChildProfile } from '../types';
import { LongPressButton } from './LongPressButton';
import { VideoGuidedStep } from './VideoGuidedStep';
import { t } from '../utils/translations';

interface ScheduleRunnerProps {
  schedule: Schedule;
  onExit: () => void;
  onComplete: () => void;
  profile?: ChildProfile; 
  audioEnabled?: boolean; 
}

export const ScheduleRunner: React.FC<ScheduleRunnerProps> = ({ schedule, onExit, onComplete, profile, audioEnabled = false }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSubSteps, setCompletedSubSteps] = useState<Set<string>>(new Set());
  const [isCompleted, setIsCompleted] = useState(false);
  const [activeEncouragement, setActiveEncouragement] = useState('');
  
  // Initialize Camera Mode
  const [isCameraMode, setIsCameraMode] = useState(profile?.defaultCameraOn || false);
  
  // Timer State - Default is 2 mins (120s), but can be longer for real scenarios
  const DEFAULT_STEP_DURATION = 120; // 2 minutes
  const [stepDuration, setStepDuration] = useState(DEFAULT_STEP_DURATION);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_STEP_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const lang = profile?.language;
  const showTimer = profile?.showVisualTimer !== false; 

  const currentStep = schedule.steps[currentStepIndex];
  const nextStep = schedule.steps[currentStepIndex + 1];

  // --- Voice Selection Logic ---
  const getPreferredVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const voiceId = profile?.audioPreferences?.voiceId || 'Kore';
      
      // Map Gemini Persona to generic browser voice characteristics
      const isMalePersona = ['Kore', 'Fenrir', 'Charon'].includes(voiceId);
      const isFemalePersona = ['Puck', 'Aoede'].includes(voiceId);

      // 1. Try to match language first
      const langCode = profile?.language === 'Spanish' ? 'es' : profile?.language === 'Hindi' ? 'hi' : 'en';
      const langVoices = voices.filter(v => v.lang.startsWith(langCode));

      if (langVoices.length === 0) return null;

      // 2. Try to match gender keywords in voice name (heuristic)
      if (isMalePersona) {
          return langVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('google us english')) || langVoices[0];
      }
      if (isFemalePersona) {
          return langVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')) || langVoices[0];
      }

      return langVoices[0];
  };

  // Speech function
  const playAudio = (text: string) => {
    if (!audioEnabled) return; 
    if (profile?.sensoryProfile?.soundSensitivity === 'high') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const voice = getPreferredVoice();
    if (voice) utterance.voice = voice;

    utterance.rate = profile?.audioPreferences?.speechRate || 0.9;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // Reset timer on step change
    // For demo purposes, we keep it short (2 mins), but logic below supports longer
    setTimeLeft(DEFAULT_STEP_DURATION);
    setIsTimerRunning(true);
    
    // Rotate Encouragement
    if (currentStep) {
        if (currentStep.encouragementOptions && currentStep.encouragementOptions.length > 0) {
            const randomEncouragement = currentStep.encouragementOptions[Math.floor(Math.random() * currentStep.encouragementOptions.length)];
            setActiveEncouragement(randomEncouragement);
        } else {
            setActiveEncouragement(currentStep.encouragement);
        }
    }

  }, [currentStepIndex]);

  // Play audio when step/encouragement changes
  useEffect(() => {
     if (currentStep && !isCompleted && activeEncouragement && !isCameraMode) {
        playAudio(`${currentStep.instruction}. ${activeEncouragement}`);
     }
  }, [currentStepIndex, isCompleted, activeEncouragement, isCameraMode, audioEnabled]);

  // Timer Tick & Transition Warnings
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTimerRunning && timeLeft > 0 && !isCompleted) {
        interval = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                if (!isCameraMode && audioEnabled) {
                    // Extended Warnings
                    if (next === 300) playAudio("Five minutes remaining.");
                    if (next === 120) playAudio("Two minutes remaining.");
                    if (next === 60) playAudio("One minute left!");
                    if (next === 10) playAudio("Ten seconds remaining!");
                }
                return next;
            });
        }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft, isCompleted, isCameraMode, audioEnabled]);

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
    const celebration = schedule.completionCelebration || `Hurray! You finished the ${schedule.title}! You are amazing!`;
    playAudio(celebration);
    setTimeout(() => {
        onComplete();
    }, 4000);
  };

  const calculateDashOffset = () => {
    const fraction = timeLeft / stepDuration;
    return 126 * (1 - fraction);
  };

  if (isCompleted) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-primary text-white p-6 text-center animate-fadeIn overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center">
            <i className="fa-solid fa-trophy text-8xl text-yellow-300 mb-6 animate-bounce"></i>
            <h1 className="text-4xl font-bold mb-4">{t(lang, 'iDidIt')}</h1>
            <p className="text-2xl mb-8 font-bold">{schedule.completionCelebration || `${t(lang, 'allDone')} ${schedule.title}!`}</p>
            <div className="flex gap-2 mb-8">
                {[1,2,3,4,5].map(i => <i key={i} className="fa-solid fa-star text-3xl text-yellow-300 animate-pulse"></i>)}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative">
      
      {/* Top Bar */}
      <div className="bg-white p-4 flex justify-between items-center shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold">
             {currentStepIndex + 1}/{schedule.steps.length}
           </div>
           <span className="font-bold text-gray-700 truncate max-w-[100px] sm:max-w-[150px]">{schedule.title}</span>
        </div>
        
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsCameraMode(!isCameraMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border transition-colors ${
                    isCameraMode ? 'bg-purple-100 text-purple-600 border-purple-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}
                aria-label={isCameraMode ? "Disable Vision Guide" : "Enable Vision Guide"}
            >
                <i className={`fa-solid ${isCameraMode ? 'fa-video' : 'fa-video-slash'}`}></i>
                {isCameraMode ? t(lang, 'cameraGuideOn') : t(lang, 'cameraGuideOff')}
            </button>
            
            <LongPressButton 
              onComplete={onExit} 
              duration={3000}
              className="text-gray-400 hover:text-red-500 text-xs font-bold border rounded-full px-4 py-2 flex items-center gap-2"
            >
              <span>{t(lang, 'holdExit')}</span>
            </LongPressButton>
        </div>
      </div>

      {/* First / Then Board */}
      {!isCameraMode && (
          <div className="bg-primary/10 p-2 flex justify-center gap-4 border-b border-primary/20 shrink-0">
             <div className="flex items-center gap-2 opacity-100">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">{t(lang, 'now')}</span>
                {currentStep.imageUrl ? (
                    <img src={currentStep.imageUrl} alt="Current Step" className="w-8 h-8 rounded object-cover" />
                ) : (
                    <span className="text-xl">{currentStep.emoji}</span>
                )}
             </div>
             {nextStep && (
                 <div className="flex items-center gap-2 opacity-60">
                    <i className="fa-solid fa-arrow-right text-primary/50 text-xs"></i>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t(lang, 'then')}</span>
                    {nextStep.imageUrl ? (
                        <img src={nextStep.imageUrl} alt="Next Step" className="w-8 h-8 rounded object-cover" />
                    ) : (
                        <span className="text-xl">{nextStep.emoji}</span>
                    )}
                 </div>
             )}
          </div>
      )}

      {/* Transition Warning Banners */}
      {!isCameraMode && isTimerRunning && (
          <>
            {timeLeft <= 300 && timeLeft > 120 && (
                <div className="bg-blue-100 text-blue-800 p-2 text-center font-bold text-sm animate-pulse shrink-0">
                    <i className="fa-solid fa-clock mr-2"></i> 5 minutes remaining.
                </div>
            )}
            {timeLeft <= 120 && timeLeft > 60 && (
                <div className="bg-orange-100 text-orange-800 p-2 text-center font-bold text-sm animate-pulse shrink-0">
                    <i className="fa-solid fa-clock mr-2"></i> 2 minutes remaining.
                </div>
            )}
            {timeLeft <= 60 && timeLeft > 10 && (
                <div className="bg-yellow-100 text-yellow-800 p-2 text-center font-bold text-sm animate-pulse shrink-0">
                    <i className="fa-solid fa-clock mr-2"></i> Almost done! 1 minute left.
                </div>
            )}
            {timeLeft <= 10 && timeLeft > 0 && (
                <div className="bg-red-100 text-red-800 p-2 text-center font-bold text-sm animate-pulse shrink-0">
                    <i className="fa-solid fa-hourglass-end mr-2"></i> Finishing up! {timeLeft}s...
                </div>
            )}
          </>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        {isCameraMode && profile ? (
            <VideoGuidedStep 
                step={currentStep} 
                profile={profile} 
                onComplete={handleNext}
                audioEnabled={audioEnabled} 
            />
        ) : (
            <div className="h-full overflow-y-auto w-full">
                <div className="min-h-full flex flex-col items-center justify-center p-6 gap-6">
                    
                    {/* Pie Timer */}
                    {showTimer && (
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
                    )}

                    <div 
                    onClick={() => playAudio(currentStep.instruction)}
                    tabIndex={0}
                    role="button"
                    className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center border-4 border-transparent hover:border-primary/30 transition-all cursor-pointer transform hover:scale-[1.02] relative"
                    >
                    {currentStep.sensoryTip && (
                        <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 animate-bounce">
                            <i className="fa-solid fa-hand-sparkles"></i>
                            {currentStep.sensoryTip}
                        </div>
                    )}

                    {/* Display Custom Image OR Emoji */}
                    {currentStep.imageUrl ? (
                        <img 
                            src={currentStep.imageUrl} 
                            alt={currentStep.instruction} 
                            className="w-64 h-64 object-cover rounded-2xl mb-6 shadow-md border-2 border-gray-100"
                        />
                    ) : (
                        <div className="text-6xl sm:text-8xl md:text-[8rem] leading-none mb-6 filter drop-shadow-sm">
                            {currentStep.emoji}
                        </div>
                    )}

                    <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-800 mb-2 font-sans">
                        {currentStep.instruction}
                    </h2>
                    <p className="text-lg sm:text-xl text-primary font-bold text-center">
                        "{activeEncouragement}"
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
            </div>
        )}
      </div>

      {/* Manual Next Button */}
      <div className="p-4 sm:p-6 bg-white border-t pb-8 sm:pb-6 shrink-0 z-20">
        <button
          onClick={handleNext}
          className="w-full bg-primary hover:bg-secondary text-white text-2xl sm:text-3xl font-bold py-4 sm:py-6 rounded-2xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-4"
        >
          <span>{t(lang, 'iDidIt')}</span>
          <i className="fa-solid fa-check-circle"></i>
        </button>
      </div>
    </div>
  );
};
