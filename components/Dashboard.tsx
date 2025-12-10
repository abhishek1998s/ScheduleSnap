
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
  audioEnabled: boolean;
  onExit: () => void;
  onSelectSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onUpdateSchedule: (schedule: Schedule) => void;
  onEditSchedule: (id: string) => void;
  onCreateCustom: () => void;
  onLogBehavior: (log: Omit<BehaviorLog, 'id' | 'timestamp'>) => void;
  onUpdateProfile: (profile: ChildProfile) => void;
  onToggleHighContrast: () => void;
  onToggleAudio: () => void;
  onUpdatePin: (newPin: string) => void;
  onMarkMessagesRead: () => void;
  parentMessages?: ParentMessage[];
  onScheduleMessage?: (msg: Omit<ParentMessage, 'id' | 'timestamp' | 'isDelivered' | 'isRead'>) => void;
  onOpenTherapy?: () => void;
  onOpenOptimizer: (scheduleId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, completionLogs, voiceMessages, isHighContrast, caregiverPin, audioEnabled, onExit, onSelectSchedule, onDeleteSchedule, onUpdateSchedule, onEditSchedule, onCreateCustom, onLogBehavior, onUpdateProfile, onToggleHighContrast, onToggleAudio, onUpdatePin, onMarkMessagesRead,
  parentMessages = [], onScheduleMessage, onOpenTherapy, onOpenOptimizer
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
  const [msgMedia, setMsgMedia] = useState<{ base64: string, type: 'video' | 'audio', mimeType: string } | null>(null);
  const msgFileInputRef = useRef<HTMLInputElement>(null);

  // Goals (Computed)
  const [goals, setGoals] = useState([
      { id: 1, text: "Complete Routines", target: 5, current: 0, icon: "fa-sun", badge: "Morning Star" },
      { id: 2, text: "Log Mood", target: 7, current: 0, icon: "fa-face-smile", badge: "Emotion Explorer" }
  ]);

  useEffect(() => {
    // Update Goals based on logs
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentCompletions = completionLogs.filter(l => l.timestamp > weekStart).length;
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

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setIsAnalyzing(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
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
              mimeType: msgMedia?.mimeType,
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

  const unreadCount = voiceMessages.filter(m => !m.read).length;

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
                    aria-label="Backspace"
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

  // UPDATED LAYOUT: Single scroll container with Sticky Header to fix clipping/access issues on small screens
  return (
    <div className={`h-full ${isHighContrast ? 'bg-black text-yellow-300' : 'bg-background'} overflow-y-auto`}>
        
        {/* Sticky Header Container */}
        <div className="sticky top-0 z-30 shadow-sm">
            {/* Main Header */}
            <div className={`${isHighContrast ? 'bg-gray-900 border-gray-700' : 'bg-white'} p-4 flex items-center gap-4`}>
                <button onClick={onExit} className="p-3 hover:bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center" aria-label="Exit Dashboard">
                    <i className="fa-solid fa-arrow-left"></i>
                </button>
                <h1 className="text-xl font-bold">{t(lang, 'dashboard')}</h1>
                {/* Audio Toggle */}
                <button 
                    onClick={onToggleAudio}
                    className={`ml-auto px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${audioEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    aria-label={audioEnabled ? "Mute Audio" : "Enable Audio"}
                >
                    {audioEnabled ? <><i className="fa-solid fa-volume-high"></i> ON</> : <><i className="fa-solid fa-volume-xmark"></i> OFF</>}
                </button>
            </div>

            {/* Tabs */}
            <div className={`flex p-2 ${isHighContrast ? 'bg-black border-gray-700' : 'bg-white border-b'} gap-2 overflow-x-auto`} role="tablist">
                {['overview', 'analytics', 'routines', 'behavior', 'messages'].map(tab => (
                    <button 
                        key={tab}
                        role="tab"
                        aria-selected={activeTab === tab}
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
        </div>

        {/* Content Area - Scrollable due to parent overflow-y-auto */}
        <div className="p-4 space-y-6 pb-32">
            
            {activeTab === 'overview' && (
                <>
                    {/* Weekly Report Section */}
                     <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                <i className="fa-solid fa-wand-magic-sparkles"></i> {t(lang, 'aiInsights')}
                            </h3>
                            <button 
                                onClick={handleGenerateReport} 
                                disabled={generatingReport}
                                className="bg-yellow-600 text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm"
                            >
                                {generatingReport ? t(lang, 'analyzing') : "Generate Report"}
                            </button>
                        </div>
                        
                        {weeklyReport ? (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="bg-white p-3 rounded-xl border border-yellow-100 shadow-sm">
                                    <p className="text-gray-700 text-sm leading-relaxed">{weeklyReport.summary}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-green-100 p-3 rounded-xl">
                                        <h4 className="text-green-800 font-bold text-xs uppercase mb-1">{t(lang, 'wins')}</h4>
                                        <ul className="text-xs space-y-1 text-green-900">
                                            {weeklyReport.wins.map((w,i) => <li key={i}>• {w}</li>)}
                                        </ul>
                                    </div>
                                    <div className="bg-orange-100 p-3 rounded-xl">
                                        <h4 className="text-orange-800 font-bold text-xs uppercase mb-1">{t(lang, 'suggestions')}</h4>
                                        <ul className="text-xs space-y-1 text-orange-900">
                                            {weeklyReport.suggestions.map((s,i) => <li key={i}>• {s}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-yellow-700/50 text-sm py-2">
                                <p>Tap generate to see AI insights for the week.</p>
                            </div>
                        )}
                     </div>

                    <div className="grid grid-cols-2 gap-4">
                        {goals.map(goal => (
                            <div key={goal.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                                    <i className={`fa-solid ${goal.icon}`}></i>
                                </div>
                                <h3 className="font-bold text-gray-700 text-sm">{goal.text}</h3>
                                <div className="mt-2 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{goal.current} / {goal.target}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">{t(lang, 'childProfile')}</h3>
                            <button onClick={() => setIsEditingProfile(!isEditingProfile)} className="text-primary text-sm font-bold">
                                {isEditingProfile ? t(lang, 'cancel') : t(lang, 'edit')}
                            </button>
                        </div>
                        
                        {isEditingProfile ? (
                            <div className="space-y-3 animate-fadeIn">
                                {/* Explicit styling with !important or inline style to force readability against dark mode UA styles */}
                                <input 
                                    value={editName} 
                                    onChange={e => setEditName(e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded placeholder-gray-400" 
                                    style={{ backgroundColor: '#ffffff', color: '#111827' }} 
                                    placeholder={t(lang, 'name')} 
                                />
                                <input 
                                    value={editAge} 
                                    onChange={e => setEditAge(Number(e.target.value))} 
                                    className="w-full p-2 border border-gray-300 rounded placeholder-gray-400" 
                                    style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                    placeholder={t(lang, 'age')} 
                                    type="number" 
                                />
                                <input 
                                    value={editInterests} 
                                    onChange={e => setEditInterests(e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded placeholder-gray-400" 
                                    style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                    placeholder={t(lang, 'interests')} 
                                />
                                <select 
                                    value={editLanguage} 
                                    onChange={e => setEditLanguage(e.target.value)} 
                                    className="w-full p-2 border border-gray-300 rounded"
                                    style={{ backgroundColor: '#ffffff', color: '#111827' }}
                                >
                                    <option value="English">English</option>
                                    <option value="Spanish">Spanish</option>
                                    <option value="Hindi">Hindi</option>
                                </select>
                                
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" checked={editDefaultCamera} onChange={e => setEditDefaultCamera(e.target.checked)} className="accent-primary" />
                                    <span className="text-sm text-gray-700">{t(lang, 'defaultCamera')}</span>
                                </div>

                                <button onClick={saveProfile} className="w-full bg-primary text-white py-2 rounded font-bold">{t(lang, 'save')}</button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
                                    {profile.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{profile.name}, {profile.age}</h2>
                                    <p className="text-gray-500 text-sm">{profile.interests.join(' • ')}</p>
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
                        className="w-full p-4 border-2 border-dashed border-primary/50 rounded-xl text-primary font-bold flex items-center justify-center gap-2 hover:bg-primary/5"
                    >
                        <i className="fa-solid fa-plus"></i> {t(lang, 'createCustom')}
                    </button>

                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative group">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">{schedule.steps[0]?.emoji}</span>
                                <div className="flex-1">
                                    <h3 className="font-bold text-gray-800">{schedule.title}</h3>
                                    <p className="text-xs text-gray-400">{schedule.steps.length} {t(lang, 'steps')}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => onOpenOptimizer(schedule.id)}
                                        className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200"
                                        title="Auto-Improve with AI"
                                    >
                                        <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                                    </button>
                                    <button onClick={() => onEditSchedule(schedule.id)} className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center" aria-label="Edit Schedule"><i className="fa-solid fa-pen text-xs"></i></button>
                                    <button onClick={() => onDeleteSchedule(schedule.id)} className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center" aria-label="Delete Schedule"><i className="fa-solid fa-trash text-xs"></i></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'behavior' && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-2xl shadow-sm">
                        <h3 className="font-bold mb-4">{t(lang, 'quickLog')}</h3>
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            {['Meltdown', 'Aggression', 'Elopement', 'Stimming', 'Refusal'].map(b => (
                                <button 
                                    key={b}
                                    onClick={() => setNewLogBehavior(b)}
                                    className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${newLogBehavior === b ? 'bg-primary text-white border-primary' : 'border-gray-200'}`}
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                        <input 
                            placeholder={t(lang, 'triggerOptional')}
                            value={newLogTrigger}
                            onChange={e => setNewLogTrigger(e.target.value)}
                            className="w-full p-3 bg-gray-50 rounded-xl mb-3 text-sm border border-gray-200"
                        />
                        <div className="flex gap-2">
                            {(['Mild', 'Moderate', 'Severe'] as const).map(i => (
                                <button 
                                    key={i} 
                                    onClick={() => setNewLogIntensity(i)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${newLogIntensity === i ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}
                                >
                                    {i}
                                </button>
                            ))}
                        </div>
                        <button onClick={submitBehavior} className="w-full mt-4 bg-primary text-white py-3 rounded-xl font-bold shadow-md">{t(lang, 'logIncident')}</button>
                    </div>

                    <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100 text-center">
                        <i className="fa-solid fa-brain text-4xl text-purple-300 mb-4"></i>
                        <h3 className="font-bold text-purple-900 mb-2">{t(lang, 'aiInsights')}</h3>
                        
                        {!analysis ? (
                            <div className="space-y-3">
                                <p className="text-sm text-purple-700 mb-4">{t(lang, 'needLogs')}</p>
                                <button 
                                    onClick={runAnalysis}
                                    disabled={isAnalyzing}
                                    className="w-full bg-white text-purple-600 py-3 rounded-xl font-bold shadow-sm"
                                >
                                    {isAnalyzing ? t(lang, 'analyzing') : t(lang, 'analyze')}
                                </button>
                                <div className="relative">
                                    <button 
                                        onClick={() => videoInputRef.current?.click()}
                                        className="w-full bg-purple-200 text-purple-800 py-3 rounded-xl font-bold"
                                    >
                                        <i className="fa-solid fa-video mr-2"></i> {t(lang, 'video')} Analysis
                                    </button>
                                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-left bg-white p-4 rounded-xl shadow-sm animate-fadeIn">
                                <h4 className="font-bold text-sm text-purple-800 uppercase mb-2">{t(lang, 'insight')}</h4>
                                <p className="text-sm text-gray-700 mb-4">{analysis.insight}</p>
                                
                                <h4 className="font-bold text-sm text-purple-800 uppercase mb-2">{t(lang, 'likelyTriggers')}</h4>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {analysis.triggers.map(t => <span key={t} className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">{t}</span>)}
                                </div>

                                <h4 className="font-bold text-sm text-purple-800 uppercase mb-2">{t(lang, 'suggestions')}</h4>
                                <ul className="text-sm space-y-1 text-gray-600">
                                    {analysis.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                                </ul>
                                <button onClick={() => setAnalysis(null)} className="mt-4 text-xs text-gray-400 underline">Clear</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="space-y-4">
                    {/* Parent Inbox (Send Message) */}
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4">{t(lang, 'scheduleMessage')}</h3>
                        
                        {/* Explicit style for textarea */}
                        <textarea 
                            value={msgContent}
                            onChange={(e) => setMsgContent(e.target.value)}
                            placeholder={t(lang, 'typeMessage')}
                            className="w-full p-3 bg-white text-gray-900 border border-gray-300 rounded-xl mb-3 text-sm min-h-[80px] placeholder-gray-400"
                        />
                        
                        {msgMedia && (
                            <div className="bg-blue-50 p-2 rounded-lg mb-3 flex items-center justify-between text-sm text-blue-700">
                                <span><i className={`fa-solid ${msgMedia.type === 'video' ? 'fa-video' : 'fa-microphone'}`}></i> Media attached</span>
                                <button onClick={() => setMsgMedia(null)}><i className="fa-solid fa-times"></i></button>
                            </div>
                        )}

                        <div className="flex items-center gap-2 mb-4">
                            <i className="fa-regular fa-clock text-gray-400"></i>
                            <input 
                                type="time" 
                                value={msgTime}
                                onChange={(e) => setMsgTime(e.target.value)}
                                className="bg-transparent text-sm font-bold text-gray-600 outline-none"
                            />
                            <span className="text-xs text-gray-400">({t(lang, 'scheduleFor')})</span>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={() => msgFileInputRef.current?.click()}
                                className="p-3 bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200"
                            >
                                <i className="fa-solid fa-paperclip"></i>
                            </button>
                            <input ref={msgFileInputRef} type="file" accept="video/*,audio/*" className="hidden" onChange={handleMsgMediaUpload} />
                            
                            <button 
                                onClick={() => handleSendMessage()}
                                className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold shadow-md"
                            >
                                {t(lang, 'send')}
                            </button>
                        </div>
                    </div>

                    {/* Quick Replies */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {['I love you ❤️', 'Proud of you 🌟', 'See you soon 🏠'].map(txt => (
                            <button 
                                key={txt}
                                onClick={() => handleSendMessage(txt)}
                                className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-bold text-gray-600 whitespace-nowrap hover:bg-gray-50"
                            >
                                {txt}
                            </button>
                        ))}
                    </div>

                    {/* Received Voice Messages */}
                    <div>
                        <h3 className="font-bold text-gray-500 uppercase text-xs mb-3 mt-4 tracking-wide">{t(lang, 'messages')}</h3>
                        {voiceMessages.length === 0 ? (
                            <p className="text-center text-gray-400 text-sm py-4">{t(lang, 'noMessages')}</p>
                        ) : (
                            <div className="space-y-3">
                                {voiceMessages.map(msg => (
                                    <div key={msg.id} className={`bg-white p-4 rounded-xl shadow-sm border-l-4 ${msg.read ? 'border-gray-200' : 'border-blue-500'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                            {!msg.read && <span className="bg-blue-100 text-blue-600 text-[10px] px-2 py-0.5 rounded-full font-bold">NEW</span>}
                                        </div>
                                        
                                        {msg.transcription && (
                                            <p className="font-bold text-gray-800 mb-2">"{msg.transcription}"</p>
                                        )}

                                        {/* AI Analysis of Message */}
                                        {msg.analysis && (
                                            <div className="bg-blue-50 p-3 rounded-lg text-sm mb-3">
                                                <div className="flex gap-2 mb-1">
                                                    <span className="font-bold text-blue-700">{t(lang, 'interpretation')}:</span>
                                                    <span>{msg.analysis.interpretedMeaning}</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="font-bold text-blue-700">{t(lang, 'tone')}:</span>
                                                    <span>{msg.analysis.emotionalTone}</span>
                                                </div>
                                                {/* Suggested Replies */}
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {msg.analysis.suggestedResponses.map((reply, i) => (
                                                        <button 
                                                            key={i}
                                                            onClick={() => handleSendMessage(reply)}
                                                            className="text-xs bg-white border border-blue-200 px-2 py-1 rounded-full text-blue-600 hover:bg-blue-50"
                                                        >
                                                            Reply: "{reply}"
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <audio controls src={URL.createObjectURL(msg.audioBlob)} className="w-full h-8" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="space-y-6">
                    {/* Goal Progress */}
                    <div className="grid grid-cols-2 gap-4">
                        {goals.map(goal => (
                            <div key={goal.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="text-3xl text-yellow-400 mb-2"><i className={`fa-solid ${goal.icon}`}></i></div>
                                <div className="text-2xl font-bold text-gray-800">{goal.current}</div>
                                <div className="text-xs text-gray-400 uppercase font-bold">{goal.text}</div>
                            </div>
                        ))}
                    </div>

                    {/* Mood Chart Placeholder */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">{t(lang, 'feelings')}</h3>
                        <div className="h-32 flex items-end justify-between px-2 gap-2">
                            {moodLogs.slice(-7).map((log, i) => (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                                    <div 
                                        className={`w-full rounded-t-lg transition-all ${
                                            log.mood === 'Happy' ? 'bg-green-400 h-24' : 
                                            log.mood === 'Sad' ? 'bg-blue-400 h-12' : 
                                            log.mood === 'Angry' ? 'bg-red-400 h-16' : 'bg-gray-300 h-10'
                                        }`}
                                    ></div>
                                    <span className="text-[10px] font-bold text-gray-400">{new Date(log.timestamp).getDate()}</span>
                                </div>
                            ))}
                            {moodLogs.length === 0 && <p className="w-full text-center text-gray-300 text-sm">No mood data yet</p>}
                        </div>
                    </div>

                    {/* Behavior Stats */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm">
                        <h3 className="font-bold text-gray-700 mb-4">{t(lang, 'behavior')}</h3>
                        <div className="space-y-3">
                            {getBehaviorStats().map((stat, i) => (
                                <div key={i}>
                                    <div className="flex justify-between text-sm font-bold text-gray-600 mb-1">
                                        <span>{stat.name}</span>
                                        <span>{stat.count}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${stat.percent}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {behaviorLogs.length === 0 && <p className="text-center text-gray-300 text-sm">No behavior data yet</p>}
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
