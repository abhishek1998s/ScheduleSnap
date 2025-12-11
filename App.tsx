
import React, { useState, useEffect, useRef } from 'react';
import { AppState, ViewState, Schedule, ChildProfile, MoodEntry, BehaviorLog, VoiceMessage, MeltdownPrediction, StoryBook, ParentMessage, TherapySession, LearningPath, CompletionLog } from './types';
import { generateScheduleFromImage, predictMeltdownRisk } from './services/geminiService';
import { CalmMode } from './components/CalmMode';
import { AACBoard } from './components/AACBoard';
import { CameraCapture } from './components/CameraCapture';
import { ScheduleRunner } from './components/ScheduleRunner';
import { Dashboard } from './components/Dashboard';
import { PreviewSchedule } from './components/PreviewSchedule';
import { LiveVoiceCoach } from './components/LiveVoiceCoach';
import { MoodCheck } from './components/MoodCheck';
import { EmotionQuiz } from './components/EmotionQuiz';
import { RewardStore } from './components/RewardStore';
import { SocialScenarioPractice } from './components/SocialScenario';
import { VoiceRecorder } from './components/VoiceRecorder';
import { WaitTimer } from './components/WaitTimer';
import { ResearchTool } from './components/ResearchTool';
import { MeltdownPredictionAlert } from './components/MeltdownPredictionAlert';
import { VoiceCompanion } from './components/VoiceCompanion';
import { KidsRoutineBuilder } from './components/KidsRoutineBuilder';
import { MagicBookLibrary } from './components/MagicBookLibrary';
import { ParentMessageInbox } from './components/ParentMessageInbox';
import { TherapyManager } from './components/TherapyManager';
import { LearningPathDashboard } from './components/LearningPathDashboard';
import { EnvironmentScanner } from './components/EnvironmentScanner';
import { ScheduleOptimizer } from './components/ScheduleOptimizer';
import { AudioConsentModal } from './components/AudioConsentModal';
import { t } from './utils/translations';

const INITIAL_PROFILE: ChildProfile = {
  id: 'child-1',
  name: "Leo",
  age: 6,
  interests: ["Trains", "Space", "Dinosaurs"],
  language: "English",
  sensoryProfile: { soundSensitivity: 'medium' },
  audioPreferences: { speechRate: 1, pitch: 1 },
  defaultCameraOn: false,
  showVisualTimer: true
};

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 'demo-1',
    title: 'Morning Routine',
    type: 'Morning',
    socialStory: "Mornings are for getting ready. We follow steps so we can play sooner!",
    scheduledTime: "07:30",
    createdAt: Date.now(),
    steps: [
      { id: 's1', emoji: '🛏️', instruction: 'Wake up', encouragement: 'Rise and shine!', completed: false },
      { id: 's2', emoji: '🚽', instruction: 'Potty', encouragement: 'Listen to your body.', completed: false },
      { id: 's3', emoji: '🧼', instruction: 'Wash Hands', encouragement: 'Clean hands feel good.', completed: false },
      { id: 's4', emoji: '🥣', instruction: 'Breakfast', encouragement: 'Yummy fuel!', completed: false },
    ]
  }
];

