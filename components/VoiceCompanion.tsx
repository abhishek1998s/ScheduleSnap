
import React, { useState, useEffect, useRef } from 'react';
import { ChildProfile, ConversationMode, MeltdownPrediction, ViewState } from '../types';
import { generateCompanionComment } from '../services/geminiService';

interface VoiceCompanionProps {
  profile: ChildProfile;
  currentView: ViewState;
  activeScheduleTitle?: string;
  meltdownRisk: MeltdownPrediction | null;
  onEnterLiveMode: () => void;
}

export const VoiceCompanion: React.FC<VoiceCompanionProps> = ({ 
  profile, currentView, activeScheduleTitle, meltdownRisk, onEnterLiveMode 
}) => {
  const [message, setMessage] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  // Refs to debounce automatic triggers
  const lastTriggerTime = useRef<number>(0);
  const lastViewRef = useRef<ViewState>(currentView);

  // Helper to speak text
  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile.audioPreferences?.speechRate || 0.9;
    utterance.pitch = 1.1; // Slightly higher pitch for "friendly robot"
    
    // Set voice if available (try to find a 'Google' voice or generally friendly one)
    const voices = window.speechSynthesis.getVoices();
    const friendlyVoice = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) || voices[0];
    if (friendlyVoice) utterance.voice = friendlyVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
        setIsSpeaking(false);
        setTimeout(() => setMessage(null), 5000); // Hide message bubble after speaking
    };
    
    window.speechSynthesis.speak(utterance);
    setMessage(text);
  };

  const triggerComment = async (mode: ConversationMode, context: any) => {
    const now = Date.now();
    // Prevent spamming (at least 30 seconds between auto-triggers)
    if (now - lastTriggerTime.current < 30000 && mode !== 'play') return;
    
    lastTriggerTime.current = now;
    setIsThinking(true);
    
    try {
        const text = await generateCompanionComment(profile, mode, context);
        speak(text);
    } catch (e) {
        console.error(e);
    } finally {
        setIsThinking(false);
    }
  };

  // 1. Monitor View Changes for Context
  useEffect(() => {
      if (currentView !== lastViewRef.current) {
          if (currentView === ViewState.RUNNER && activeScheduleTitle) {
              triggerComment('routine_guide', { schedule: activeScheduleTitle });
          } else if (currentView === ViewState.CALM) {
              triggerComment('calm_support', { reason: "User entered calm mode" });
          } else if (currentView === ViewState.QUIZ) {
              triggerComment('learning', { activity: "Quiz time" });
          }
          lastViewRef.current = currentView;
      }
  }, [currentView, activeScheduleTitle]);

  // 2. Monitor Meltdown Risk
  useEffect(() => {
      if (meltdownRisk && (meltdownRisk.riskLevel === 'high' || meltdownRisk.riskLevel === 'imminent')) {
          triggerComment('calm_support', { risk: meltdownRisk.riskLevel });
      }
  }, [meltdownRisk]);

  // 3. Random Encouragement (Interval)
  useEffect(() => {
      const interval = setInterval(() => {
          // Only random check-in if idle on Home screen
          if (currentView === ViewState.HOME && !isSpeaking) {
              triggerComment('encouragement', { timeOfDay: new Date().toLocaleTimeString() });
          }
      }, 5 * 60 * 1000); // Every 5 minutes
      
      return () => clearInterval(interval);
  }, [currentView, isSpeaking]);

  // Manual Trigger (Clicking the robot)
  const handleInteraction = () => {
      if (isSpeaking) return;
      triggerComment('play', { action: "User tapped Snap" });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end pointer-events-none">
        
        {/* Message Bubble */}
        {(message || isThinking) && (
            <div className="bg-white p-4 rounded-2xl rounded-tr-none shadow-xl border-2 border-purple-100 mb-2 max-w-[250px] animate-fadeIn pointer-events-auto">
                {isThinking ? (
                    <div className="flex gap-1 justify-center">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                ) : (
                    <p className="text-sm font-medium text-gray-700">{message}</p>
                )}
            </div>
        )}

        {/* Snap Avatar Button */}
        <div className="flex gap-2 items-end pointer-events-auto">
            {/* Action Buttons (Reveal on Hover/Active) */}
            <div className="flex flex-col gap-2 mb-2">
                <button 
                    onClick={onEnterLiveMode}
                    className="w-10 h-10 bg-purple-600 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                    title="Talk to Snap"
                >
                    <i className="fa-solid fa-headset"></i>
                </button>
                <button 
                    onClick={() => triggerComment('play', { type: "joke" })}
                    className="w-10 h-10 bg-yellow-400 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
                    title="Tell me a joke"
                >
                    <i className="fa-solid fa-face-laugh-beam"></i>
                </button>
            </div>

            {/* Main Avatar */}
            <button 
                onClick={handleInteraction}
                className={`w-16 h-16 rounded-full border-4 shadow-2xl flex items-center justify-center transition-all transform active:scale-95 relative overflow-hidden bg-white ${isSpeaking ? 'border-purple-500 scale-105' : 'border-white'}`}
            >
                {/* Robot Face SVG */}
                <div className="relative w-full h-full bg-gray-100">
                    <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-8 bg-purple-500 rounded-lg transition-all ${isSpeaking ? 'h-10' : 'h-8'}`}></div>
                    {/* Eyes */}
                    <div className="absolute top-[35%] left-[30%] w-2 h-2 bg-white rounded-full shadow-sm animate-pulse"></div>
                    <div className="absolute top-[35%] right-[30%] w-2 h-2 bg-white rounded-full shadow-sm animate-pulse"></div>
                    {/* Mouth */}
                    <div className={`absolute bottom-[30%] left-1/2 transform -translate-x-1/2 bg-white transition-all ${isSpeaking ? 'w-4 h-3 rounded-full animate-ping' : 'w-4 h-1 rounded-full'}`}></div>
                </div>
                
                {/* Antenna */}
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-3 bg-gray-400"></div>
                <div className={`absolute -top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full ${isThinking ? 'bg-red-500 animate-ping' : 'bg-purple-300'}`}></div>
            </button>
        </div>
    </div>
  );
};
