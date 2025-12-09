
import React, { useState } from 'react';
import { AppState, ViewState, Schedule, ChildProfile, MoodEntry, BehaviorLog } from './types';
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

// Mock Initial Data
const INITIAL_PROFILE: ChildProfile = {
  name: "Leo",
  age: 6,
  interests: ["Trains", "Space", "Dinosaurs"],
  sensoryProfile: { soundSensitivity: 'medium' }
};

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 'demo-1',
    title: 'Morning Routine',
    type: 'Morning',
    createdAt: Date.now(),
    steps: [
      { id: 's1', emoji: '🛏️', instruction: 'Wake up', encouragement: 'Rise and shine!', completed: false },
      { id: 's2', emoji: '🚽', instruction: 'Potty', encouragement: 'Listen to your body.', completed: false },
      { id: 's3', emoji: '🧼', instruction: 'Wash Hands', encouragement: 'Clean hands feel good.', completed: false },
      { id: 's4', emoji: '🥣', instruction: 'Breakfast', encouragement: 'Yummy fuel!', completed: false },
    ]
  }
];

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: ViewState.HOME,
    activeScheduleId: null,
    schedules: INITIAL_SCHEDULES,
    profile: INITIAL_PROFILE,
    isAACOpen: false,
    tokens: 12,
    moodLogs: [],
    behaviorLogs: []
  });

  const [generatedSchedule, setGeneratedSchedule] = useState<Omit<Schedule, 'id' | 'createdAt'> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // -- Navigation Helpers --
  const navigateTo = (view: ViewState) => setState(prev => ({ ...prev, view }));
  
  const startRoutine = (id: string) => {
    setState(prev => ({ ...prev, activeScheduleId: id, view: ViewState.RUNNER }));
  };

  // -- Handlers --
  const handleImageSelected = async (base64: string) => {
    setIsProcessing(true);
    try {
      const newScheduleData = await generateScheduleFromImage(base64, state.profile);
      setGeneratedSchedule(newScheduleData);
      navigateTo(ViewState.PREVIEW);
    } catch (error) {
      alert("Failed to generate schedule. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveSchedule = () => {
    if (generatedSchedule) {
      const newSchedule: Schedule = {
        ...generatedSchedule,
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

  const handleDeleteSchedule = (id: string) => {
    if(confirm("Are you sure you want to delete this routine?")) {
        setState(prev => ({
            ...prev,
            schedules: prev.schedules.filter(s => s.id !== id)
        }));
    }
  };

  const activeSchedule = state.schedules.find(s => s.id === state.activeScheduleId);

  return (
    <div className="h-full w-full relative bg-background">
      
      {/* --- Main View Router --- */}
      
      {state.view === ViewState.HOME && (
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">ScheduleSnap</h1>
            <div className="flex gap-2">
                <button 
                    onClick={() => navigateTo(ViewState.STORE)}
                    className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-bold flex items-center gap-1"
                >
                    <i className="fa-solid fa-star"></i> {state.tokens}
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.DASHBOARD)}
                    className="w-10 h-10 bg-white rounded-full shadow-sm text-gray-400 flex items-center justify-center"
                >
                    <i className="fa-solid fa-gear"></i>
                </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pb-20">
            {/* Primary Action */}
            <button 
                onClick={() => navigateTo(ViewState.CAMERA)}
                className="w-full bg-primary text-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-4 active:scale-95 transition-transform mb-6"
            >
                <i className="fa-solid fa-camera text-5xl"></i>
                <span className="text-2xl font-bold">Snap New Routine</span>
            </button>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                    onClick={() => navigateTo(ViewState.CALM)}
                    className="bg-calm text-primary p-6 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <i className="fa-solid fa-wind text-3xl"></i>
                    <span className="font-bold">Calm Mode</span>
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.MOOD)}
                    className="bg-blue-100 text-blue-600 p-6 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <i className="fa-solid fa-face-smile text-3xl"></i>
                    <span className="font-bold">Feelings</span>
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.COACH)}
                    className="bg-purple-100 text-purple-600 p-6 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <i className="fa-solid fa-headset text-3xl"></i>
                    <span className="font-bold">AI Coach</span>
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.SOCIAL)}
                    className="bg-pink-100 text-pink-600 p-6 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <i className="fa-solid fa-users text-3xl"></i>
                    <span className="font-bold">Social</span>
                </button>
                <button 
                    onClick={() => navigateTo(ViewState.QUIZ)}
                    className="col-span-2 bg-orange-100 text-orange-600 p-6 rounded-2xl shadow-md flex flex-col items-center gap-2 active:scale-95 transition-transform"
                >
                    <i className="fa-solid fa-puzzle-piece text-3xl"></i>
                    <span className="font-bold">Emotion Quiz</span>
                </button>
            </div>

            {/* Recent Routines List */}
            <div>
                <h3 className="text-gray-500 font-bold mb-3 uppercase text-sm tracking-wider">My Routines</h3>
                <div className="space-y-3">
                    {state.schedules.map(schedule => (
                        <button 
                            key={schedule.id}
                            onClick={() => startRoutine(schedule.id)}
                            className="w-full bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 text-left active:bg-gray-50"
                        >
                            <span className="text-3xl">{schedule.steps[0]?.emoji}</span>
                            <div className="flex-1">
                                <h4 className="font-bold text-gray-800">{schedule.title}</h4>
                                <p className="text-xs text-gray-400">{schedule.steps.length} Steps</p>
                            </div>
                            <i className="fa-solid fa-play text-primary"></i>
                        </button>
                    ))}
                </div>
            </div>
          </div>
          
          {/* Floating AAC Button */}
          <button 
            onClick={() => setState(s => ({...s, isAACOpen: true}))}
            className="absolute bottom-6 right-6 w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center text-gray-700 active:scale-90 transition-transform z-10"
          >
             <i className="fa-regular fa-comment-dots text-3xl"></i>
          </button>
        </div>
      )}

      {/* --- Feature Views --- */}

      {state.view === ViewState.CAMERA && (
        <CameraCapture 
            isLoading={isProcessing}
            onImageSelected={handleImageSelected}
            onCancel={() => navigateTo(ViewState.HOME)}
        />
      )}

      {state.view === ViewState.PREVIEW && generatedSchedule && (
        <PreviewSchedule 
            schedule={generatedSchedule}
            onSave={handleSaveSchedule}
            onCancel={() => {
                setGeneratedSchedule(null);
                navigateTo(ViewState.HOME);
            }}
        />
      )}

      {state.view === ViewState.RUNNER && activeSchedule && (
        <ScheduleRunner 
            schedule={activeSchedule}
            onExit={() => navigateTo(ViewState.HOME)}
            onComplete={() => {
                setState(prev => ({ ...prev, tokens: prev.tokens + 5 })); // Reward tokens
                navigateTo(ViewState.HOME);
            }}
        />
      )}

      {state.view === ViewState.DASHBOARD && (
        <Dashboard 
            schedules={state.schedules}
            profile={state.profile}
            moodLogs={state.moodLogs}
            behaviorLogs={state.behaviorLogs}
            onExit={() => navigateTo(ViewState.HOME)}
            onSelectSchedule={(id) => startRoutine(id)}
            onDeleteSchedule={handleDeleteSchedule}
            onLogBehavior={(log) => setState(prev => ({
                ...prev,
                behaviorLogs: [...prev.behaviorLogs, { ...log, id: Date.now().toString(), timestamp: Date.now() }]
            }))}
        />
      )}

      {state.view === ViewState.MOOD && (
        <MoodCheck 
            profile={state.profile}
            onExit={() => navigateTo(ViewState.HOME)}
            onSave={(entry) => setState(prev => ({ ...prev, moodLogs: [...prev.moodLogs, entry] }))}
        />
      )}

      {state.view === ViewState.QUIZ && (
        <EmotionQuiz 
            age={state.profile.age}
            onExit={() => navigateTo(ViewState.HOME)}
            onCorrect={() => setState(prev => ({ ...prev, tokens: prev.tokens + 1 }))}
        />
      )}

      {state.view === ViewState.SOCIAL && (
        <SocialScenarioPractice 
            age={state.profile.age}
            onExit={() => navigateTo(ViewState.HOME)}
            onComplete={(success) => {
                if(success) setState(prev => ({ ...prev, tokens: prev.tokens + 2 }));
            }}
        />
      )}

      {state.view === ViewState.STORE && (
        <RewardStore 
            tokens={state.tokens}
            onExit={() => navigateTo(ViewState.HOME)}
            onRedeem={(cost) => setState(prev => ({ ...prev, tokens: prev.tokens - cost }))}
        />
      )}

      {state.view === ViewState.COACH && (
        <LiveVoiceCoach 
            profile={state.profile}
            onExit={() => navigateTo(ViewState.HOME)}
        />
      )}

      {/* --- Overlays --- */}

      {(state.view === ViewState.CALM) && (
        <CalmMode onExit={() => navigateTo(ViewState.HOME)} />
      )}

      <AACBoard 
        isOpen={state.isAACOpen} 
        onClose={() => setState(s => ({...s, isAACOpen: false}))} 
      />

    </div>
  );
};

export default App;
