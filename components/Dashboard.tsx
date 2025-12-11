
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
  onOpenScanner?: () => void; // New Prop
  onOpenOptimizer: (scheduleId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, completionLogs, voiceMessages, isHighContrast, caregiverPin, audioEnabled, onExit, onSelectSchedule, onDeleteSchedule, onUpdateSchedule, onEditSchedule, onCreateCustom, onLogBehavior, onUpdateProfile, onToggleHighContrast, onToggleAudio, onUpdatePin, onMarkMessagesRead,
  parentMessages = [], onScheduleMessage, onOpenTherapy, onOpenScanner, onOpenOptimizer
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'routines' | 'behavior' | 'analytics' | 'messages'>('overview');
  const lang = profile.language;
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const msgFileInputRef = useRef<HTMLInputElement>(null);
  
  // Behavior Form State
  const [newLogBehavior, setNewLogBehavior] = useState('Meltdown');
  const [newLogIntensity, setNewLogIntensity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [newLogTrigger, setNewLogTrigger] = useState('');

  // Analysis State
  const [analysis, setAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
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
  const [editVoiceId, setEditVoiceId] = useState(profile.audioPreferences?.voiceId || 'Kore'); 
  const [editThinkingMode, setEditThinkingMode] = useState(profile.useThinkingMode || false);
  const [editDefaultCamera, setEditDefaultCamera] = useState(profile.defaultCameraOn || false);

  // Parent Message Scheduling State
  const [msgContent, setMsgContent] = useState('');
  const [msgTime, setMsgTime] = useState('');
  const [msgMedia, setMsgMedia] = useState<{ base64: string, type: 'video' | 'audio', mimeType: string } | null>(null);
  
  // Goals (Computed)
  const [goals, setGoals] = useState([
      { id: 1, text: "Complete Routines", target: 5, current: 0, icon: "fa-sun", badge: "Morning Star" },
      { id: 2, text: "Log Mood", target: 7, current: 0, icon: "fa-face-smile", badge: "Emotion Explorer" }
  ]);

  useEffect(() => {
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
            pitch: 1,
            voiceId: editVoiceId
        }
    });
    setIsEditingProfile(false);
  };

  const handlePrintSchedule = (schedule: Schedule) => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${schedule.title}</title>
                <style>
                  body { font-family: sans-serif; padding: 40px; color: #333; }
                  .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #5B8C5A; padding-bottom: 20px; }
                  h1 { color: #5B8C5A; font-size: 36px; margin: 0; }
                  .story { font-style: italic; font-size: 18px; margin-top: 10px; color: #666; }
                  .step-container { display: flex; flex-direction: column; gap: 20px; }
                  .step { 
                      border: 2px solid #ddd; 
                      padding: 20px; 
                      border-radius: 15px; 
                      display: flex; 
                      align-items: center; 
                      page-break-inside: avoid;
                  }
                  .emoji { font-size: 60px; margin-right: 30px; width: 80px; text-align: center; }
                  .image { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; margin-right: 30px; }
                  .content { flex: 1; }
                  .instruction { font-size: 28px; font-weight: bold; margin-bottom: 5px; }
                  .encouragement { font-size: 18px; color: #5B8C5A; }
                  .checkbox { 
                      width: 40px; height: 40px; 
                      border: 3px solid #333; 
                      border-radius: 8px; 
                      margin-left: 20px;
                  }
                  .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; }
                </style>
              </head>
              <body>
                <div class="header">
                    <h1>${schedule.title}</h1>
                    <div class="story">${schedule.socialStory}</div>
                </div>
                <div class="step-container">
                    ${schedule.steps.map((s, i) => `
                      <div class="step">
                        ${s.imageUrl 
                            ? `<img src="${s.imageUrl}" class="image" />` 
                            : `<div class="emoji">${s.emoji}</div>`
                        }
                        <div class="content">
                          <div class="instruction">${i + 1}. ${s.instruction}</div>
                          <div class="encouragement">"${s.encouragement}"</div>
                        </div>
                        <div class="checkbox"></div>
                      </div>
                    `).join('')}
                </div>
                <div class="footer">
                    Generated by ScheduleSnap - AI for Autism Support
                </div>
                <script>
                    window.onload = () => window.print();
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
      }
  };

  const unreadCount = voiceMessages.filter(m => !m.read).length;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-6 overflow-y-auto">
        <div className="bg-white p-6 rounded-3xl shadow-lg w-full max-w-sm text-center relative flex flex-col items-center">
            <button onClick={onExit} className="absolute top-4 right-4 text-gray-400 p-2"><i className="fa-solid fa-times text-xl"></i></button>
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
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                        key={num}
                        onClick={() => handleNumpadPress(num)}
                        className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-700 transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                    >
                        {num}
                    </button>
                ))}
                <div className="w-16"></div>
                <button
                    onClick={() => handleNumpadPress(0)}
                    className="w-16 h-16 rounded-full bg-gray-50 hover:bg-gray-100 text-xl font-bold text-gray-700 transition-colors focus:ring-2 focus:ring-primary focus:outline-none"
                >
                    0
                </button>
                <button
                    onClick={handleBackspace}
                    className="w-16 h-16 rounded-full bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors flex items-center justify-center focus:ring-2 focus:ring-red-300 focus:outline-none"
                >
                    <i className="fa-solid fa-delete-left text-xl"></i>
                </button>
            </div>

            <button 
                onClick={handleUnlock}
                className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg hover:bg-secondary transition-colors"
            >
                {t(lang, 'unlock')}
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
        {/* Navigation Bar */}
        <div className="bg-white shadow-sm sticky top-0 z-20 overflow-x-auto no-scrollbar">
            <div className="flex p-2 gap-2 min-w-max">
                <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <i className="fa-solid fa-house mr-2"></i> Overview
                </button>
                <button onClick={() => setActiveTab('routines')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'routines' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <i className="fa-solid fa-list-check mr-2"></i> Routines
                </button>
                <button onClick={() => setActiveTab('behavior')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'behavior' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <i className="fa-solid fa-chart-line mr-2"></i> Behavior
                </button>
                <button onClick={() => setActiveTab('messages')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'messages' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <i className="fa-solid fa-envelope mr-2"></i> Messages
                    {unreadCount > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{unreadCount}</span>}
                </button>
                <div className="flex-1"></div>
                <button onClick={onExit} className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Profile Card */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
                                <p className="text-gray-500 text-sm">{profile.age} years • {profile.interests.length} interests</p>
                            </div>
                            <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)} 
                                className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-colors"
                                aria-label="Edit Profile"
                            >
                                <i className={`fa-solid ${isEditingProfile ? 'fa-check text-green-500' : 'fa-pen'}`}></i>
                            </button>
                        </div>

                        {isEditingProfile ? (
                            <div className="space-y-4 animate-slideUp">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Name</label>
                                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border focus:border-primary outline-none" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Age</label>
                                        <input type="number" value={editAge} onChange={(e) => setEditAge(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border focus:border-primary outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Interests</label>
                                    <input value={editInterests} onChange={(e) => setEditInterests(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border focus:border-primary outline-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Language</label>
                                        <select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} className="w-full p-2 bg-gray-50 rounded-lg border outline-none">
                                            {['English', 'Spanish', 'French', 'German', 'Chinese', 'Hindi', 'Arabic'].map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">Voice Speed ({editSpeechRate}x)</label>
                                        <input 
                                            type="range" min="0.5" max="1.5" step="0.1" 
                                            value={editSpeechRate} 
                                            onChange={(e) => setEditSpeechRate(parseFloat(e.target.value))} 
                                            className="w-full mt-2"
                                        />
                                    </div>
                                </div>
                                
                                {/* New Voice Settings */}
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Voice Persona</label>
                                    <div className="grid grid-cols-3 gap-2 mt-1">
                                        {['Kore', 'Fenrir', 'Puck', 'Aoede', 'Charon'].map(voice => (
                                            <button 
                                                key={voice}
                                                onClick={() => setEditVoiceId(voice)}
                                                className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${editVoiceId === voice ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}
                                            >
                                                {voice}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-bold text-gray-700">Thinking Mode</span>
                                    <button 
                                        onClick={() => setEditThinkingMode(!editThinkingMode)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${editThinkingMode ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${editThinkingMode ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                    <span className="text-sm font-bold text-gray-700">Auto-Vision Guide</span>
                                    <button 
                                        onClick={() => setEditDefaultCamera(!editDefaultCamera)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${editDefaultCamera ? 'bg-primary' : 'bg-gray-300'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${editDefaultCamera ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                                
                                <button onClick={saveProfile} className="w-full py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-secondary transition-colors">
                                    Save Profile
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center">
                                    <div className="text-xs text-orange-400 font-bold uppercase mb-1">Weekly</div>
                                    <div className="text-2xl font-bold text-orange-600">{completionLogs.length}</div>
                                </div>
                                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
                                    <div className="text-xs text-blue-400 font-bold uppercase mb-1">Streak</div>
                                    <div className="text-2xl font-bold text-blue-600">3</div>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
                                    <div className="text-xs text-purple-400 font-bold uppercase mb-1">Moods</div>
                                    <div className="text-2xl font-bold text-purple-600">{moodLogs.length}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100 text-center">
                                    <div className="text-xs text-green-400 font-bold uppercase mb-1">Tokens</div>
                                    <div className="text-2xl font-bold text-green-600">12</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={onToggleHighContrast}
                            className={`p-4 rounded-2xl flex items-center gap-3 font-bold transition-all ${isHighContrast ? 'bg-black text-white' : 'bg-white text-gray-700 shadow-sm'}`}
                        >
                            <i className="fa-solid fa-circle-half-stroke text-xl"></i>
                            Contrast
                        </button>
                        <button 
                            onClick={onToggleAudio}
                            className={`p-4 rounded-2xl flex items-center gap-3 font-bold transition-all ${audioEnabled ? 'bg-white text-green-600 shadow-sm border-2 border-green-100' : 'bg-gray-100 text-gray-400'}`}
                        >
                            <i className={`fa-solid ${audioEnabled ? 'fa-volume-high' : 'fa-volume-xmark'} text-xl`}></i>
                            {audioEnabled ? 'Audio On' : 'Audio Off'}
                        </button>
                    </div>

                    {/* AI Weekly Insights - Added to Overview Tab */}
                    <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                                <i className="fa-solid fa-lightbulb"></i> {t(lang, 'aiInsights')}
                            </h3>
                            <button 
                                onClick={handleGenerateReport}
                                disabled={generatingReport}
                                className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-yellow-200 transition-colors"
                            >
                                {generatingReport ? t(lang, 'analyzing') : t(lang, 'analyze')}
                            </button>
                        </div>

                        {weeklyReport && (
                            <div className="space-y-4 animate-slideUp bg-white p-4 rounded-2xl shadow-sm">
                                <p className="text-gray-700 italic font-medium">"{weeklyReport.summary}"</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <h4 className="text-xs font-bold text-green-600 uppercase mb-2">{t(lang, 'wins')}</h4>
                                        <ul className="space-y-1">
                                            {weeklyReport.wins.map((w, i) => (
                                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <i className="fa-solid fa-check text-green-500 mt-1"></i> {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-orange-500 uppercase mb-2">{t(lang, 'concerns')}</h4>
                                        <ul className="space-y-1">
                                            {weeklyReport.concerns.map((c, i) => (
                                                <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                                    <i className="fa-solid fa-triangle-exclamation text-orange-400 mt-1"></i> {c}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* NEW Caregiver Tools Section */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-briefcase-medical text-indigo-500"></i> Caregiver Tools
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={onOpenScanner}
                                className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-2 hover:bg-slate-100 transition-colors"
                            >
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-up-down-left-right text-slate-700 text-xl"></i>
                                </div>
                                <span className="font-bold text-slate-700 text-sm text-center">{t(lang, 'envScanner')}</span>
                            </button>
                            <button 
                                onClick={onOpenTherapy}
                                className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col items-center gap-2 hover:bg-indigo-100 transition-colors"
                            >
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
                                    <i className="fa-solid fa-notes-medical text-indigo-600 text-xl"></i>
                                </div>
                                <span className="font-bold text-indigo-800 text-sm text-center">{t(lang, 'therapyTitle')}</span>
                            </button>
                        </div>
                    </div>

                    {/* Goals */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-bullseye text-red-500"></i> Weekly Goals
                        </h3>
                        <div className="space-y-4">
                            {goals.map(goal => (
                                <div key={goal.id}>
                                    <div className="flex justify-between text-sm font-bold mb-1">
                                        <span className="text-gray-600 flex items-center gap-2">
                                            <i className={`fa-solid ${goal.icon} text-gray-400`}></i> {goal.text}
                                        </span>
                                        <span className={goal.current >= goal.target ? 'text-green-500' : 'text-gray-400'}>
                                            {goal.current}/{goal.target}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${goal.current >= goal.target ? 'bg-green-500' : 'bg-primary'}`}
                                            style={{ width: `${Math.min((goal.current/goal.target)*100, 100)}%` }}
                                        ></div>
                                    </div>
                                    {goal.current >= goal.target && (
                                        <div className="mt-2 text-xs font-bold text-orange-500 flex items-center gap-1 animate-pulse">
                                            <i className="fa-solid fa-award"></i> Badge Earned: {goal.badge}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ROUTINES TAB */}
            {activeTab === 'routines' && (
                <div className="space-y-4 animate-fadeIn">
                    <button 
                        onClick={onCreateCustom}
                        className="w-full p-4 bg-white border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:border-primary hover:text-primary hover:bg-green-50 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> Create New Routine
                    </button>

                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{schedule.steps[0]?.emoji}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-800 text-lg">{schedule.title}</h3>
                                        <p className="text-sm text-gray-400">{schedule.steps.length} steps • {schedule.type}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEditSchedule(schedule.id)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center transition-colors" aria-label="Edit Schedule">
                                        <i className="fa-solid fa-pen"></i>
                                    </button>
                                    <button onClick={() => onOpenOptimizer(schedule.id)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-purple-50 hover:text-purple-500 flex items-center justify-center transition-colors" aria-label="Optimize Schedule">
                                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    </button>
                                    <button onClick={() => handlePrintSchedule(schedule)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-yellow-50 hover:text-yellow-500 flex items-center justify-center transition-colors" aria-label="Print Schedule">
                                        <i className="fa-solid fa-print"></i>
                                    </button>
                                    <button onClick={() => onDeleteSchedule(schedule.id)} className="w-8 h-8 rounded-full bg-gray-50 text-gray-600 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors" aria-label="Delete Schedule">
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={() => onSelectSchedule(schedule.id)}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-secondary transition-colors"
                            >
                                Start Routine
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* BEHAVIOR TAB */}
            {activeTab === 'behavior' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Log New Incident */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100">
                        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-file-pen text-red-500"></i> Quick Log Incident
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <select value={newLogBehavior} onChange={(e) => setNewLogBehavior(e.target.value)} className="p-3 bg-gray-50 rounded-xl border outline-none font-bold text-gray-700">
                                {['Meltdown', 'Aggression', 'Elopement', 'Refusal', 'Anxiety', 'Stimming', 'Self-Injury'].map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={newLogIntensity} onChange={(e) => setNewLogIntensity(e.target.value as any)} className="p-3 bg-gray-50 rounded-xl border outline-none font-bold text-gray-700">
                                {['Mild', 'Moderate', 'Severe'].map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                        <input 
                            value={newLogTrigger}
                            onChange={(e) => setNewLogTrigger(e.target.value)}
                            placeholder="Trigger (optional)"
                            className="w-full p-3 bg-gray-50 rounded-xl border outline-none mb-4"
                        />
                        <button onClick={submitBehavior} className="w-full py-3 bg-red-500 text-white rounded-xl font-bold shadow-md hover:bg-red-600 transition-colors">
                            Log Incident
                        </button>
                    </div>

                    {/* AI Analysis */}
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <i className="fa-solid fa-robot"></i> Gemini Analysis
                            </h3>
                            <div className="flex gap-2">
                                <input type="file" accept="video/*" ref={videoInputRef} className="hidden" onChange={handleVideoUpload} />
                                <button onClick={() => videoInputRef.current?.click()} className="bg-white text-indigo-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-50">
                                    <i className="fa-solid fa-video mr-1"></i> Video
                                </button>
                                <button onClick={runAnalysis} className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm hover:bg-indigo-700">
                                    {isAnalyzing ? <i className="fa-solid fa-circle-notch fa-spin"></i> : 'Analyze Logs'}
                                </button>
                            </div>
                        </div>

                        {analysis ? (
                            <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm animate-slideUp">
                                <p className="text-sm font-medium text-gray-600 italic">"{analysis.insight}"</p>
                                
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase mb-2">Patterns</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.patterns.map((p, i) => <span key={i} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-xs font-bold">{p}</span>)}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-orange-400 uppercase mb-2">Triggers</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.triggers.map((t, i) => <span key={i} className="bg-orange-50 text-orange-700 px-2 py-1 rounded-md text-xs font-bold">{t}</span>)}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-xs font-bold text-green-400 uppercase mb-2">Suggestions</h4>
                                    <ul className="space-y-1">
                                        {analysis.suggestions.map((s, i) => <li key={i} className="text-sm text-gray-700 flex items-start gap-2"><i className="fa-solid fa-check text-green-500 mt-1"></i> {s}</li>)}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-indigo-300 text-sm py-4">
                                {isAnalyzing ? "Analyzing behavioral patterns..." : "Log incidents or upload video for AI insights."}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === 'messages' && (
                <div className="space-y-6 animate-fadeIn">
                    
                    {/* Send Message to Child */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-pink-100">
                        <h3 className="font-bold text-pink-600 mb-4 flex items-center gap-2">
                            <i className="fa-solid fa-paper-plane"></i> Send Message to {profile.name}
                        </h3>
                        
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                            <button onClick={() => handleSendMessage(t(lang, 'proudOfYou'))} className="shrink-0 px-4 py-2 bg-pink-50 text-pink-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-pink-100">I'm proud of you!</button>
                            <button onClick={() => handleSendMessage(t(lang, 'loveYou'))} className="shrink-0 px-4 py-2 bg-pink-50 text-pink-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-pink-100">Love you!</button>
                            <button onClick={() => handleSendMessage(t(lang, 'seeYouSoon'))} className="shrink-0 px-4 py-2 bg-pink-50 text-pink-600 rounded-full text-xs font-bold whitespace-nowrap hover:bg-pink-100">See you soon!</button>
                        </div>

                        <div className="flex gap-2 mb-4">
                            <input 
                                value={msgContent}
                                onChange={(e) => setMsgContent(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 p-3 bg-gray-50 rounded-xl border focus:border-pink-300 outline-none"
                            />
                            <input 
                                type="file" 
                                accept="video/*,audio/*" 
                                className="hidden" 
                                ref={msgFileInputRef}
                                onChange={handleMsgMediaUpload}
                            />
                            <button onClick={() => msgFileInputRef.current?.click()} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${msgMedia ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>
                                <i className={`fa-solid ${msgMedia ? 'fa-check' : 'fa-paperclip'}`}></i>
                            </button>
                        </div>

                        <div className="flex gap-2 items-center mb-4">
                            <span className="text-xs font-bold text-gray-400 uppercase">Schedule for:</span>
                            <input 
                                type="time" 
                                value={msgTime}
                                onChange={(e) => setMsgTime(e.target.value)}
                                className="bg-gray-50 p-2 rounded-lg text-sm font-bold text-gray-700 outline-none border"
                            />
                        </div>

                        <button onClick={() => handleSendMessage()} className="w-full py-3 bg-pink-500 text-white rounded-xl font-bold shadow-md hover:bg-pink-600 transition-colors">
                            {msgTime ? "Schedule Message" : "Send Now"}
                        </button>
                    </div>

                    {/* Messages from Child */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <i className="fa-solid fa-inbox text-blue-500"></i> Inbox from {profile.name}
                            </h3>
                            {voiceMessages.some(m => !m.read) && (
                                <button onClick={onMarkMessagesRead} className="text-xs font-bold text-blue-500 hover:underline">Mark all read</button>
                            )}
                        </div>

                        <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                            {voiceMessages.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">No messages yet.</p>
                            ) : (
                                voiceMessages.slice().reverse().map(msg => (
                                    <div key={msg.id} className={`p-3 rounded-xl border ${!msg.read ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-gray-400">{new Date(msg.timestamp).toLocaleString()}</span>
                                            {!msg.read && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
                                        </div>
                                        <p className="font-bold text-gray-800 text-lg">"{msg.transcription}"</p>
                                        <div className="mt-2 text-xs text-gray-500 flex gap-2">
                                            {msg.analysis?.emotionalTone && <span className="bg-gray-100 px-2 py-1 rounded">Tone: {msg.analysis.emotionalTone}</span>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
