
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Schedule, ChildProfile, MoodEntry, BehaviorLog, VoiceMessage } from './types';
import { generateScheduleFromImage } from './services/geminiService';
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
import { t } from './utils/translations';

const INITIAL_PROFILE: ChildProfile = {
  name: "Leo",
  age: 6,
  interests: ["Trains", "Space", "Dinosaurs"],
  language: "English",
  sensoryProfile: { soundSensitivity: 'medium' },
  audioPreferences: { speechRate: 1, pitch: 1 }
};

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 'demo-1',
    title: 'Morning Routine',
    type: 'Morning',
    socialStory: "Mornings are for getting ready. We follow steps so we can play sooner!",
    scheduledTime: "07:30", // Added default time
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
    voiceMessages: [],
    quizStats: { level: 1, xp: 0, totalAnswered: 0 },
    meltdownRisk: 'Low',
    caregiverPin: '1234'
  });

  const [generatedSchedule, setGeneratedSchedule] = useState<Omit<Schedule, 'id' | 'createdAt'> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

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
            // Migrate voice messages to include read property if missing
            voiceMessages: (parsed.voiceMessages || []).map((m: any) => ({ ...m, read: m.read ?? true })),
            profile: { 
                ...prev.profile, 
                ...parsed.profile, 
                language: parsed.profile?.language || 'English',
                audioPreferences: parsed.profile?.audioPreferences || { speechRate: 1, pitch: 1 } 
            },
            isHighContrast: parsed.isHighContrast || false,
            caregiverPin: parsed.caregiverPin || '1234',
            quizStats: parsed.quizStats || { level: 1, xp: 0, totalAnswered: 0 }
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

  useEffect(() => {
     const recentLogs = state.behaviorLogs.filter(l => (Date.now() - l.timestamp) < 24 * 60 * 60 * 1000);
     const severityScore = recentLogs.reduce((acc, log) => acc + (log.intensity === 'Severe' ? 3 : log.intensity === 'Moderate' ? 1 : 0), 0);
     let risk: 'Low' | 'Medium' | 'High' = 'Low';
     if (severityScore > 5) risk = 'High';
     else if (severityScore > 2) risk = 'Medium';
     if (risk !== state.meltdownRisk) {
         setState(prev => ({ ...prev, meltdownRisk: risk }));
     }
  }, [state.behaviorLogs]);

  const navigateTo = (view: ViewState) => setState(prev => ({ ...prev, view }));
  
  const startRoutine = (id: string) => {
    setState(prev => ({ ...prev, activeScheduleId: id, view: ViewState.RUNNER }));
  };

  const handleImageSelected = async (base64: string, mimeType: string) => {
    setIsProcessing(true);
    try {
      // Pass behaviorLogs so the AI can sequence smartly based on history
      // Also pass mimeType to handle video or image
      const newScheduleData = await generateScheduleFromImage(base64, mimeType, state.profile, state.behaviorLogs);
      setGeneratedSchedule(newScheduleData);
      navigateTo(ViewState.PREVIEW);
    } catch (error) {
      alert("Failed to generate schedule. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSchedule = (scheduleToSave?: Omit<Schedule, 'id' | 'createdAt'>) => {
    const source = scheduleToSave || generatedSchedule;
    if (source) {
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
      setGeneratedSchedule(null);
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
      
      // Trigger Notification if supported
      if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(t(state.profile.language, 'newMessageNotification'), {
                body: msg.transcription || "Click to listen",
                icon: 'https://cdn-icons-png.flaticon.com/512/2040/2040653.png' // Generic chat icon
            });
          } catch(e) {
            console.warn("Notification trigger failed", e);
          }
      }
  };

  const handleMarkMessagesRead = () => {
    setState(prev => ({
        ...prev,
        voiceMessages: prev.voiceMessages.map(m => ({ ...m, read: true }))
    }));
  };

  const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId);
  const lang = state.profile.language;
  const unreadCount = state.voiceMessages.filter(m => !m.read).length;

  if (!isLoaded) return null;

  const themeClass = state.isHighContrast 
    ? "bg-black text-yellow-300 [&_*]:border-yellow-400" 
    : "bg-background";

  const buttonClass = (color: string) => state.isHighContrast 
    ? "bg-gray-800 text-yellow-300 border-2 border-yellow-400 shadow-none hover:bg-gray-700"
    : `${color} shadow-md`;

  return (
    <div className={`h-full w-full relative ${themeClass} overflow-hidden`}>
      
      {state.meltdownRisk === 'High' && state.view === ViewState.HOME && (
          <div className="bg-red-500 text-white p-3 text-center animate-pulse flex justify-between items-center px-6">
              <span className="font-bold"><i className="fa-solid fa-triangle-exclamation mr-2"></i>High Meltdown Risk Detected</span>
              <button 
                onClick={() => navigateTo(ViewState.CALM)}
                className="bg-white text-red-500 text-xs px-3 py-1 rounded-full font-bold uppercase"
              >
                {t(lang, 'calmMode')}
              </button>
          </div>
      )}
      
      {state.view === ViewState.HOME && (
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h1 className="text-3xl font-bold text-primary">{t(lang, 'appTitle')}</h1>
            <div className="flex gap-2">
                <button 
                    onClick={() => navigateTo(ViewState.STORE)}
                    className={`${state.isHighContrast ? 'bg-black border border-yellow-400 text-yellow-400' : 'bg-yellow-100 text-yellow-700'} px-3 py-1 rounded-full font-bold flex items-center gap-1`}
                >
                    <i className="fa-solid fa-star"></i> {state.tokens}
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.DASHBOARD)}
                    className={`${state.isHighContrast ? 'bg-black border border-yellow-400 text-yellow-400' : 'bg-white text-gray-400'} w-10 h-10 rounded-full shadow-sm flex items-center justify-center relative`}
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

          <div className="flex-1 overflow-y-auto pb-20 w-full">
            <button 
                onClick={() => navigateTo(ViewState.CAMERA)}
                className={`w-full p-8 rounded-3xl flex flex-col items-center gap-4 active:scale-95 transition-transform mb-6 ${state.isHighContrast ? 'bg-yellow-400 text-black font-bold border-4 border-white' : 'bg-primary text-white shadow-xl'}`}
            >
                <i className="fa-solid fa-camera text-5xl"></i>
                <span className="text-2xl font-bold">{t(lang, 'snapRoutine')}</span>
            </button>

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
          
          <button 
            onClick={() => setState(s => ({...s, isAACOpen: true}))}
            className={`absolute bottom-6 right-6 w-16 h-16 rounded-full flex items-center justify-center active:scale-90 transition-transform z-10 ${state.isHighContrast ? 'bg-yellow-400 text-black border-4 border-white' : 'bg-white shadow-2xl text-gray-700'}`}
          >
             <i className="fa-regular fa-comment-dots text-3xl"></i>
          </button>
        </div>
      )}

      {state.view === ViewState.CAMERA && <CameraCapture isLoading={isProcessing} onImageSelected={handleImageSelected} onCancel={() => navigateTo(ViewState.HOME)} language={lang} />}
      {state.view === ViewState.PREVIEW && generatedSchedule && <PreviewSchedule schedule={generatedSchedule} profile={state.profile} onSave={handleSaveSchedule} onCancel={() => { setGeneratedSchedule(null); navigateTo(ViewState.HOME); }} />}
      {state.view === ViewState.RUNNER && activeSchedule && <ScheduleRunner schedule={activeSchedule} profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onComplete={() => { setState(prev => ({ ...prev, tokens: prev.tokens + 5 })); navigateTo(ViewState.HOME); }} />}
      {state.view === ViewState.DASHBOARD && <Dashboard schedules={state.schedules} profile={state.profile} moodLogs={state.moodLogs} behaviorLogs={state.behaviorLogs} voiceMessages={state.voiceMessages} isHighContrast={state.isHighContrast} caregiverPin={state.caregiverPin || '1234'} onUpdatePin={(p) => setState(prev => ({...prev, caregiverPin: p}))} onExit={() => navigateTo(ViewState.HOME)} onSelectSchedule={(id) => startRoutine(id)} onDeleteSchedule={handleDeleteSchedule} onUpdateSchedule={handleUpdateSchedule} onUpdateProfile={(p) => setState(prev => ({ ...prev, profile: p }))} onToggleHighContrast={() => setState(prev => ({ ...prev, isHighContrast: !prev.isHighContrast }))} onLogBehavior={(log) => setState(prev => ({ ...prev, behaviorLogs: [...prev.behaviorLogs, { ...log, id: Date.now().toString(), timestamp: Date.now() }] }))} onMarkMessagesRead={handleMarkMessagesRead} />}
      {state.view === ViewState.MOOD && <MoodCheck profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onSave={(entry) => setState(prev => ({ ...prev, moodLogs: [...prev.moodLogs, entry] }))} />}
      {state.view === ViewState.QUIZ && <EmotionQuiz age={state.profile.age} language={lang} stats={state.quizStats} onUpdateStats={(s) => setState(prev => ({ ...prev, quizStats: s, tokens: prev.tokens + (s.xp > prev.quizStats.xp ? 1 : 0) }))} onExit={() => navigateTo(ViewState.HOME)} />}
      {state.view === ViewState.SOCIAL && <SocialScenarioPractice age={state.profile.age} language={lang} onExit={() => navigateTo(ViewState.HOME)} onComplete={(success) => { if(success) setState(prev => ({ ...prev, tokens: prev.tokens + 2 })); }} />}
      {state.view === ViewState.VOICE_RECORDER && <VoiceRecorder onExit={() => navigateTo(ViewState.HOME)} onSave={handleSaveVoiceMessage} language={lang} />}
      {state.view === ViewState.TIMER && <WaitTimer onExit={() => navigateTo(ViewState.HOME)} language={lang} />}
      {state.view === ViewState.RESEARCH && <ResearchTool onExit={() => navigateTo(ViewState.HOME)} language={lang} />}
      {state.view === ViewState.STORE && <RewardStore tokens={state.tokens} profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} onRedeem={(cost) => setState(prev => ({ ...prev, tokens: prev.tokens - cost }))} />}
      {state.view === ViewState.COACH && <LiveVoiceCoach profile={state.profile} onExit={() => navigateTo(ViewState.HOME)} />}
      {(state.view === ViewState.CALM) && <CalmMode onExit={() => navigateTo(ViewState.HOME)} language={lang} />}
      <AACBoard isOpen={state.isAACOpen} onClose={() => setState(s => ({...s, isAACOpen: false}))} language={lang} />
    </div>
  );
};

export default App;
