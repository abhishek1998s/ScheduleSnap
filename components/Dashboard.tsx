
import React, { useState, useRef, useEffect } from 'react';
import { Schedule, ChildProfile, BehaviorLog, MoodEntry, BehaviorAnalysis, VoiceMessage, CompletionLog, WeeklyReport } from '../types';
import { analyzeBehaviorLogs, analyzeBehaviorVideo, optimizeSchedule, generateWeeklyReport } from '../services/geminiService';
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
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, completionLogs, voiceMessages, isHighContrast, caregiverPin, onExit, onSelectSchedule, onDeleteSchedule, onUpdateSchedule, onEditSchedule, onCreateCustom, onLogBehavior, onUpdateProfile, onToggleHighContrast, onUpdatePin, onMarkMessagesRead
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

  const handleOptimizeSchedule = async (schedule: Schedule) => {
    setOptimizingId(schedule.id);
    try {
        const optimized = await optimizeSchedule(schedule, behaviorLogs, profile);
        onUpdateSchedule(optimized);
        alert(`Successfully optimized "${schedule.title}" based on behavioral data.`);
    } catch (e) {
        alert("Optimization failed. Please try again.");
    } finally {
        setOptimizingId(null);
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
                const result = await analyzeBehaviorVideo(base64, profile);
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

                    <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border flex flex-col gap-6`}>
                        {/* Language Selector */}
                        <div className="flex items-center justify-between">
                            <span className="font-bold">{t(lang, 'language')}</span>
                            <select 
                                value={profile.language || 'English'} 
                                onChange={handleLanguageChange}
                                className={`p-2 rounded-lg font-bold text-sm border ${isHighContrast ? 'bg-black text-yellow-300 border-yellow-400' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                            >
                                <option value="English">English</option>
                                <option value="Hindi">हिन्दी (Hindi)</option>
                                <option value="Spanish">Español</option>
                                {/* ... other languages ... */}
                            </select>
                        </div>

                        {/* High Contrast */}
                        <div className="flex items-center justify-between">
                            <span className="font-bold">{t(lang, 'highContrast')}</span>
                            <button 
                                onClick={onToggleHighContrast}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${isHighContrast ? 'bg-yellow-400' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isHighContrast ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        
                        {/* Share & Security Sections */}
                         <div className="pt-4 border-t border-gray-100">
                             <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">{t(lang, 'security')}</span>
                             </div>
                             <div className="flex gap-2">
                                <input 
                                    type="tel"
                                    inputMode="numeric"
                                    pattern="[0-9]*" 
                                    placeholder="New 4-digit PIN"
                                    maxLength={4}
                                    value={newPinInput}
                                    onChange={(e) => setNewPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                    className="flex-1 border rounded-lg px-3 py-2 bg-gray-50 text-black text-sm"
                                />
                                <button 
                                    onClick={handleChangePin}
                                    disabled={newPinInput.length !== 4}
                                    className={`px-4 py-2 rounded-lg font-bold text-sm ${isHighContrast ? 'bg-gray-800 text-yellow-300' : 'bg-primary text-white disabled:opacity-50'}`}
                                >
                                    {t(lang, 'updatePin')}
                                </button>
                             </div>
                        </div>
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
                                    onClick={() => handleOptimizeSchedule(schedule)}
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

                    {/* Time of Day Chart */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">Time of Day Patterns</h3>
                        <div className="h-32 flex items-end justify-between px-4 gap-2 border-b border-gray-100 pb-1">
                            {getTimeOfDayStats().map(stat => (
                                <div key={stat.time} className="flex flex-col items-center gap-1 w-full h-full justify-end">
                                    <div 
                                        className="w-full bg-indigo-400 rounded-t-lg transition-all hover:bg-indigo-500"
                                        style={{ height: `${Math.max(stat.height, 5)}%` }}
                                        title={`${stat.time}: ${stat.count}`}
                                    ></div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] font-bold text-gray-400 px-4 mt-2">
                             <span>Morn</span><span>Mid</span><span>Eve</span><span>Night</span>
                        </div>
                    </div>

                    {/* Routine Completion Donut */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm flex gap-4 items-center">
                        <div className="relative w-24 h-24 shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {getCompletionDistribution().segments.map((seg, i) => (
                                    <circle
                                        key={i}
                                        cx="50" cy="50" r="40"
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="20"
                                        strokeDasharray={`${seg.percent} ${100 - seg.percent}`}
                                        strokeDashoffset={-seg.start}
                                    />
                                ))}
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-lg">
                                {getCompletionDistribution().total}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-700">Routines</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {getCompletionDistribution().segments.map(seg => (
                                    <div key={seg.type} className="flex items-center gap-1 text-xs">
                                        <div className="w-2 h-2 rounded-full" style={{background: seg.color}}></div>
                                        <span>{seg.type} ({Math.round(seg.percent)}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weekly Report Generator */}
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 rounded-2xl shadow-lg text-white">
                        <h3 className="font-bold text-lg mb-2">Weekly AI Report</h3>
                        <p className="text-xs opacity-80 mb-4">Generate insights based on logs from the past 7 days.</p>
                        
                        {generatingReport ? (
                            <div className="flex items-center gap-2">
                                <i className="fa-solid fa-circle-notch fa-spin"></i> Generating...
                            </div>
                        ) : weeklyReport ? (
                            <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm space-y-3">
                                <p className="text-sm font-bold">{weeklyReport.summary}</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-green-500/20 p-2 rounded">
                                        <div className="font-bold mb-1">{t(lang, 'wins')}</div>
                                        <ul className="list-disc pl-3">{weeklyReport.wins.map((w,i)=><li key={i}>{w}</li>)}</ul>
                                    </div>
                                    <div className="bg-red-500/20 p-2 rounded">
                                        <div className="font-bold mb-1">{t(lang, 'concerns')}</div>
                                        <ul className="list-disc pl-3">{weeklyReport.concerns.map((w,i)=><li key={i}>{w}</li>)}</ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleGenerateReport}
                                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-bold text-sm"
                            >
                                Generate Now
                            </button>
                        )}
                    </div>
                </div>
            )}

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

                    {/* Recent Logs List */}
                    <div className="space-y-2">
                        {behaviorLogs.slice().reverse().slice(0, 5).map(log => (
                            <div key={log.id} className="bg-white p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-gray-800">{log.behavior}</div>
                                    <div className="text-xs text-gray-400">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}</div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${log.intensity === 'Severe' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                    {log.intensity}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="space-y-4">
                    {voiceMessages.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">
                            <i className="fa-regular fa-envelope-open text-4xl mb-2"></i>
                            <p>{t(lang, 'noMessages')}</p>
                        </div>
                    ) : (
                        voiceMessages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-2xl border transition-colors ${msg.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-200'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-bold text-gray-400">
                                        {new Date(msg.timestamp).toLocaleString()}
                                    </span>
                                    {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                </div>
                                <div className="bg-gray-100 p-2 rounded-lg mb-2">
                                    <audio controls src={URL.createObjectURL(msg.audioBlob)} className="w-full h-8" />
                                </div>
                                
                                {msg.analysis ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <p className="font-bold text-xs text-gray-500 uppercase">{t(lang, 'interpretation')}</p>
                                            <p className="text-gray-800 font-bold">"{msg.analysis.interpretedMeaning}"</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="font-bold text-xs text-gray-400 uppercase">{t(lang, 'rawAudio')}</p>
                                                <p className="text-xs text-gray-600 italic">"{msg.analysis.rawTranscription}"</p>
                                            </div>
                                            <div>
                                                <p className="font-bold text-xs text-gray-400 uppercase">{t(lang, 'tone')}</p>
                                                <p className="text-xs text-gray-600 font-bold">{msg.analysis.emotionalTone}</p>
                                            </div>
                                        </div>
                                        {msg.analysis.suggestedResponses && msg.analysis.suggestedResponses.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100 mt-2">
                                                <p className="font-bold text-xs text-purple-500 uppercase mb-1">{t(lang, 'suggestedReplies')}</p>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    {msg.analysis.suggestedResponses.map((res, i) => (
                                                        <li key={i} className="text-xs text-gray-600">{res}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    msg.transcription && (
                                        <p className="text-sm text-gray-700 italic">"{msg.transcription}"</p>
                                    )
                                )}
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
    </div>
  );
};