const STORAGE_KEY = 'schedulesnap_data_v1';
const AUDIO_CONSENT_KEY = 'schedulesnap_audio_consent';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: ViewState.HOME,
    activeScheduleId: null,
    schedules: INITIAL_SCHEDULES,
    profile: INITIAL_PROFILE,
    profiles: [INITIAL_PROFILE], // Initial list
    isAACOpen: false,
    isHighContrast: false,
    tokens: 12,
    moodLogs: [],
    behaviorLogs: [],
    completionLogs: [],
    voiceMessages: [],
    quizStats: { level: 1, xp: 0, totalAnswered: 0 },
    meltdownRisk: 'Low',
    caregiverPin: '1234',
    customAACButtons: [],
    latestPrediction: null,
    stories: [],
    parentMessages: [],
    therapySessions: [],
    learningPaths: []
  });

  const [generatedSchedule, setGeneratedSchedule] = useState<Omit<Schedule, 'id' | 'createdAt'> | null>(null);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [optimizerScheduleId, setOptimizerScheduleId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Audio State & Accessibility
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [showAudioConsent, setShowAudioConsent] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); // For aria-live

  // Ref to debounce automatic logging of predictions
  const lastPredictionLogTime = useRef<number>(0);

  useEffect(() => {
    // Request Notification permission on mount
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure profile has ID if legacy data loaded
        const loadedProfile = { 
            ...INITIAL_PROFILE, 
            ...parsed.profile,
            id: parsed.profile?.id || 'child-1'
        };
        
        setState(prev => ({ 
            ...prev, 
            ...parsed, 
            view: ViewState.HOME, 
            isAACOpen: false,
            voiceMessages: (parsed.voiceMessages || []).map((m: any) => ({ ...m, read: m.read ?? true })),
            profile: loadedProfile,
            profiles: parsed.profiles || [loadedProfile], // Load profiles list
            isHighContrast: parsed.isHighContrast || false,
            caregiverPin: parsed.caregiverPin || '1234',
            quizStats: parsed.quizStats || { level: 1, xp: 0, totalAnswered: 0 },
            customAACButtons: parsed.customAACButtons || [],
            completionLogs: parsed.completionLogs || [],
            latestPrediction: parsed.latestPrediction || null,
            stories: parsed.stories || [],
            parentMessages: parsed.parentMessages || [],
            therapySessions: parsed.therapySessions || [],
            learningPaths: parsed.learningPaths || []
        }));
      } catch (e) {
        console.error("Failed to load save data");
      }
    }

    // Audio Consent Logic
    const savedConsent = localStorage.getItem(AUDIO_CONSENT_KEY);
    if (savedConsent === null) {
        setShowAudioConsent(true);
    } else {
        setAudioEnabled(savedConsent === 'true');
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const { view, activeScheduleId, isAACOpen, ...toSave } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state, isLoaded]);

  const handleAudioConsent = (enabled: boolean) => {
      setAudioEnabled(enabled);
      localStorage.setItem(AUDIO_CONSENT_KEY, String(enabled));
      setShowAudioConsent(false);
      setStatusMessage(enabled ? "Audio enabled" : "Audio disabled");
  };

  // --- Parent Message Delivery Logic ---
  useEffect(() => {
      const interval = setInterval(() => {
          const now = new Date();
          const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          let hasUpdates = false;
          const updatedMessages = state.parentMessages.map(msg => {
              if (!msg.isDelivered) {
                   if (!msg.scheduledTime || msg.scheduledTime <= currentTimeStr) {
                       hasUpdates = true;
                       if ('Notification' in window && Notification.permission === 'granted') {
                           new Notification(t(state.profile.language, 'messageFromParent'), {
                               body: msg.content || "New Message!",
                               icon: 'https://cdn-icons-png.flaticon.com/512/2665/2665038.png'
                           });
                       }
                       // Check both Global Toggle AND Sensory Profile
                       if (audioEnabled && state.profile.sensoryProfile.soundSensitivity !== 'high') {
                           try {
                               const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                               audio.play().catch(() => {});
                           } catch(e) {}
                       }
                       return { ...msg, isDelivered: true };
                   }
              }
              return msg;
          });

          if (hasUpdates) {
              setState(prev => ({ ...prev, parentMessages: updatedMessages }));
              setStatusMessage("New message received");
          }

      }, 10000);

      return () => clearInterval(interval);
  }, [state.parentMessages, state.profile.language, state.profile.sensoryProfile.soundSensitivity, audioEnabled]);

  // --- Continuous Meltdown Risk Prediction Logic ---
  useEffect(() => {
     if (!isLoaded) return;

     const runPrediction = async () => {
         // Need some logs to make a prediction
         if (state.behaviorLogs.length + state.moodLogs.length < 2) return;
         
         const activeScheduleTitle = state.schedules.find(s => s.id === state.activeScheduleId)?.title;
         
         try {
             const prediction = await predictMeltdownRisk(state.profile, state.behaviorLogs, state.moodLogs, activeScheduleTitle);
             
             // Check if risk is high enough to update state and alert user
             if (prediction && (prediction.riskLevel === 'high' || prediction.riskLevel === 'imminent')) {
                 // Debounce logging/alerting (only once every 30 mins)
                 if (Date.now() - lastPredictionLogTime.current > 30 * 60 * 1000) {
                    setState(prev => ({ ...prev, latestPrediction: prediction }));
                    lastPredictionLogTime.current = Date.now();
                    
                    if ('Notification' in window && Notification.permission === 'granted') {
                         new Notification("Meltdown Risk Alert", { body: `Risk Level: ${prediction.riskLevel.toUpperCase()}` });
                    }
                 }
             }
         } catch (e) {
             console.error("Prediction failed", e);
         }
     };

     // Run prediction loop every minute
     const interval = setInterval(runPrediction, 60000); 
     return () => clearInterval(interval);
  }, [isLoaded, state.behaviorLogs, state.moodLogs, state.activeScheduleId, state.profile]);

  // --- Handlers ---

  const handleGenerateSchedule = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      const scheduleData = await generateScheduleFromImage(base64, mimeType, state.profile, state.behaviorLogs);
      setGeneratedSchedule(scheduleData);
      setState(prev => ({ ...prev, view: ViewState.PREVIEW }));
    } catch (error) {
      alert("Failed to generate schedule. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSchedule = (scheduleData: Omit<Schedule, 'id' | 'createdAt'>) => {
    if (editingScheduleId) {
        // Update existing
        setState(prev => ({
            ...prev,
            schedules: prev.schedules.map(s => s.id === editingScheduleId ? { ...scheduleData, id: s.id, createdAt: s.createdAt } : s),
            view: ViewState.DASHBOARD
        }));
        setEditingScheduleId(null);
    } else {
        // Create new
        const newSchedule: Schedule = {
            ...scheduleData,
            id: Date.now().toString(),
            createdAt: Date.now()
        };
        setState(prev => ({
            ...prev,
            schedules: [newSchedule, ...prev.schedules],
            view: ViewState.RUNNER,
            activeScheduleId: newSchedule.id
        }));
    }
    setGeneratedSchedule(null);
  };

  const handleUpdateProfile = (newProfile: ChildProfile) => {
    setState(prev => {
        // Update both the active profile and the one in the list
        const updatedProfiles = prev.profiles.map(p => p.id === newProfile.id ? newProfile : p);
        return { 
            ...prev, 
            profile: newProfile,
            profiles: updatedProfiles
        };
    });
  };

  const handleSwitchProfile = (profileId: string) => {
      const targetProfile = state.profiles.find(p => p.id === profileId);
      if (targetProfile) {
          setState(prev => ({ ...prev, profile: targetProfile }));
      }
  };

  const handleAddProfile = (newProfile: ChildProfile) => {
      setState(prev => ({
          ...prev,
          profiles: [...prev.profiles, newProfile],
          profile: newProfile // Auto-switch to new profile
      }));
  };

  const handleCompleteSchedule = () => {
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (schedule) {
        const log: CompletionLog = {
            id: Date.now().toString(),
            scheduleId: schedule.id,
            scheduleTitle: schedule.title,
            timestamp: Date.now()
        };
        setState(prev => ({
            ...prev,
            completionLogs: [...prev.completionLogs, log],
            tokens: prev.tokens + 1, // Reward token
            view: ViewState.HOME,
            activeScheduleId: null
        }));
        setStatusMessage(`Schedule completed. +1 Token.`);
    }
  };

  const handleOpenOptimizer = (scheduleId: string) => {
      setOptimizerScheduleId(scheduleId);
      setState(prev => ({ ...prev, view: ViewState.OPTIMIZER }));
  };

  const handleApplyOptimization = (optimizedSchedule: Schedule) => {
      setState(prev => ({
          ...prev,
          schedules: prev.schedules.map(s => s.id === optimizedSchedule.id ? optimizedSchedule : s),
          view: ViewState.DASHBOARD
      }));
      setOptimizerScheduleId(null);
      alert(t(state.profile.language, 'saved'));
  };

  // --- Render ---

  if (!isLoaded) return <div className="h-full flex items-center justify-center bg-background"><i className="fa-solid fa-circle-notch fa-spin text-4xl text-primary"></i></div>;

  return (
    <div className={`h-full w-full relative ${state.isHighContrast ? 'contrast-high' : ''}`}>
      {/* Accessibility Skip Link */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-white p-3 rounded font-bold shadow-lg"
      >
        Skip to main content
      </a>

      {/* Accessibility Live Region */}
      <div className="sr-only" role="status" aria-live="polite">{statusMessage}</div>

      {/* Audio Consent Modal */}
      {showAudioConsent && <AudioConsentModal onConsent={handleAudioConsent} />}

      {/* Global Alerts */}
      {state.latestPrediction && (
          <MeltdownPredictionAlert 
              prediction={state.latestPrediction} 
              onDismiss={() => setState(prev => ({ ...prev, latestPrediction: null }))}
              onAction={(action) => {
                  if (action === 'calm_mode') setState(prev => ({ ...prev, view: ViewState.CALM }));
                  else alert(`Suggested action: ${action}`);
              }}
              language={state.profile.language}
          />
      )}

      {/* Voice Companion (Always visible unless in exclusive modes) */}
      {[ViewState.HOME, ViewState.RUNNER, ViewState.CALM, ViewState.QUIZ].includes(state.view) && (
          <VoiceCompanion 
              profile={state.profile}
              currentView={state.view}
              schedules={state.schedules}
              activeScheduleTitle={state.schedules.find(s => s.id === state.activeScheduleId)?.title}
              meltdownRisk={state.latestPrediction}
              onEnterLiveMode={() => setState(prev => ({ ...prev, view: ViewState.COACH }))}
              audioEnabled={audioEnabled}
          />
      )}

      {/* View Router */}
      {state.view === ViewState.HOME && (
        <div id="main-content" className="flex flex-col h-full bg-background p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary font-sans truncate">
                {t(state.profile.language, 'appTitle')}
            </h1>
            <button 
                onClick={() => setState(prev => ({ ...prev, view: ViewState.DASHBOARD }))}
                className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                aria-label="Parent Dashboard"
            >
                <i className="fa-solid fa-gear text-2xl"></i>
            </button>
          </div>

          {/* Token Counter */}
          <div className="flex justify-end mb-4">
              <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-2 border border-yellow-100">
                  <i className="fa-solid fa-star text-yellow-400"></i>
                  <span className="font-bold text-gray-700">{state.tokens} {t(state.profile.language, 'tokens')}</span>
              </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <button 
              onClick={() => setState(prev => ({ ...prev, view: ViewState.CAMERA }))}
              className="bg-primary text-white p-6 rounded-3xl shadow-lg flex flex-col items-center gap-3 transform active:scale-95 transition-all hover:bg-secondary"
            >
              <i className="fa-solid fa-camera text-4xl"></i>
              <span className="font-bold text-lg">{t(state.profile.language, 'snapRoutine')}</span>
            </button>

            <button 
              onClick={() => setState(prev => ({ ...prev, view: ViewState.CALM }))}
              className="bg-calm text-primary p-6 rounded-3xl shadow-md flex flex-col items-center gap-3 transform active:scale-95 transition-all hover:bg-green-200"
            >
              <i className="fa-solid fa-wind text-4xl"></i>
              <span className="font-bold text-lg">{t(state.profile.language, 'calmMode')}</span>
            </button>

            <button 
              onClick={() => setState(prev => ({ ...prev, view: ViewState.MOOD }))}
              className="bg-blue-100 text-blue-600 p-6 rounded-3xl shadow-md flex flex-col items-center gap-3 transform active:scale-95 transition-all hover:bg-blue-200"
            >
              <i className="fa-solid fa-face-smile text-4xl"></i>
              <span className="font-bold text-lg">{t(state.profile.language, 'feelings')}</span>
            </button>

             <button 
              onClick={() => setState(prev => ({ ...prev, isAACOpen: true }))}
              className="bg-purple-100 text-purple-600 p-6 rounded-3xl shadow-md flex flex-col items-center gap-3 transform active:scale-95 transition-all hover:bg-purple-200"
            >
              <i className="fa-regular fa-comment-dots text-4xl"></i>
              <span className="font-bold text-lg">{t(state.profile.language, 'communication')}</span>
            </button>
          </div>

          {/* Secondary Features Grid */}
          <div className="grid grid-cols-3 gap-3 mb-8">
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.KIDS_BUILDER }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95">
                 <i className="fa-solid fa-hammer text-orange-400 text-xl"></i>
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'buildMyDay')}</span>
             </button>
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.MAGIC_BOOKS }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95">
                 <i className="fa-solid fa-book-open text-indigo-400 text-xl"></i>
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'magicBooks')}</span>
             </button>
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.PARENT_INBOX }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95 relative">
                 <i className="fa-solid fa-envelope text-pink-400 text-xl"></i>
                 {state.parentMessages.some(m => !m.isRead && m.isDelivered) && <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>}
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'parentInbox')}</span>
             </button>
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.LEARNING }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95">
                 <i className="fa-solid fa-graduation-cap text-blue-400 text-xl"></i>
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'myLearning')}</span>
             </button>
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.QUIZ }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95">
                 <i className="fa-solid fa-puzzle-piece text-yellow-400 text-xl"></i>
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'quiz')}</span>
             </button>
             <button onClick={() => setState(prev => ({ ...prev, view: ViewState.STORE }))} className="bg-white p-3 rounded-2xl shadow-sm flex flex-col items-center gap-1 active:scale-95">
                 <i className="fa-solid fa-shop text-green-400 text-xl"></i>
                 <span className="text-xs font-bold text-gray-600 text-center">{t(state.profile.language, 'rewardStore')}</span>
             </button>
          </div>

          {/* Current Schedules */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 px-2">{t(state.profile.language, 'myRoutines')}</h2>
            <div className="space-y-4">
              {state.schedules.map(schedule => (
                <button
                  key={schedule.id}
                  onClick={() => setState(prev => ({ ...prev, view: ViewState.RUNNER, activeScheduleId: schedule.id }))}
                  className="w-full bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4 transform active:scale-95 transition-all border border-transparent hover:border-primary/20"
                >
                  <span className="text-4xl">{schedule.steps[0]?.emoji}</span>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-gray-800 text-lg">{schedule.title}</h3>
                    <p className="text-sm text-gray-400">{schedule.steps.length} {t(state.profile.language, 'steps')}</p>
                  </div>
                  <i className="fa-solid fa-play text-primary text-xl"></i>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other Views */}

      {state.view === ViewState.CAMERA && (
        <CameraCapture 
          onImageSelected={handleGenerateSchedule}
          onCancel={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
          isLoading={isProcessing}
          language={state.profile.language}
          audioEnabled={audioEnabled}
          profile={state.profile}
        />
      )}

      {state.view === ViewState.PREVIEW && generatedSchedule && (
        <PreviewSchedule 
          schedule={generatedSchedule}
          profile={state.profile}
          onSave={handleSaveSchedule}
          onCancel={() => {
              setGeneratedSchedule(null);
              setEditingScheduleId(null);
              setState(prev => ({ ...prev, view: editingScheduleId ? ViewState.DASHBOARD : ViewState.HOME }));
          }}
          isEditing={!!editingScheduleId}
        />
      )}

      {state.view === ViewState.RUNNER && state.activeScheduleId && (
        <ScheduleRunner 
          schedule={state.schedules.find(s => s.id === state.activeScheduleId)!}
          onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME, activeScheduleId: null }))}
          onComplete={handleCompleteSchedule}
          profile={state.profile}
          audioEnabled={audioEnabled}
        />
      )}

      {state.view === ViewState.CALM && (
        <CalmMode 
            onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))} 
            language={state.profile.language} 
            audioEnabled={audioEnabled}
            profile={state.profile}
        />
      )}

      {state.view === ViewState.MOOD && (
        <MoodCheck 
            profile={state.profile}
            onSave={(entry) => setState(prev => ({ ...prev, moodLogs: [...prev.moodLogs, entry] }))}
            onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
        />
      )}

      {state.view === ViewState.QUIZ && (
          <EmotionQuiz 
              age={state.profile.age}
              language={state.profile.language}
              stats={state.quizStats}
              profile={state.profile} // NEW: Pass profile for TTS
              audioEnabled={audioEnabled} // NEW: Pass audio setting
              onUpdateStats={(newStats) => {
                  const gainedXp = newStats.xp - state.quizStats.xp;
                  // If leveled up or just gained lots of XP, maybe give a token?
                  const newTokens = gainedXp > 0 && newStats.level > state.quizStats.level ? state.tokens + 5 : state.tokens;
                  setState(prev => ({ ...prev, quizStats: newStats, tokens: newTokens }));
              }}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
          />
      )}

      {state.view === ViewState.STORE && (
          <RewardStore 
              tokens={state.tokens}
              profile={state.profile}
              audioEnabled={audioEnabled} // NEW: Pass audio setting
              onRedeem={(cost) => setState(prev => ({ ...prev, tokens: prev.tokens - cost }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
          />
      )}

      {state.view === ViewState.SOCIAL && (
          <SocialScenarioPractice 
              age={state.profile.age}
              language={state.profile.language}
              profile={state.profile} // NEW: Pass profile for TTS
              audioEnabled={audioEnabled} // NEW: Pass audio setting
              onComplete={(success) => {
                  if(success) setState(prev => ({ ...prev, tokens: prev.tokens + 1 }));
              }}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
          />
      )}

      {state.view === ViewState.COACH && (
          <LiveVoiceCoach 
              profile={state.profile}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.VOICE_RECORDER && (
          <VoiceRecorder 
              profile={state.profile}
              onSave={(msg) => setState(prev => ({ ...prev, voiceMessages: [...prev.voiceMessages, msg] }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.TIMER && (
          <WaitTimer 
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              language={state.profile.language}
              audioEnabled={audioEnabled}
              profile={state.profile}
          />
      )}

      {state.view === ViewState.RESEARCH && (
          <ResearchTool 
              onExit={() => setState(prev => ({ ...prev, view: ViewState.DASHBOARD }))}
              language={state.profile.language}
          />
      )}

      {state.view === ViewState.KIDS_BUILDER && (
          <KidsRoutineBuilder 
              profile={state.profile}
              onSave={(s) => setState(prev => ({ ...prev, schedules: [...prev.schedules, s], view: ViewState.HOME }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.MAGIC_BOOKS && (
          <MagicBookLibrary 
              stories={state.stories}
              profile={state.profile}
              onSaveStory={(s) => setState(prev => ({ ...prev, stories: [...prev.stories, s] }))}
              onDeleteStory={(id) => setState(prev => ({ ...prev, stories: prev.stories.filter(s => s.id !== id) }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.PARENT_INBOX && (
          <ParentMessageInbox 
              messages={state.parentMessages}
              profile={state.profile}
              onRespond={(id, resp) => {
                  setState(prev => ({
                      ...prev,
                      parentMessages: prev.parentMessages.map(m => m.id === id ? { ...m, childResponse: resp } : m)
                  }));
              }}
              onRead={(id) => {
                  setState(prev => ({
                      ...prev,
                      parentMessages: prev.parentMessages.map(m => m.id === id ? { ...m, isRead: true } : m)
                  }));
              }}
              onRecordReply={() => setState(prev => ({ ...prev, view: ViewState.VOICE_RECORDER }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.THERAPY && (
          <TherapyManager 
              sessions={state.therapySessions}
              profile={state.profile}
              onSaveSession={(s) => setState(prev => ({ ...prev, therapySessions: [...prev.therapySessions, s] }))}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.DASHBOARD }))}
          />
      )}

      {state.view === ViewState.LEARNING && (
          <LearningPathDashboard 
              profile={state.profile}
              paths={state.learningPaths}
              onUpdatePath={(p) => {
                  setState(prev => {
                      const idx = prev.learningPaths.findIndex(lp => lp.id === p.id);
                      if (idx >= 0) {
                          const newPaths = [...prev.learningPaths];
                          newPaths[idx] = p;
                          return { ...prev, learningPaths: newPaths };
                      } else {
                          return { ...prev, learningPaths: [...prev.learningPaths, p] };
                      }
                  });
              }}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
              audioEnabled={audioEnabled}
          />
      )}

      {state.view === ViewState.SCANNER && (
          <EnvironmentScanner 
              profile={state.profile}
              onExit={() => setState(prev => ({ ...prev, view: ViewState.DASHBOARD }))}
          />
      )}

      {/* --- NEW: OPTIMIZER VIEW --- */}
      {state.view === ViewState.OPTIMIZER && optimizerScheduleId && (
        <ScheduleOptimizer 
          schedule={state.schedules.find(s => s.id === optimizerScheduleId)!}
          profile={state.profile}
          completionLogs={state.completionLogs.filter(l => l.scheduleId === optimizerScheduleId)}
          behaviorLogs={state.behaviorLogs}
          onBack={() => setState(prev => ({ ...prev, view: ViewState.DASHBOARD }))}
          onApply={handleApplyOptimization}
          language={state.profile.language}
        />
      )}

      {state.view === ViewState.DASHBOARD && (
        <Dashboard 
          schedules={state.schedules}
          profile={state.profile}
          profiles={state.profiles} // Pass all profiles
          moodLogs={state.moodLogs}
          behaviorLogs={state.behaviorLogs}
          completionLogs={state.completionLogs}
          voiceMessages={state.voiceMessages}
          isHighContrast={state.isHighContrast}
          caregiverPin={state.caregiverPin}
          audioEnabled={audioEnabled}
          onExit={() => setState(prev => ({ ...prev, view: ViewState.HOME }))}
          onSelectSchedule={(id) => setState(prev => ({ ...prev, view: ViewState.RUNNER, activeScheduleId: id }))}
          onDeleteSchedule={(id) => setState(prev => ({ ...prev, schedules: prev.schedules.filter(s => s.id !== id) }))}
          onUpdateSchedule={(s) => setState(prev => ({ ...prev, schedules: prev.schedules.map(sch => sch.id === s.id ? s : sch) }))}
          onEditSchedule={(id) => {
              const s = state.schedules.find(sch => sch.id === id);
              if (s) {
                  setGeneratedSchedule(s);
                  setEditingScheduleId(id);
                  setState(prev => ({ ...prev, view: ViewState.PREVIEW }));
              }
          }}
          onCreateCustom={() => {
              const newSched = { title: 'New Routine', type: 'General' as const, steps: [], socialStory: '', createdAt: Date.now() };
              setGeneratedSchedule(newSched);
              setEditingScheduleId(null);
              setState(prev => ({ ...prev, view: ViewState.PREVIEW }));
          }}
          onLogBehavior={(log) => setState(prev => ({ ...prev, behaviorLogs: [...prev.behaviorLogs, { ...log, id: Date.now().toString(), timestamp: Date.now() }] }))}
          onUpdateProfile={handleUpdateProfile}
          onSwitchProfile={handleSwitchProfile}
          onAddProfile={handleAddProfile}
          onToggleHighContrast={() => setState(prev => ({ ...prev, isHighContrast: !prev.isHighContrast }))}
          onToggleAudio={() => setAudioEnabled(prev => !prev)}
          onUpdatePin={(pin) => setState(prev => ({ ...prev, caregiverPin: pin }))}
          onMarkMessagesRead={() => setState(prev => ({ ...prev, voiceMessages: prev.voiceMessages.map(m => ({ ...m, read: true })) }))}
          parentMessages={state.parentMessages}
          onScheduleMessage={(msg) => setState(prev => ({ ...prev, parentMessages: [...prev.parentMessages, { ...msg, id: Date.now().toString(), timestamp: Date.now(), isDelivered: false, isRead: false }] }))}
          onOpenTherapy={() => setState(prev => ({ ...prev, view: ViewState.THERAPY }))}
          onOpenScanner={() => setState(prev => ({ ...prev, view: ViewState.SCANNER }))}
          onOpenOptimizer={handleOpenOptimizer}
        />
      )}

      <AACBoard 
        isOpen={state.isAACOpen} 
        onClose={() => setState(prev => ({ ...prev, isAACOpen: false }))} 
        language={state.profile.language}
        customButtons={state.customAACButtons}
        onAddCustomButton={(btn) => setState(prev => ({ ...prev, customAACButtons: [...prev.customAACButtons, btn] }))}
        audioEnabled={audioEnabled}
        profile={state.profile}
      />
    </div>
  );
};

export default App;
