
import React, { useState, useEffect, useRef } from 'react';
import { AppState, ViewState, Schedule, ChildProfile, MoodEntry, BehaviorLog, VoiceMessage, MeltdownPrediction, StoryBook, ParentMessage, TherapySession, LearningPath } from './types';
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
import { t } from './utils/translations';

const INITIAL_PROFILE: ChildProfile = {
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

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: ViewState.HOME,
    activeScheduleId: null,
    schedules: INITIAL_SCHEDULES,
    profile: INITIAL_PROFILE,
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
  
  // Audio Consent State (Default off for safety)
  const [audioEnabled, setAudioEnabled] = useState(false);

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
        setState(prev => ({ 
            ...prev, 
            ...parsed, 
            view: ViewState.HOME, 
            isAACOpen: false,
            voiceMessages: (parsed.voiceMessages || []).map((m: any) => ({ ...m, read: m.read ?? true })),
            profile: { 
                ...prev.profile, 
                ...parsed.profile, 
                language: parsed.profile?.language || 'English',
                audioPreferences: parsed.profile?.audioPreferences || { speechRate: 1, pitch: 1 },
                defaultCameraOn: parsed.profile?.defaultCameraOn || false
            },
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
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const { view, activeScheduleId, isAACOpen, ...toSave } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }
  }, [state, isLoaded]);

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
          }

      }, 10000);

      return () => clearInterval(interval);
  }, [state.parentMessages, state.profile.language, state.profile.sensoryProfile.soundSensitivity, audioEnabled]);


  // --- Continuous Meltdown Risk Prediction Logic ---
  useEffect(() => {
     if (!isLoaded) return;

     const runPrediction = async () => {
         if (state.behaviorLogs.length + state.moodLogs.length < 2) return;
         
         const activeScheduleTitle = state.schedules.find(s => s.id === state.activeScheduleId)?.title;
         
         try {
             const prediction = await predictMeltdownRisk(state.profile, state.behaviorLogs, state.moodLogs, activeScheduleTitle);
             
             if (prediction.riskLevel === 'high' || prediction.riskLevel === 'imminent') {
                 const now = Date.now();
                 if (now - lastPredictionLogTime.current > 30 * 60 * 1000) {
                     lastPredictionLogTime.current = now;

                     try {
                         // Check both Global Toggle AND Sensory Profile
                         if (audioEnabled && state.profile.sensoryProfile.soundSensitivity !== 'high') {
                            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
                            audio.play().catch(() => {});
                         }
                         
                         if ('Notification' in window && Notification.permission === 'granted') {
                             new Notification(`⚠️ ${t(state.profile.language, 'riskHigh')}`, {
                                 body: `${t(state.profile.language, 'whyRisk')}: ${prediction.riskFactors.map(r => r.factor).join(', ')}`,
                                 icon: 'https://cdn-icons-png.flaticon.com/512/564/564619.png'
                             });
                         }
                     } catch(e) { console.warn("Alert failed", e); }

                     const autoLog: BehaviorLog = {
                         id: now.toString(),
                         timestamp: now,
                         behavior: "Predicted High Risk",
                         intensity: 'Severe',
                         trigger: `AI Prediction: ${prediction.riskFactors.map(f => `${f.factor}`).join('; ')}`
                     };

                     setState(prev => ({ 
                         ...prev, 
                         latestPrediction: prediction,
                         behaviorLogs: [...prev.behaviorLogs, autoLog] 
                     }));
                     return;
                 }
             }

             setState(prev => ({ ...prev, latestPrediction: prediction }));
         } catch (e) {
             console.warn("Auto-prediction failed", e);
         }
     };

     runPrediction();
  }, [state.behaviorLogs, state.moodLogs, state.activeScheduleId, state.profile, isLoaded, audioEnabled]);

  const navigateTo = (view: ViewState) => setState(prev => ({ ...prev, view }));
  
  const startRoutine = (id: string) => {
    setState(prev => ({ ...prev, activeScheduleId: id, view: ViewState.RUNNER }));
  };

  const handleRoutineComplete = () => {
    const schedule = state.schedules.find(s => s.id === state.activeScheduleId);
    if (schedule) {
        setState(prev => ({ 
            ...prev, 
            tokens: prev.tokens + 5,
            completionLogs: [...prev.completionLogs, {
                id: Date.now().toString(),
                scheduleId: schedule.id,
                scheduleTitle: schedule.title,
                timestamp: Date.now()
            }]
        }));
    }
    navigateTo(ViewState.HOME);
  };

  const handleImageSelected = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    setEditingScheduleId(null);
    try {
      const newScheduleData = await generateScheduleFromImage(base64, mimeType, state.profile, state.behaviorLogs);
      setGeneratedSchedule(newScheduleData);
      navigateTo(ViewState.PREVIEW);
    } catch (error) {
      alert("Failed to generate schedule. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCustomRoutine = () => {
      const blankSchedule: Omit<Schedule, 'id' | 'createdAt'> = {
          title: "New Routine",
          type: "General",
          socialStory: "",
          steps: [{ 
              id: `step-1`, 
              emoji: '📝', 
              instruction: 'First Step', 
              encouragement: 'You can do it!', 
              encouragementOptions: ['You can do it!'], 
              completed: false 
          }],
          completionCelebration: "Great job!",
          missingItems: []
      };
      setGeneratedSchedule(blankSchedule);
      setEditingScheduleId(null);
      navigateTo(ViewState.PREVIEW);
  };

  const handleEditScheduleRequest = (id: string) => {
      const schedule = state.schedules.find(s => s.id === id);
      if (schedule) {
          const { id: _, createdAt: __, ...editableData } = schedule;
          setGeneratedSchedule(editableData);
          setEditingScheduleId(id);
          navigateTo(ViewState.PREVIEW);
      }
  };

  const handleOpenOptimizer = (id: string) => {
      setOptimizerScheduleId(id);
      navigateTo(ViewState.OPTIMIZER);
  };

  const handleApplyOptimization = (optimizedSchedule: Schedule) => {
      setState(prev => ({
          ...prev,
          schedules: prev.schedules.map(s => s.id === optimizedSchedule.id ? optimizedSchedule : s)
      }));
      setOptimizerScheduleId(null);
      navigateTo(ViewState.DASHBOARD);
  };

  const handleSaveSchedule = (scheduleToSave?: Omit<Schedule, 'id' | 'createdAt'>) => {
    const source = scheduleToSave || generatedSchedule;
    if (source) {
      if (editingScheduleId) {
          setState(prev => ({
              ...prev,
              schedules: prev.schedules.map(s => s.id === editingScheduleId ? { ...source, id: editingScheduleId, createdAt: s.createdAt } : s),
              view: ViewState.DASHBOARD
          }));
      } else {
          const newSchedule: Schedule = {
            ...source,
            id: `sched-${Date.now()}`,
            createdAt: Date.now()
          };
          setState(prev => ({
            ...prev,
            schedules: [newSchedule, ...prev.schedules],
            activeScheduleId: newSchedule.id,
            view: ViewState.RUNNER
          }));
      }
      setGeneratedSchedule(null);
      setEditingScheduleId(null);
    }
  };

  const handleUpdateSchedule = (updatedSchedule: Schedule) => {
    setState(prev => ({
        ...prev,
        schedules: prev.schedules.map(s => s.id === updatedSchedule.id ? updatedSchedule : s)
    }));
  };

  const handleDeleteSchedule = (id: string) => {
    if(confirm("Are you sure you want to delete this routine?")) {
        setState(prev => ({
            ...prev,
            schedules: prev.schedules.filter(s => s.id !== id)
        }));
    }
  };

  const handleSaveVoiceMessage = (msg: VoiceMessage) => {
      setState(prev => ({ ...prev, voiceMessages: [msg, ...prev.voiceMessages] }));
  };

  const handleMarkMessagesRead = () => {
    setState(prev => ({
        ...prev,
        voiceMessages: prev.voiceMessages.map(m => ({ ...m, read: true }))
    }));
  };

  const handlePredictionDismiss = () => {
      setState(prev => ({ ...prev, latestPrediction: null }));
  };

  const handlePredictionAction = (action: string) => {
      if (action === 'calm_mode') {
          navigateTo(ViewState.CALM);
      }
      setState(prev => ({ ...prev, latestPrediction: null }));
  };

  const handleBuilderSave = (schedule: Schedule) => {
      setState(prev => ({
          ...prev,
          schedules: [schedule, ...prev.schedules],
          view: ViewState.HOME
      }));
  };

  const handleSaveStory = (story: StoryBook) => {
    setState(prev => ({
        ...prev,
        stories: [story, ...prev.stories]
    }));
  };

  const handleDeleteStory = (id: string) => {
    if (confirm("Delete this story?")) {
        setState(prev => ({
            ...prev,
            stories: prev.stories.filter(s => s.id !== id)
        }));
    }
  };

  // --- Parent Message Handlers ---
  const handleScheduleMessage = (msg: Omit<ParentMessage, 'id' | 'timestamp' | 'isDelivered' | 'isRead'>) => {
      const newMessage: ParentMessage = {
          ...msg,
          id: `msg-${Date.now()}`,
          timestamp: Date.now(),
          isDelivered: false,
          isRead: false
      };
      setState(prev => ({ ...prev, parentMessages: [...prev.parentMessages, newMessage] }));
  };

  const handleChildRespond = (messageId: string, response: string) => {
      setState(prev => ({
          ...prev,
          parentMessages: prev.parentMessages.map(m => m.id === messageId ? { ...m, isRead: true, childResponse: response } : m)
      }));
  };

  // --- Therapy Handlers ---
  const handleSaveTherapySession = (session: TherapySession) => {
      setState(prev => ({ ...prev, therapySessions: [...prev.therapySessions, session] }));
  };

  // --- Learning Path Handlers ---
  const handleUpdateLearningPath = (path: LearningPath) => {
      setState(prev => {
          const existingIndex = prev.learningPaths.findIndex(p => p.id === path.id);
          const newPaths = [...prev.learningPaths];
          if (existingIndex >= 0) {
              newPaths[existingIndex] = path;
          } else {
              newPaths.push(path);
          }
          return { ...prev, learningPaths: newPaths };
      });
  };

  const handleSendMissYou = () => {
      const msg: VoiceMessage = {
          id: `missyou-${Date.now()}`,
          timestamp: Date.now(),
          audioBlob: new Blob(),
          transcription: "❤️ I miss you! ❤️",
          read: false,
          analysis: {
              rawTranscription: "Miss you button pressed",
              interpretedMeaning: "I miss you and am thinking about you.",
              confidence: 1,
              aacSymbols: [{ label: "Miss You", emoji: "🥺" }],
              suggestedResponses: ["I miss you too!", "I will be home soon."],
              emotionalTone: "Love"
          }
      };
      handleSaveVoiceMessage(msg);
      alert(t(lang, 'missYouSent'));
  };

  const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId);
  const optimizerSchedule = state.schedules.find(s => s.id === optimizerScheduleId);
  const lang = state.profile.language;
  const unreadCount = state.voiceMessages.filter(m => !m.read).length;
  const unreadParentMessages = state.parentMessages.filter(m => m.isDelivered && !m.isRead).length;

  if (!isLoaded) return null;

  const themeClass = state.isHighContrast 
    ? "bg-black text-yellow-300 [&_*]:border-yellow-400" 
    : "bg-background";

  const buttonClass = (color: string) => state.isHighContrast 
    ? "bg-gray-800 text-yellow-300 border-2 border-yellow-400 shadow-none hover:bg-gray-700"
    : `${color} shadow-md`;

  return (
    <div className={`h-full w-full relative ${themeClass} overflow-hidden`}>
      {/* Skip Link for Accessibility */}
      <a 
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 bg-primary text-white p-3 rounded-lg font-bold shadow-lg"
      >
        Skip to main content
      </a>

      {/* Voice Companion */}
      {state.view !== ViewState.COACH && state.view !== ViewState.CAMERA && state.view !== ViewState.KIDS_BUILDER && state.view !== ViewState.MAGIC_BOOKS && state.view !== ViewState.PARENT_INBOX && state.view !== ViewState.THERAPY && state.view !== ViewState.LEARNING && state.view !== ViewState.SCANNER && state.view !== ViewState.OPTIMIZER && audioEnabled && (
          <VoiceCompanion 
              profile={state.profile}
              currentView={state.view}
              schedules={state.schedules}
              activeScheduleTitle={activeSchedule?.title}
              meltdownRisk={state.latestPrediction || null}
              onEnterLiveMode={() => navigateTo(ViewState.COACH)}
          />
      )}
      
      {/* Meltdown Risk Alert */}
      {state.latestPrediction && state.view !== ViewState.CALM && (
          <MeltdownPredictionAlert 
              prediction={state.latestPrediction} 
              onDismiss={handlePredictionDismiss}
              onAction={handlePredictionAction}
              language={lang}
          />
      )}
      
      <main id="main-content" className="h-full w-full max-w-2xl lg:max-w-4xl xl:max-w-6xl mx-auto bg-white shadow-2xl relative">
      {state.view === ViewState.HOME && (
        <div className="flex flex-col h-full p-6 relative">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">{t(lang, 'appTitle')}</h1>
            <div className="flex gap-2">
                <button 
                    onClick={() => navigateTo(ViewState.STORE)}
                    className={`${state.isHighContrast ? 'bg-black border border-yellow-400 text-yellow-400' : 'bg-yellow-100 text-yellow-700'} px-3 py-1 rounded-full font-bold flex items-center gap-1`}
                    aria-label="Reward Store"
                >
                    <i className="fa-solid fa-star"></i> {state.tokens}
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.DASHBOARD)}
                    className={`${state.isHighContrast ? 'bg-black border border-yellow-400 text-yellow-400' : 'bg-white text-gray-400'} w-12 h-12 rounded-full shadow-sm flex items-center justify-center relative`}
                    aria-label="Open Dashboard Settings"
                >
                    <i className="fa-solid fa-gear"></i>
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white font-bold items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        </span>
                    )}
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-24 w-full">
            <button 
                onClick={() => navigateTo(ViewState.CAMERA)}
                className={`w-full p-8 rounded-3xl flex flex-col items-center gap-4 active:scale-95 transition-transform mb-6 ${state.isHighContrast ? 'bg-yellow-400 text-black font-bold border-4 border-white' : 'bg-primary text-white shadow-xl'}`}
            >
                <i className="fa-solid fa-camera text-5xl"></i>
                <span className="text-2xl font-bold">{t(lang, 'snapRoutine')}</span>
            </button>

            {/* Kids Builder Button */}
            <button 
                onClick={() => navigateTo(ViewState.KIDS_BUILDER)}
                className={`w-full p-6 rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-transform mb-6 ${state.isHighContrast ? 'bg-blue-900 border-4 border-yellow-400 text-yellow-300' : 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg'}`}
            >
                <i className="fa-solid fa-hammer text-3xl"></i>
                <span className="text-xl font-bold">{t(lang, 'buildMyDay')}</span>
            </button>

            {/* Learning Path Button */}
            <button 
                onClick={() => navigateTo(ViewState.LEARNING)}
                className={`w-full p-6 rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-transform mb-6 ${state.isHighContrast ? 'bg-green-900 border-4 border-yellow-400 text-yellow-300' : 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-lg'}`}
            >
                <i className="fa-solid fa-graduation-cap text-3xl"></i>
                <span className="text-xl font-bold">{t(lang, 'myLearning')}</span>
            </button>

            {/* Magic Books Button */}
            <button 
                onClick={() => navigateTo(ViewState.MAGIC_BOOKS)}
                className={`w-full p-6 rounded-3xl flex items-center justify-center gap-4 active:scale-95 transition-transform mb-6 ${state.isHighContrast ? 'bg-purple-900 border-4 border-yellow-400 text-yellow-300' : 'bg-gradient-to-r from-indigo-400 to-purple-400 text-white shadow-lg'}`}
            >
                <i className="fa-solid fa-book-sparkles text-3xl"></i>
                <span className="text-xl font-bold">{t(lang, 'magicBooks')}</span>
            </button>
            
            {/* Miss You & Inbox Buttons (Communication Bridge) */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <button 
                    onClick={handleSendMissYou}
                    className={`p-6 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform ${state.isHighContrast ? 'bg-red-900 border-4 border-yellow-400 text-yellow-300' : 'bg-red-100 text-red-500 shadow-md'}`}
                >
                    <i className="fa-solid fa-heart text-3xl"></i>
                    <span className="font-bold">{t(lang, 'missYou')}</span>
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.PARENT_INBOX)}
                    className={`p-6 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform relative ${state.isHighContrast ? 'bg-pink-900 border-4 border-yellow-400 text-yellow-300' : 'bg-pink-100 text-pink-500 shadow-md'}`}
                >
                    {unreadParentMessages > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm animate-bounce shadow-sm border-2 border-white">
                            {unreadParentMessages}
                        </div>
                    )}
                    <i className="fa-solid fa-envelope text-3xl"></i>
                    <span className="font-bold">{t(lang, 'parentInbox')}</span>
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-8">
                <button onClick={() => navigateTo(ViewState.CALM)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-calm text-primary')}`}>
                    <i className="fa-solid fa-wind text-3xl"></i><span className="font-bold">{t(lang, 'calmMode')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.MOOD)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-blue-100 text-blue-600')}`}>
                    <i className="fa-solid fa-face-smile text-3xl"></i><span className="font-bold">{t(lang, 'feelings')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.COACH)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-purple-100 text-purple-600')}`}>
                    <i className="fa-solid fa-headset text-3xl"></i><span className="font-bold">{t(lang, 'aiCoach')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.TIMER)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-gray-200 text-gray-700')}`}>
                    <i className="fa-solid fa-hourglass-start text-3xl"></i><span className="font-bold">{t(lang, 'waitTimer')}</span>
                </button>
                 <button onClick={() => navigateTo(ViewState.VOICE_RECORDER)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-teal-100 text-teal-600')}`}>
                    <i className="fa-solid fa-microphone text-3xl"></i><span className="font-bold">{t(lang, 'tellParents')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.RESEARCH)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-indigo-100 text-indigo-600')}`}>
                    <i className="fa-solid fa-book-open text-3xl"></i><span className="font-bold">{t(lang, 'research')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.SOCIAL)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-pink-100 text-pink-600')}`}>
                    <i className="fa-solid fa-users text-3xl"></i><span className="font-bold">{t(lang, 'social')}</span>
                </button>
                <button onClick={() => navigateTo(ViewState.QUIZ)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-orange-100 text-orange-600')}`}>
                    <i className="fa-solid fa-puzzle-piece text-3xl"></i><span className="font-bold">{t(lang, 'quiz')}</span>
                </button>
                {/* Scanner Button */}
                <button onClick={() => navigateTo(ViewState.SCANNER)} className={`p-6 rounded-2xl flex flex-col items-center gap-2 active:scale-95 transition-transform ${buttonClass('bg-slate-700 text-white')}`}>
                    <i className="fa-solid fa-radar text-3xl"></i><span className="font-bold">{t(lang, 'envScanner')}</span>
                </button>
            </div>

            <div>
                <h3 className="text-gray-500 font-bold mb-3 uppercase text-sm tracking-wider">{t(lang, 'myRoutines')}</h3>
                <div className="space-y-3">
                    {state.schedules
                        .sort((a,b) => (a.scheduledTime || '23:59').localeCompare(b.scheduledTime || '23:59'))
                        .map(schedule => (
                        <button 
                            key={schedule.id}
                            onClick={() => startRoutine(schedule.id)}
                            className={`w-full p-4 rounded-xl flex items-center gap-4 text-left active:bg-gray-50 ${state.isHighContrast ? 'bg-gray-900 border border-yellow-400 text-yellow-300' : 'bg-white shadow-sm border border-gray-100'}`}
                        >
                            <span className="text-3xl">{schedule.steps[0]?.emoji}</span>
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <h4 className={`font-bold ${state.isHighContrast ? 'text-yellow-300' : 'text-gray-800'}`}>{schedule.title}</h4>
                                    {schedule.scheduledTime && (
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${state.isHighContrast ? 'bg-yellow-400 text-black' : 'bg-gray-100 text-gray-500'}`}>
                                            {schedule.scheduledTime}
                                        </span>
                                    )}
                                </div>
                                <p className={`text-xs ${state.isHighContrast ? 'text-yellow-100' : 'text-gray-400'}`}>{schedule.steps.length} {t(lang, 'steps')}</p>
                            </div>
                            <i className="fa-solid fa-play text-primary"></i>
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>
      )}

      {state.view === ViewState.CAMERA && <CameraCapture isLoading={isProcessing} onImageSelected={handleImageSelected} onCancel={() => navigateTo(ViewState.HOME)} language={lang} audioEnabled={audioEnabled} profile={state.profile} />}
      {state.view === ViewState.PREVIEW && generatedSchedule && <PreviewSchedule schedule={generatedSchedule} profile={state.profile} onSave={handleSaveSchedule} onCancel={() => { setGeneratedSchedule(null); setEditingScheduleId(null); navigateTo(ViewState.HOME); }} isEditing={!!editingScheduleId} />}
      {state.view === ViewState.RUNNER && activeSchedule && <ScheduleRunner schedule={activeSchedule} profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onComplete={handleRoutineComplete} audioEnabled={audioEnabled} />}
      {state.view === ViewState.DASHBOARD && <Dashboard schedules={state.schedules} profile={state.profile} moodLogs={state.moodLogs} behaviorLogs={state.behaviorLogs} completionLogs={state.completionLogs} voiceMessages={state.voiceMessages} isHighContrast={state.isHighContrast} caregiverPin={state.caregiverPin || '1234'} audioEnabled={audioEnabled} onUpdatePin={(p) => setState(prev => ({...prev, caregiverPin: p}))} onExit={() => navigateTo(ViewState.HOME)} onSelectSchedule={(id) => startRoutine(id)} onEditSchedule={handleEditScheduleRequest} onCreateCustom={handleCreateCustomRoutine} onDeleteSchedule={handleDeleteSchedule} onUpdateSchedule={handleUpdateSchedule} onUpdateProfile={(p) => setState(prev => ({ ...prev, profile: p }))} onToggleHighContrast={() => setState(prev => ({ ...prev, isHighContrast: !prev.isHighContrast }))} onToggleAudio={() => setAudioEnabled(!audioEnabled)} onLogBehavior={(log) => setState(prev => ({ ...prev, behaviorLogs: [...prev.behaviorLogs, { ...log, id: Date.now().toString(), timestamp: Date.now() }] }))} onMarkMessagesRead={handleMarkMessagesRead} parentMessages={state.parentMessages} onScheduleMessage={handleScheduleMessage} onOpenTherapy={() => navigateTo(ViewState.THERAPY)} onOpenOptimizer={handleOpenOptimizer} />}
      {state.view === ViewState.MOOD && <MoodCheck profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onSave={(entry) => setState(prev => ({ ...prev, moodLogs: [...prev.moodLogs, entry] }))} />}
      {state.view === ViewState.QUIZ && <EmotionQuiz age={state.profile.age} language={lang} stats={state.quizStats} onUpdateStats={(s) => setState(prev => ({ ...prev, quizStats: s, tokens: prev.tokens + (s.xp > prev.quizStats.xp ? 1 : 0) }))} onExit={() => navigateTo(ViewState.HOME)} />}
      {state.view === ViewState.SOCIAL && <SocialScenarioPractice age={state.profile.age} language={lang} onExit={() => navigateTo(ViewState.HOME)} onComplete={(success) => { if(success) setState(prev => ({ ...prev, tokens: prev.tokens + 2 })); }} />}
      {state.view === ViewState.VOICE_RECORDER && <VoiceRecorder onExit={() => navigateTo(ViewState.HOME)} onSave={handleSaveVoiceMessage} profile={state.profile} audioEnabled={audioEnabled} />}
      {state.view === ViewState.TIMER && <WaitTimer onExit={() => navigateTo(ViewState.HOME)} language={lang} audioEnabled={audioEnabled} profile={state.profile} />}
      {state.view === ViewState.RESEARCH && <ResearchTool onExit={() => navigateTo(ViewState.HOME)} language={lang} />}
      {state.view === ViewState.STORE && <RewardStore tokens={state.tokens} profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onRedeem={(cost) => setState(prev => ({ ...prev, tokens: prev.tokens - cost }))} />}
      {state.view === ViewState.COACH && <LiveVoiceCoach profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} audioEnabled={audioEnabled} />}
      {(state.view === ViewState.CALM) && <CalmMode onExit={() => navigateTo(ViewState.HOME)} language={lang} audioEnabled={audioEnabled} profile={state.profile} />}
      {state.view === ViewState.KIDS_BUILDER && <KidsRoutineBuilder profile={state.profile} onSave={handleBuilderSave} onExit={() => navigateTo(ViewState.HOME)} audioEnabled={audioEnabled} />}
      {state.view === ViewState.MAGIC_BOOKS && <MagicBookLibrary stories={state.stories} profile={state.profile} onSaveStory={handleSaveStory} onDeleteStory={handleDeleteStory} onExit={() => navigateTo(ViewState.HOME)} audioEnabled={audioEnabled} />}
      {state.view === ViewState.PARENT_INBOX && <ParentMessageInbox messages={state.parentMessages} profile={state.profile} onRespond={handleChildRespond} onExit={() => navigateTo(ViewState.HOME)} onRecordReply={() => navigateTo(ViewState.VOICE_RECORDER)} />}
      {state.view === ViewState.THERAPY && <TherapyManager sessions={state.therapySessions} profile={state.profile} onSaveSession={handleSaveTherapySession} onExit={() => navigateTo(ViewState.DASHBOARD)} />}
      {state.view === ViewState.LEARNING && <LearningPathDashboard profile={state.profile} paths={state.learningPaths} onUpdatePath={handleUpdateLearningPath} onExit={() => navigateTo(ViewState.HOME)} audioEnabled={audioEnabled} />}
      {state.view === ViewState.SCANNER && <EnvironmentScanner profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} />}
      {state.view === ViewState.OPTIMIZER && optimizerSchedule && <ScheduleOptimizer schedule={optimizerSchedule} profile={state.profile} completionLogs={state.completionLogs} behaviorLogs={state.behaviorLogs} onBack={() => navigateTo(ViewState.DASHBOARD)} onApply={handleApplyOptimization} language={lang} />}

      {state.view !== ViewState.CAMERA && state.view !== ViewState.CALM && state.view !== ViewState.KIDS_BUILDER && state.view !== ViewState.MAGIC_BOOKS && state.view !== ViewState.PARENT_INBOX && state.view !== ViewState.THERAPY && state.view !== ViewState.LEARNING && state.view !== ViewState.SCANNER && state.view !== ViewState.OPTIMIZER && !state.isAACOpen && (
        <button 
            onClick={() => setState(s => ({...s, isAACOpen: true}))}
            className={`fixed bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform z-50 ${state.isHighContrast ? 'bg-yellow-400 text-black border-4 border-white' : 'bg-blue-600 shadow-2xl text-white border-2 border-white'}`}
            style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}
            aria-label="Open Communication Board"
        >
             <i className="fa-solid fa-comment-dots text-3xl"></i>
        </button>
      )}

      <AACBoard 
        isOpen={state.isAACOpen} 
        onClose={() => setState(s => ({...s, isAACOpen: false}))} 
        language={lang}
        customButtons={state.customAACButtons}
        onAddCustomButton={(btn) => setState(s => ({ ...s, customAACButtons: [...s.customAACButtons, btn] }))}
        audioEnabled={audioEnabled}
        profile={state.profile}
      />
      </main>
    </div>
  );
};

export default App;
