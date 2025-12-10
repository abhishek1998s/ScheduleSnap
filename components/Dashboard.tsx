
import React, { useState, useRef, useEffect } from 'react';
import { Schedule, ChildProfile, BehaviorLog, MoodEntry, BehaviorAnalysis, VoiceMessage, CompletionLog, WeeklyReport, ScheduleOptimization, ParentMessage } from '../types';
import { analyzeBehaviorLogs, analyzeBehaviorVideo, generateScheduleOptimization, generateWeeklyReport } from '../services/geminiService';
import { t } from '../utils/translations';

interface DashboardProps {
  schedules: Schedule[];
  profile: ChildProfile;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  completionLogs: CompletionLog[];
  voiceMessages: VoiceMessage[];
  isHighContrast: boolean;
  caregiverPin: string;
  onExit: () => void;
  onSelectSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateSchedule: (schedule: Schedule) => void;
  onEditSchedule: (id: string) => void;
  onCreateCustom: () => void;
  onLogBehavior: (log: Omit<BehaviorLog, 'id' | 'timestamp'>) => void;
  onUpdateProfile: (profile: ChildProfile) => void;
  onToggleHighContrast: () => void;
  onUpdatePin: (newPin: string) => void;
  onMarkMessagesRead: () => void;
  // New props for parent messages (passed via App state management, but here we can just pass the state setters if needed, or assume handled upstream. 
  // Ideally, App.tsx should pass message handling functions. For simplicity in this structure, I'll modify App.tsx to pass these.)
  parentMessages?: ParentMessage[];
  onScheduleMessage?: (msg: Omit<ParentMessage, 'id' | 'timestamp' | 'isDelivered' | 'isRead'>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, completionLogs, voiceMessages, isHighContrast, caregiverPin, onExit, onSelectSchedule, onDeleteSchedule, onUpdateSchedule, onEditSchedule, onCreateCustom, onLogBehavior, onUpdateProfile, onToggleHighContrast, onUpdatePin, onMarkMessagesRead,
  parentMessages = [], onScheduleMessage
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'routines' | 'behavior' | 'analytics' | 'messages'>('overview');
  const lang = profile.language;
  
  // Behavior Form State
  const [newLogBehavior, setNewLogBehavior] = useState('Meltdown');
  const [newLogIntensity, setNewLogIntensity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [newLogTrigger, setNewLogTrigger] = useState('');

  // Analysis State
  const [analysis, setAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Weekly Report State
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  // Agentic Optimization State
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [optimizationProposal, setOptimizationProposal] = useState<ScheduleOptimization | null>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age);
  const [editInterests, setEditInterests] = useState(profile.interests.join(', '));
  const [editLanguage, setEditLanguage] = useState(profile.language || 'English');
  const [editSpeechRate, setEditSpeechRate] = useState(profile.audioPreferences?.speechRate || 1);
  const [editThinkingMode, setEditThinkingMode] = useState(profile.useThinkingMode || false);
  const [editDefaultCamera, setEditDefaultCamera] = useState(profile.defaultCameraOn || false);

  // Pin Change State
  const [newPinInput, setNewPinInput] = useState('');

  // Parent Message Scheduling State
  const [msgContent, setMsgContent] = useState('');
  const [msgTime, setMsgTime] = useState('');
  // Added mimeType to state to preserve it
  const [msgMedia, setMsgMedia] = useState<{ base64: string, type: 'video' | 'audio', mimeType: string } | null>(null);
  const msgFileInputRef = useRef<HTMLInputElement>(null);

  // Goals (Simple local state for now)
  const [goals, setGoals] = useState([
      { id: 1, text: "Complete Morning Routine 5x", target: 5, current: 0, icon: "fa-sun", badge: "Morning Star" },
      { id: 2, text: "Log Mood daily", target: 7, current: 0, icon: "fa-face-smile", badge: "Emotion Explorer" }
  ]);

  useEffect(() => {
    // Update Goals based on logs
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCompletions = completionLogs.filter(l => l.timestamp > weekStart && l.scheduleTitle.includes("Morning")).length;
    const recentMoods = moodLogs.filter(l => l.timestamp > weekStart).length;
    
    setGoals(prev => prev.map(g => {
        if(g.id === 1) return { ...g, current: recentCompletions };
        if(g.id === 2) return { ...g, current: recentMoods };
        return g;
    }));
  }, [completionLogs, moodLogs]);

  const handleNumpadPress = (num: number) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleUnlock = () => {
     if (pin === caregiverPin) {
         setIsAuthenticated(true);
     } else {
         setPin('');
         alert("Incorrect PIN");
     }
  };

  const submitBehavior = () => {
    onLogBehavior({
        behavior: newLogBehavior,
        intensity: newLogIntensity,
        trigger: newLogTrigger
    });
    alert("Behavior logged");
    setNewLogTrigger('');
  };

  const runAnalysis = async () => {
    if (behaviorLogs.length < 2) {
        alert(t(lang, 'needLogs'));
        return;
    }
    setIsAnalyzing(true);
    try {
        const result = await analyzeBehaviorLogs(behaviorLogs, profile);
        setAnalysis(result);
    } catch (e) {
        alert("Analysis failed. Try again.");
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGenerateReport = async () => {
      setGeneratingReport(true);
      try {
          const report = await generateWeeklyReport(moodLogs, behaviorLogs, completionLogs, profile);
          setWeeklyReport(report);
      } catch(e) {
          alert("Could not generate report");
      } finally {
          setGeneratingReport(false);
      }
  };

  const handleOptimizeRequest = async (schedule: Schedule) => {
    setOptimizingId(schedule.id);
    try {
        const proposal = await generateScheduleOptimization(schedule, behaviorLogs, completionLogs, profile);
        setOptimizationProposal(proposal);
    } catch (e) {
        alert("Optimization failed. Please try again.");
    } finally {
        setOptimizingId(null);
    }
  };

  const applyOptimization = () => {
      if (optimizationProposal) {
          onUpdateSchedule(optimizationProposal.optimizedSchedule);
          setOptimizationProposal(null);
          alert('Optimization applied successfully!');
      }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
                // Pass mimeType to service
                const result = await analyzeBehaviorVideo(base64, profile, file.type);
                setAnalysis(result);
            } catch (error) {
                alert("Video analysis failed.");
            } finally {
                setIsAnalyzing(false);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleMsgMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = (reader.result as string).split(',')[1];
              const type = file.type.startsWith('video') ? 'video' : 'audio';
              // Save mimeType explicitly
              setMsgMedia({ base64, type, mimeType: file.type });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSendMessage = (quickText?: string) => {
      const content = quickText || msgContent;
      if (!content && !msgMedia) return;
      
      if (onScheduleMessage) {
          onScheduleMessage({
              content,
              type: msgMedia ? msgMedia.type : 'text',
              mediaBase64: msgMedia?.base64,
              mimeType: msgMedia?.mimeType, // Pass mimeType
              scheduledTime: msgTime || undefined
          });
          
          setMsgContent('');
          setMsgTime('');
          setMsgMedia(null);
          alert(t(lang, 'messageSent'));
      }
  };

  const saveProfile = () => {
    onUpdateProfile({
        ...profile,
        name: editName,
        age: Number(editAge),
        interests: editInterests.split(',').map(s => s.trim()),
        language: editLanguage,
        useThinkingMode: editThinkingMode,
        defaultCameraOn: editDefaultCamera,
        audioPreferences: {
            speechRate: editSpeechRate,
            pitch: 1
        }
    });
    setIsEditingProfile(false);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    onUpdateProfile({
        ...profile,
        language: newLang
    });
    setEditLanguage(newLang);
  };

  const handleChangePin = () => {
      if (newPinInput.length === 4 && /^\d+$/.test(newPinInput)) {
          onUpdatePin(newPinInput);
          setNewPinInput('');
          alert('PIN Updated Successfully');
      } else {
          alert('PIN must be 4 digits');
      }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const langCode = profile.language === 'Spanish' ? 'es-ES' : profile.language === 'Hindi' ? 'hi-IN' : 'en-US';
    u.lang = langCode;
    window.speechSynthesis.speak(u);
  };

  const unreadCount = voiceMessages.filter(m => !m.read).length;

  const getMoodPoints = () => {
    const logs = moodLogs.slice(-7);
    if (logs.length < 2) return "0,50 100,50";

    const moods = logs.map((l, i) => {
        let val = 3;
        if(l.mood === 'Happy') val = 5;
        else if(l.mood === 'Okay') val = 3;
        else if(l.mood === 'Tired') val = 2;
        else val = 1; // Sad, Angry, Scared
        
        const x = (i / (logs.length - 1)) * 100;
        const y = 100 - (val * 20); // 5->0, 1->80 roughly
        return `${x},${y}`;
    }).join(' ');
    return moods;
  };

  const getBehaviorStats = () => {
      const counts: Record<string, number> = {};
      behaviorLogs.forEach(l => {
          counts[l.behavior] = (counts[l.behavior] || 0) + 1;
      });
      const max = Math.max(...Object.values(counts), 1);
      return Object.entries(counts).map(([name, count]) => ({
          name, count, percent: (count / max) * 100
      })).sort((a,b) => b.count - a.count);
  };

  const getTimeOfDayStats = () => {
      const buckets = { Morning: 0, Midday: 0, Evening: 0, Night: 0 };
      behaviorLogs.forEach(l => {
          const h = new Date(l.timestamp).getHours();
          if (h >= 5 && h < 11) buckets.Morning++;
          else if (h >= 11 && h < 17) buckets.Midday++;
          else if (h >= 17 && h < 22) buckets.Evening++;
          else buckets.Night++;
      });
      const max = Math.max(...Object.values(buckets), 1);
      return Object.entries(buckets).map(([time, count]) => ({
          time, count, height: (count / max) * 100
      }));
  };

  const getCompletionDistribution = () => {
      const counts: Record<string, number> = {};
      let total = 0;
      completionLogs.forEach(l => {
          const matchedSchedule = schedules.find(s => s.id === l.scheduleId);
          const type = matchedSchedule ? matchedSchedule.type : 'General';
          counts[type] = (counts[type] || 0) + 1;
          total++;
      });
      let currentPercent = 0;
      const segments = Object.entries(counts).map(([type, count], index) => {
          const percent = (count / total) * 100;
          const start = currentPercent;
          currentPercent += percent;
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
          return { type, count, percent, color: colors[index % colors.length], start };
      });
      return { total, segments };
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-6 overflow-y-auto">
        <div className="bg-white p-6 rounded-3xl shadow-lg w-full max-w-sm text-center relative flex flex-col items-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <i className="fa-solid fa-lock text-primary text-xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{t(lang, 'parentAccess')}</h2>
            <p className="text-gray-500 text-sm mb-6">{t(lang, 'enterPin')}</p>
            
            <div className="flex gap-4 mb-8 justify-center h-8">
                 {[0, 1, 2, 3].map((i) => (
                      <div 
                        key={i}
                        className={`w-4 h-4 rounded-full transition-all duration-200 border-2 ${
                            i < pin.length ? 'bg-primary border-primary scale-110' : 'bg-transparent border-gray-300'
                        }`}
                      />
                 ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button 
                        key={num} 
                        onClick={() => handleNumpadPress(num)}
                        className="aspect-square bg-gray-50 rounded-full text-xl font-bold text-gray-700 active:bg-primary active:text-white transition-colors shadow-sm"
                    >
                        {num}
                    </button>
                ))}
                <div className="aspect-square"></div>
                <button 
                    onClick={() => handleNumpadPress(0)}
                    className="aspect-square bg-gray-50 rounded-full text-xl font-bold text-gray-700 active:bg-primary active:text-white transition-colors shadow-sm"
                >
                    0
                </button>
                <button 
                    onClick={handleBackspace}
                    className="aspect-square flex items-center justify-center text-gray-400 active:text-gray-600 rounded-full hover:bg-gray-50"
                >
                    <i className="fa-solid fa-delete-left text-xl"></i>
                </button>
            </div>

            <button onClick={handleUnlock} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-md mb-2">{t(lang, 'unlock')}</button>
            <button onClick={onExit} className="text-gray-400 text-sm py-2">{t(lang, 'cancel')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isHighContrast ? 'bg-black text-yellow-300' : 'bg-background'}`}>
        <div className={`${isHighContrast ? 'bg-gray-900 border-gray-700' : 'bg-white'} p-4 shadow-sm flex items-center gap-4`}>
            <button onClick={onExit} className="p-2 hover:bg-gray-100 rounded-full">
                <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h1 className="text-xl font-bold">{t(lang, 'dashboard')}</h1>
        </div>

        {/* Tabs */}
        <div className={`flex p-2 ${isHighContrast ? 'bg-black border-gray-700' : 'bg-white border-b'} gap-2 overflow-x-auto`}>
            {['overview', 'analytics', 'routines', 'behavior', 'messages'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => {
                        setActiveTab(tab as any);
                        if (tab === 'messages') onMarkMessagesRead();
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap relative ${
                        activeTab === tab 
                            ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white') 
                            : (isHighContrast ? 'bg-gray-800 text-yellow-200' : 'bg-gray-100 text-gray-500')
                    }`}
                >
                    {t(lang, tab)}
                    {tab === 'messages' && unreadCount > 0 && activeTab !== 'messages' && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                    )}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* ... Existing tabs (overview, routines, analytics, behavior) remain unchanged ... */}
            {activeTab === 'overview' && (
                <>
                    <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border`}>
                        <div className="flex justify-between items-start mb-4">
                             <h2 className="text-lg font-bold">{t(lang, 'childProfile')}</h2>
                             <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className={`${isHighContrast ? 'text-yellow-300' : 'text-primary'} text-sm font-bold`}
                             >
                                {isEditingProfile ? t(lang, 'cancel') : t(lang, 'edit')}
                             </button>
                        </div>
                        
                        {isEditingProfile ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs opacity-70">{t(lang, 'name')}</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">{t(lang, 'age')}</label>
                                    <input type="number" value={editAge} onChange={e => setEditAge(Number(e.target.value))} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">{t(lang, 'interests')}</label>
                                    <input value={editInterests} onChange={e => setEditInterests(e.target.value)} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">{t(lang, 'voiceSpeed')} ({editSpeechRate}x)</label>
                                    <input 
                                        type="range" 
                                        min="0.5" max="1.5" step="0.1"
                                        value={editSpeechRate} 
                                        onChange={(e) => setEditSpeechRate(Number(e.target.value))} 
                                        className="w-full" 
                                    />
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <input 
                                        type="checkbox" 
                                        id="thinking"
                                        checked={editThinkingMode}
                                        onChange={(e) => setEditThinkingMode(e.target.checked)}
                                        className="w-5 h-5 accent-primary"
                                    />
                                    <label htmlFor="thinking" className="text-sm font-bold">
                                        {t(lang, 'thinkingMode')}
                                        <span className="block text-xs opacity-60 font-normal">{t(lang, 'agentThinking')}</span>
                                    </label>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    <input 
                                        type="checkbox" 
                                        id="defaultCamera"
                                        checked={editDefaultCamera}
                                        onChange={(e) => setEditDefaultCamera(e.target.checked)}
                                        className="w-5 h-5 accent-primary"
                                    />
                                    <label htmlFor="defaultCamera" className="text-sm font-bold">
                                        {t(lang, 'defaultCamera')}
                                    </label>
                                </div>
                                <button onClick={saveProfile} className={`w-full ${isHighContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white'} py-2 rounded-lg font-bold`}>{t(lang, 'save')}</button>
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-2xl font-bold">{profile.name}, {profile.age}</h3>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {profile.interests.map(interest => (
                                        <span key={interest} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">{interest}</span>
                                    ))}
                                </div>
                                <div className="flex flex-wrap gap-4 mt-2 text-sm opacity-60">
                                    <span>Lang: {profile.language}</span>
                                    <span>Speed: {profile.audioPreferences?.speechRate || 1}x</span>
                                    {profile.useThinkingMode && <span className="text-purple-600 font-bold">✨ Thinking Mode On</span>}
                                    {profile.defaultCameraOn && <span className="text-blue-600 font-bold">🎥 AI Vision Default</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {activeTab === 'routines' && (
                <div className="space-y-4">
                    <button 
                        onClick={onCreateCustom}
                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-plus-circle text-xl"></i> {t(lang, 'createCustom')}
                    </button>

                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col gap-4 text-gray-800">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{schedule.steps[0]?.emoji}</span>
                                    <div>
                                        <h4 className="font-bold">{schedule.title}</h4>
                                        <p className="text-xs opacity-50">{schedule.steps.length} {t(lang, 'steps')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onEditSchedule(schedule.id)} 
                                        className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit Routine"
                                    >
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button onClick={() => onDeleteSchedule(schedule.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-lg transition-colors"><i className="fa-solid fa-trash"></i></button>
                                </div>
                            </div>
                            
                            {/* Agentic Optimization Button */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleOptimizeRequest(schedule)}
                                    disabled={optimizingId === schedule.id}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2
                                        ${optimizingId === schedule.id 
                                            ? 'bg-purple-50 text-purple-400 border-purple-100' 
                                            : 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                                        }
                                    `}
                                >
                                    {optimizingId === schedule.id ? (
                                        <>
                                            <i className="fa-solid fa-circle-notch fa-spin"></i> {t(lang, 'agentOptimizing')}
                                        </>
                                    ) : (
                                        <>
                                            <i className="fa-solid fa-wand-magic-sparkles"></i> {t(lang, 'autoImprove')}
                                        </>
                                    )}
                                </button>
                            </div>
                            {optimizingId === schedule.id && (
                                <p className="text-[10px] text-purple-500 text-center animate-pulse">
                                    {t(lang, 'agentThinking')}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Analytics Tab - Same as previous */}
            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Weekly Goals Section */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">Weekly Goals</h3>
                        <div className="space-y-4">
                            {goals.map(goal => (
                                <div key={goal.id} className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${goal.current >= goal.target ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <i className={`fa-solid ${goal.icon}`}></i>
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-sm text-gray-700">{goal.text}</span>
                                            <span className="text-xs font-bold text-gray-500">{goal.current}/{goal.target}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2">
                                            <div 
                                                className={`h-2 rounded-full transition-all ${goal.current >= goal.target ? 'bg-yellow-400' : 'bg-primary'}`}
                                                style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {goal.current >= goal.target && (
                                        <i className="fa-solid fa-medal text-2xl text-yellow-400 animate-bounce"></i>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Weekly Mood Chart */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">{t(lang, 'analytics')} - Mood</h3>
                        <div className="h-40 relative flex items-end justify-between px-2">
                            {/* Simple Line Chart SVG */}
                            <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
                                <polyline 
                                    points={getMoodPoints()} 
                                    fill="none" 
                                    stroke="#3b82f6" 
                                    strokeWidth="3" 
                                    strokeLinecap="round"
                                />
                            </svg>
                            {/* Labels */}
                            <div className="absolute bottom-0 w-full flex justify-between text-xs text-gray-400 px-4">
                                <span>Start</span><span>Now</span>
                            </div>
                        </div>
                    </div>

                    {/* Behavior Frequency Chart */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">Behavior Frequency</h3>
                        <div className="space-y-3">
                            {getBehaviorStats().length > 0 ? getBehaviorStats().map(stat => (
                                <div key={stat.name} className="flex items-center gap-2 text-xs">
                                    <span className="w-20 font-bold text-gray-500 truncate">{stat.name}</span>
                                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className="h-full bg-red-400 rounded-full" 
                                            style={{ width: `${stat.percent}%` }}
                                        ></div>
                                    </div>
                                    <span className="w-6 text-right font-bold text-gray-400">{stat.count}</span>
                                </div>
                            )) : (
                                <p className="text-gray-400 text-sm text-center py-4">No data yet</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Behavior Tab - Same as previous */}
            {activeTab === 'behavior' && (
                <div className="space-y-6">
                    {/* Log Entry Form */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">{t(lang, 'logIncident')}</h3>
                        <div className="space-y-3">
                            <select 
                                value={newLogBehavior}
                                onChange={(e) => setNewLogBehavior(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50"
                            >
                                {['Meltdown', 'Aggression', 'Self-Injury', 'Elopement', 'Refusal', 'Anxiety', 'Stimming'].map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                            
                            <div className="flex gap-2">
                                {['Mild', 'Moderate', 'Severe'].map(lvl => (
                                    <button
                                        key={lvl}
                                        onClick={() => setNewLogIntensity(lvl as any)}
                                        className={`flex-1 py-2 rounded-lg text-xs font-bold border ${newLogIntensity === lvl ? 'bg-primary text-white border-primary' : 'border-gray-200'}`}
                                    >
                                        {lvl}
                                    </button>
                                ))}
                            </div>

                            <input 
                                type="text"
                                placeholder={t(lang, 'triggerOptional')}
                                value={newLogTrigger}
                                onChange={(e) => setNewLogTrigger(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-gray-50"
                            />

                            <button 
                                onClick={submitBehavior}
                                className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-md"
                            >
                                {t(lang, 'logIncident')}
                            </button>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-indigo-800"><i className="fa-solid fa-brain mr-2"></i>{t(lang, 'aiInsights')}</h3>
                            <button onClick={runAnalysis} disabled={isAnalyzing} className="text-xs bg-indigo-200 text-indigo-800 px-3 py-1 rounded-full font-bold">
                                {isAnalyzing ? t(lang, 'analyzing') : t(lang, 'analyze')}
                            </button>
                        </div>

                        {analysis ? (
                            <div className="space-y-3 text-sm">
                                <div className="p-3 bg-white rounded-xl">
                                    <div className="font-bold text-gray-500 text-xs uppercase">{t(lang, 'insight')}</div>
                                    <p>{analysis.insight}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 bg-white rounded-xl">
                                        <div className="font-bold text-orange-500 text-xs uppercase">{t(lang, 'likelyTriggers')}</div>
                                        <ul className="list-disc pl-3 mt-1 text-xs text-gray-600">{analysis.triggers.map((t,i)=><li key={i}>{t}</li>)}</ul>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl">
                                        <div className="font-bold text-green-500 text-xs uppercase">{t(lang, 'suggestions')}</div>
                                        <ul className="list-disc pl-3 mt-1 text-xs text-gray-600">{analysis.suggestions.map((t,i)=><li key={i}>{t}</li>)}</ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 text-indigo-300">
                                <p className="text-xs">{t(lang, 'needLogs')}</p>
                                <div className="mt-4 border-t border-indigo-200 pt-4">
                                    <label className="block text-xs font-bold mb-2 cursor-pointer bg-white p-2 rounded-lg border border-dashed border-indigo-300 hover:bg-indigo-50 transition-colors">
                                        <i className="fa-solid fa-video mr-1"></i> Upload Behavior Video for Analysis
                                        <input type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} ref={videoInputRef} />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="space-y-4">
                    {/* Parent-Child Communication Bridge Interface */}
                    <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
                        <h3 className="font-bold text-pink-700 mb-4">{t(lang, 'scheduleMessage')}</h3>
                        
                        <div className="space-y-3">
                            {/* Quick Sends */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                <button onClick={() => handleSendMessage(t(lang, 'proudOfYou'))} className="whitespace-nowrap px-3 py-2 bg-white rounded-full text-xs font-bold text-pink-600 shadow-sm border border-pink-100 hover:bg-pink-100">{t(lang, 'proudOfYou')}</button>
                                <button onClick={() => handleSendMessage(t(lang, 'loveYou'))} className="whitespace-nowrap px-3 py-2 bg-white rounded-full text-xs font-bold text-pink-600 shadow-sm border border-pink-100 hover:bg-pink-100">{t(lang, 'loveYou')}</button>
                                <button onClick={() => handleSendMessage(t(lang, 'seeYouSoon'))} className="whitespace-nowrap px-3 py-2 bg-white rounded-full text-xs font-bold text-pink-600 shadow-sm border border-pink-100 hover:bg-pink-100">{t(lang, 'seeYouSoon')}</button>
                            </div>

                            <textarea 
                                value={msgContent}
                                onChange={(e) => setMsgContent(e.target.value)}
                                placeholder={t(lang, 'typeMessage')}
                                className="w-full p-3 rounded-xl border border-pink-200 text-sm focus:border-pink-400 outline-none"
                                rows={2}
                            />
                            
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => msgFileInputRef.current?.click()}
                                    className="px-3 py-2 bg-white rounded-lg border border-pink-200 text-pink-500 text-xs font-bold flex items-center gap-2"
                                >
                                    <i className="fa-solid fa-paperclip"></i> {msgMedia ? 'Media Added' : t(lang, 'uploadMedia')}
                                </button>
                                <input 
                                    type="file" 
                                    accept="audio/*,video/*" 
                                    ref={msgFileInputRef} 
                                    className="hidden" 
                                    onChange={handleMsgMediaUpload} 
                                />
                                
                                <div className="flex-1 flex items-center gap-2 bg-white rounded-lg border border-pink-200 px-2">
                                    <i className="fa-regular fa-clock text-gray-400 text-xs"></i>
                                    <input 
                                        type="time" 
                                        value={msgTime} 
                                        onChange={(e) => setMsgTime(e.target.value)}
                                        className="w-full py-2 text-xs outline-none text-gray-600"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                className="w-full bg-pink-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-pink-600"
                            >
                                {msgTime ? t(lang, 'scheduleMessage') : t(lang, 'sendNow')}
                            </button>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-700 mt-4">{t(lang, 'parentOutbox')}</h3>
                    <div className="space-y-2">
                        {parentMessages.slice().reverse().map(msg => (
                            <div key={msg.id} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${msg.isRead ? 'bg-green-400' : 'bg-gray-300'}`}>
                                    <i className={`fa-solid ${msg.isRead ? 'fa-check-double' : 'fa-check'}`}></i>
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800 text-sm">{msg.content || 'Media Message'}</p>
                                    <p className="text-xs text-gray-400">
                                        {msg.scheduledTime ? `${t(lang, 'scheduleFor')} ${msg.scheduledTime}` : 'Sent Immediately'}
                                    </p>
                                </div>
                                {msg.childResponse && (
                                    <div className="text-2xl">{msg.childResponse}</div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Existing Child -> Parent Messages */}
                    <h3 className="font-bold text-gray-700 mt-6">{t(lang, 'messages')} (Child)</h3>
                    {voiceMessages.length === 0 ? (
                        <div className="text-center text-gray-400 py-4">
                            <p>{t(lang, 'noMessages')}</p>
                        </div>
                    ) : (
                        voiceMessages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-2xl border transition-colors ${msg.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}`}>
                                {/* ... existing message display code ... */}
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-gray-400">
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </span>
                                    {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                </div>
                                <div className="bg-gray-100 p-2 rounded-lg mb-2">
                                    <audio controls src={URL.createObjectURL(msg.audioBlob)} className="w-full h-8" />
                                </div>
                                {msg.transcription && <p className="text-sm italic text-gray-600">"{msg.transcription}"</p>}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
        
        {/* Apply Changes Button at bottom */}
        <div className={`p-4 border-t shrink-0 ${isHighContrast ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'}`}>
             <button 
                onClick={onExit}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                    isHighContrast 
                    ? 'bg-yellow-400 text-black' 
                    : 'bg-primary text-white hover:bg-secondary'
                }`}
             >
                <i className="fa-solid fa-check-circle"></i> {t(lang, 'applyExit')}
             </button>
        </div>
        
        {/* ... (Agentic Optimization Modal code omitted for brevity as it is unchanged) ... */}
        {optimizationProposal && (
            <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative">
                    <button 
                        onClick={() => setOptimizationProposal(null)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <i className="fa-solid fa-times text-xl"></i>
                    </button>
                    {/* ... (rest of modal) ... */}
                </div>
            </div>
        )}
    </div>
  );
};
