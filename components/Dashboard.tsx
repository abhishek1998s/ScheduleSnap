
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

  const getMoodPoints = () => {
    const logs = moodLogs.slice(-7);
    if (logs.length < 2) return "0,50 100,50";
    const moods = logs.map((l, i) => {
        let val = 3;
        if(l.mood === 'Happy') val = 5;
        else if(l.mood === 'Okay') val = 3;
        else if(l.mood === 'Tired') val = 2;
        else val = 1;
        const x = (i / (logs.length - 1)) * 100;
        const y = 100 - (val * 20);
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

  return (
    <div className={`flex flex-col h-full ${isHighContrast ? 'bg-black text-yellow-300' : 'bg-background'}`}>
        <div className={`${isHighContrast ? 'bg-gray-900 border-gray-700' : 'bg-white'} p-4 shadow-sm flex items-center gap-4`}>
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

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {activeTab === 'overview' && (
                <>
                    {/* Weekly Report Section */}
                     <div className="bg-yellow-50 p-4 rounded-2xl border