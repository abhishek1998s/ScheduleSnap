
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
  onLogBehavior: (log: Omit<BehaviorLog, 'id' | 'timestamp'>) => void;
  onUpdateProfile: (profile: ChildProfile) => void;
  onToggleHighContrast: () => void;
  onUpdatePin: (newPin: string) => void;
  onMarkMessagesRead: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, completionLogs, voiceMessages, isHighContrast, caregiverPin, onExit, onSelectSchedule, onDeleteSchedule, onUpdateSchedule, onLogBehavior, onUpdateProfile, onToggleHighContrast, onUpdatePin, onMarkMessagesRead
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
  const [shareCode, setShareCode] = useState<string | null>(null);

  // Pin Change State
  const [newPinInput, setNewPinInput] = useState('');

  // Goals (Simple local state for now)
  const [goals, setGoals] = useState([
      { id: 1, text: "Complete Morning Routine 5x", target: 5, current: 0, icon: "fa-sun" },
      { id: 2, text: "Log Mood daily", target: 7, current: 0, icon: "fa-face-smile" }
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

  const generateShareCode = () => {
     const code = Math.random().toString(36).substring(2, 8).toUpperCase();
     setShareCode(code);
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

  // Analytics Logic
  const getMoodPoints = () => {
    const moods = moodLogs.slice(-7).map((l, i) => {
        let val = 3;
        if(l.mood === 'Happy') val = 5;
        else if(l.mood === 'Okay') val = 3;
        else if(l.mood === 'Sad') val = 1;
        else if(l.mood === 'Angry') val = 1;
        else if(l.mood === 'Tired') val = 2;
        else if(l.mood === 'Scared') val = 1;
        return `${i * 40},${100 - (val * 20)}`;
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
      }));
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
            
            {/* Visual PIN Dots */}
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

            {/* Custom On-Screen Numpad */}
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
                                        className="w-5 h-5"
                                    />
                                    <label htmlFor="thinking" className="text-sm font-bold">
                                        {t(lang, 'thinkingMode')}
                                        <span className="block text-xs opacity-60 font-normal">{t(lang, 'agentThinking')}</span>
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
                                <option value="French">Français</option>
                                <option value="German">Deutsch</option>
                                <option value="Chinese">中文</option>
                                <option value="Japanese">日本語</option>
                                <option value="Korean">한국어</option>
                                <option value="Italian">Italiano</option>
                                <option value="Portuguese">Português</option>
                                <option value="Arabic">العربية</option>
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
                        
                        {/* Share */}
                        <div className="pt-4 border-t border-gray-100">
                             <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">{t(lang, 'shareProfile')}</span>
                                {shareCode && <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs select-all">{shareCode}</span>}
                             </div>
                             <button 
                                onClick={generateShareCode}
                                className={`w-full py-2 rounded-lg font-bold text-sm ${isHighContrast ? 'bg-gray-800 text-yellow-300' : 'bg-blue-50 text-blue-600'}`}
                             >
                                {shareCode ? t(lang, 'regenerateCode') : t(lang, 'generateCode')}
                             </button>
                        </div>

                         {/* Security - Change PIN */}
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

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{schedules.length}</div>
                            <div className="text-xs text-blue-400 font-bold uppercase">{t(lang, 'routines')}</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-orange-900">
                            <div className="text-3xl font-bold text-orange-600 mb-1">{moodLogs.length}</div>
                            <div className="text-xs text-orange-400 font-bold uppercase">{t(lang, 'logs')}</div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Goal Tracking */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-bullseye text-primary"></i> Weekly Goals
                        </h3>
                        <div className="space-y-4">
                            {goals.map(goal => {
                                const percent = Math.min((goal.current / goal.target) * 100, 100);
                                return (
                                    <div key={goal.id}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-gray-700 flex items-center gap-2">
                                                <i className={`fa-solid ${goal.icon} text-gray-400`}></i> {goal.text}
                                            </span>
                                            <span className="text-gray-500 font-bold">{goal.current}/{goal.target}</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full transition-all ${percent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mood Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="font-bold text-gray-800 mb-4">Mood Trends (Last 7 Entries)</h3>
                         {moodLogs.length > 1 ? (
                             <div className="h-40 w-full relative border-l border-b border-gray-200">
                                 <svg viewBox="0 0 240 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                     <polyline 
                                         fill="none" 
                                         stroke="#3b82f6" 
                                         strokeWidth="3" 
                                         points={getMoodPoints()} 
                                     />
                                     {moodLogs.slice(-7).map((l, i) => (
                                         <circle 
                                            key={i}
                                            cx={i * 40} 
                                            cy={100 - ((l.mood === 'Happy' ? 5 : l.mood === 'Okay' ? 3 : 1) * 20)} 
                                            r="4" 
                                            fill="#fff" 
                                            stroke="#3b82f6" 
                                            strokeWidth="2" 
                                         />
                                     ))}
                                 </svg>
                             </div>
                         ) : (
                             <p className="text-gray-400 text-sm italic">Not enough mood data yet.</p>
                         )}
                    </div>

                    {/* Behavior Chart */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="font-bold text-gray-800 mb-4">Behavior Frequency</h3>
                         <div className="space-y-3">
                             {getBehaviorStats().length > 0 ? getBehaviorStats().map(stat => (
                                 <div key={stat.name} className="flex items-center gap-3">
                                     <div className="w-24 text-xs font-bold text-gray-600 truncate">{stat.name}</div>
                                     <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                                         <div 
                                            className="h-full bg-orange-400" 
                                            style={{ width: `${stat.percent}%` }}
                                         />
                                     </div>
                                     <div className="w-6 text-xs font-bold text-gray-500">{stat.count}</div>
                                 </div>
                             )) : <p className="text-gray-400 text-sm italic">No behavior logs recorded.</p>}
                         </div>
                    </div>

                    {/* AI Weekly Report */}
                    <div className="bg-indigo-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-indigo-900"><i className="fa-solid fa-file-contract mr-2"></i>AI Weekly Report</h3>
                             <button 
                                onClick={handleGenerateReport}
                                disabled={generatingReport}
                                className="px-3 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm disabled:opacity-50"
                             >
                                {generatingReport ? <i className="fa-solid fa-circle-notch fa-spin"></i> : "Generate"}
                             </button>
                         </div>
                         
                         {weeklyReport ? (
                             <div className="space-y-4 text-sm">
                                 <p className="text-indigo-800 italic bg-white p-3 rounded-xl border border-indigo-100">
                                     "{weeklyReport.summary}"
                                 </p>
                                 
                                 <div className="grid grid-cols-2 gap-2">
                                     <div className="bg-green-100 p-3 rounded-xl border border-green-200">
                                         <h4 className="font-bold text-green-800 mb-1 text-xs uppercase">Wins</h4>
                                         <ul className="list-disc list-inside text-green-700 text-xs">
                                             {weeklyReport.wins.map((w,i) => <li key={i}>{w}</li>)}
                                         </ul>
                                     </div>
                                     <div className="bg-yellow-100 p-3 rounded-xl border border-yellow-200">
                                         <h4 className="font-bold text-yellow-800 mb-1 text-xs uppercase">Concerns</h4>
                                         <ul className="list-disc list-inside text-yellow-700 text-xs">
                                             {weeklyReport.concerns.map((w,i) => <li key={i}>{w}</li>)}
                                         </ul>
                                     </div>
                                 </div>
                             </div>
                         ) : (
                             <p className="text-indigo-400 text-sm text-center">Tap generate to analyze this week's progress.</p>
                         )}
                    </div>
                </div>
            )}

            {activeTab === 'routines' && (
                <div className="space-y-3">
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
                                <button onClick={() => onDeleteSchedule(schedule.id)} className="text-red-400 p-2"><i className="fa-solid fa-trash"></i></button>
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

            {activeTab === 'messages' && (
                <div className="space-y-4">
                     <h3 className="font-bold">{t(lang, 'messages')}</h3>
                     {voiceMessages.length === 0 ? <p className="opacity-50">{t(lang, 'noMessages')}</p> : 
                        voiceMessages.map(msg => (
                            <div key={msg.id} className={`p-4 rounded-2xl shadow-sm border ${msg.read ? 'bg-white border-transparent' : 'bg-blue-50 border-blue-200 text-blue-900'}`}>
                                <div className="flex justify-between items-center mb-2">
                                     <p className="text-xs opacity-60">{new Date(msg.timestamp).toLocaleString()}</p>
                                     {!msg.read && <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">New</span>}
                                </div>
                                <audio controls src={URL.createObjectURL(msg.audioBlob)} className="w-full mb-3" />
                                {msg.transcription && (
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <p className="text-xs text-gray-500 font-bold mb-1 uppercase tracking-wider">{t(lang, 'transcription')}</p>
                                        <p className="text-sm text-gray-700 italic">"{msg.transcription}"</p>
                                    </div>
                                )}
                            </div>
                        ))
                     }
                </div>
            )}

            {activeTab === 'behavior' && (
                <div className="space-y-6">
                     <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border`}>
                        <h3 className="font-bold mb-4">{t(lang, 'quickLog')}</h3>
                        <div className="flex flex-col gap-6 text-black">
                            <select 
                                value={newLogBehavior}
                                onChange={(e) => setNewLogBehavior(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 text-lg"
                            >
                                {['Meltdown', 'Stimming', 'Aggression', 'Elopement', 'Refusal', 'Anxiety'].map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            
                            <div className="flex gap-2">
                                {['Mild', 'Moderate', 'Severe'].map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setNewLogIntensity(l as any)}
                                        className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                                            newLogIntensity === l 
                                            ? 'bg-gray-800 text-white border-gray-800 shadow-md' 
                                            : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                        }`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            
                            <input 
                                type="text"
                                placeholder={t(lang, 'triggerOptional')}
                                value={newLogTrigger}
                                onChange={(e) => setNewLogTrigger(e.target.value)}
                                className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200"
                            />
                            
                            <button 
                                onClick={submitBehavior} 
                                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold shadow-lg mt-2 active:scale-95 transition-transform"
                            >
                                {t(lang, 'logIncident')}
                            </button>
                        </div>
                     </div>

                     {/* AI Analysis Section */}
                     <div className={`${isHighContrast ? 'bg-purple-900' : 'bg-purple-50'} p-6 rounded-2xl shadow-sm border border-purple-100`}>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold"><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>{t(lang, 'aiInsights')}</h3>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => videoInputRef.current?.click()}
                                    className="px-3 py-2 bg-purple-200 text-purple-800 text-xs font-bold rounded-lg"
                                >
                                    <i className="fa-solid fa-video mr-1"></i> {t(lang, 'video')}
                                </button>
                                <button 
                                    onClick={runAnalysis}
                                    disabled={isAnalyzing || behaviorLogs.length < 2}
                                    className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                >
                                    {isAnalyzing ? t(lang, 'analyzing') : t(lang, 'analyze')}
                                </button>
                             </div>
                             <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={handleVideoUpload} />
                        </div>
                        
                        {analysis ? (
                             <div className="space-y-3 text-sm text-black">
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">{t(lang, 'insight')}:</p>
                                    <p className="text-gray-600">{analysis.insight}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">{t(lang, 'likelyTriggers')}:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {analysis.triggers.map(t => <span key={t} className="px-2 py-0.5 bg-red-100 text-red-600 rounded-md text-xs font-bold">{t}</span>)}
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">{t(lang, 'suggestions')}:</p>
                                    <ul className="list-disc list-inside text-gray-600">
                                        {analysis.suggestions.map((s,i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                             </div>
                        ) : (
                            <p className="opacity-70 text-sm italic text-center">
                                {t(lang, 'needLogs')}
                            </p>
                        )}
                     </div>

                     <div className={`${isHighContrast ? 'bg-gray-900' : 'bg-white'} p-6 rounded-2xl shadow-sm border border-gray-100`}>
                        <h3 className="font-bold mb-4">{t(lang, 'logs')}</h3>
                        <div className="space-y-3">
                            {behaviorLogs.length === 0 ? <p className="opacity-50 text-sm">{t(lang, 'noIncidents')}</p> : 
                                behaviorLogs.slice().reverse().slice(0,5).map(log => (
                                    <div key={log.id} className="text-sm p-4 bg-red-50 text-red-900 rounded-xl flex flex-col gap-1 border border-red-100">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg">{log.behavior}</span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${log.intensity === 'Severe' ? 'bg-red-200' : log.intensity === 'Moderate' ? 'bg-orange-200' : 'bg-yellow-200'}`}>
                                                {log.intensity}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-1 text-red-700/70">
                                            <span>{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            {log.trigger && <span className="text-xs font-bold max-w-[50%] truncate">Trigger: {log.trigger}</span>}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                     </div>
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
