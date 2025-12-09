
import React, { useState, useRef } from 'react';
import { Schedule, ChildProfile, BehaviorLog, MoodEntry, BehaviorAnalysis, VoiceMessage } from '../types';
import { analyzeBehaviorLogs, analyzeBehaviorVideo } from '../services/geminiService';

interface DashboardProps {
  schedules: Schedule[];
  profile: ChildProfile;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  voiceMessages: VoiceMessage[];
  isHighContrast: boolean;
  onExit: () => void;
  onSelectSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onLogBehavior: (log: Omit<BehaviorLog, 'id' | 'timestamp'>) => void;
  onUpdateProfile: (profile: ChildProfile) => void;
  onToggleHighContrast: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, voiceMessages, isHighContrast, onExit, onSelectSchedule, onDeleteSchedule, onLogBehavior, onUpdateProfile, onToggleHighContrast
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'routines' | 'behavior' | 'messages'>('overview');
  
  // Behavior Form State
  const [newLogBehavior, setNewLogBehavior] = useState('Meltdown');
  const [newLogIntensity, setNewLogIntensity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [newLogTrigger, setNewLogTrigger] = useState('');

  // Analysis State
  const [analysis, setAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age);
  const [editInterests, setEditInterests] = useState(profile.interests.join(', '));
  const [editLanguage, setEditLanguage] = useState(profile.language || 'English');
  const [editSpeechRate, setEditSpeechRate] = useState(profile.audioPreferences?.speechRate || 1);
  const [editThinkingMode, setEditThinkingMode] = useState(profile.useThinkingMode || false);
  const [shareCode, setShareCode] = useState<string | null>(null);

  const handlePinSubmit = () => {
    if (pin === '1234') setIsAuthenticated(true);
    else {
        setPin('');
        alert("Incorrect PIN (Default: 1234)");
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
        alert("Need at least 2 logs to analyze patterns.");
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

  const generateShareCode = () => {
     const code = Math.random().toString(36).substring(2, 8).toUpperCase();
     setShareCode(code);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full bg-background items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-lg w-full max-w-sm text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-lock text-primary text-2xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Parent Access</h2>
            <p className="text-gray-500 mb-6">Enter PIN to access settings</p>
            <input 
                type="password" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                maxLength={4}
                className="w-full text-center text-4xl tracking-widest border-b-2 border-gray-200 focus:border-primary outline-none py-2 mb-8 font-mono"
                placeholder="••••"
            />
            <button onClick={handlePinSubmit} className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-md">Unlock</button>
            <button onClick={onExit} className="mt-4 text-gray-400 text-sm">Cancel</button>
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
            <h1 className="text-xl font-bold">Caregiver Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className={`flex p-2 ${isHighContrast ? 'bg-black border-gray-700' : 'bg-white border-b'} gap-2 overflow-x-auto`}>
            {['overview', 'routines', 'behavior', 'messages'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap ${
                        activeTab === tab 
                            ? (isHighContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white') 
                            : (isHighContrast ? 'bg-gray-800 text-yellow-200' : 'bg-gray-100 text-gray-500')
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {activeTab === 'overview' && (
                <>
                    <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border`}>
                        <div className="flex justify-between items-start mb-4">
                             <h2 className="text-lg font-bold">Child Profile</h2>
                             <button 
                                onClick={() => setIsEditingProfile(!isEditingProfile)}
                                className={`${isHighContrast ? 'text-yellow-300' : 'text-primary'} text-sm font-bold`}
                             >
                                {isEditingProfile ? 'Cancel' : 'Edit'}
                             </button>
                        </div>
                        
                        {isEditingProfile ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs opacity-70">Name</label>
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">Age</label>
                                    <input type="number" value={editAge} onChange={e => setEditAge(Number(e.target.value))} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">Interests</label>
                                    <input value={editInterests} onChange={e => setEditInterests(e.target.value)} className="w-full border-b p-1 bg-transparent" />
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">Language</label>
                                    <select value={editLanguage} onChange={(e) => setEditLanguage(e.target.value)} className="w-full border-b p-1 bg-transparent">
                                        <option value="English">English</option>
                                        <option value="Spanish">Spanish</option>
                                        <option value="French">French</option>
                                        <option value="German">German</option>
                                        <option value="Chinese">Chinese</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs opacity-70">Voice Speed ({editSpeechRate}x)</label>
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
                                        Enable AI Thinking Mode
                                        <span className="block text-xs opacity-60 font-normal">Slower, but smarter reasoning for complex schedules.</span>
                                    </label>
                                </div>
                                <button onClick={saveProfile} className={`w-full ${isHighContrast ? 'bg-yellow-400 text-black' : 'bg-primary text-white'} py-2 rounded-lg font-bold`}>Save Changes</button>
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

                    <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border flex flex-col gap-4`}>
                        <div className="flex items-center justify-between">
                            <span className="font-bold">High Contrast Mode</span>
                            <button 
                                onClick={onToggleHighContrast}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${isHighContrast ? 'bg-yellow-400' : 'bg-gray-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${isHighContrast ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100">
                             <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-sm">Share Profile</span>
                                {shareCode && <span className="font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs select-all">{shareCode}</span>}
                             </div>
                             <button 
                                onClick={generateShareCode}
                                className={`w-full py-2 rounded-lg font-bold text-sm ${isHighContrast ? 'bg-gray-800 text-yellow-300' : 'bg-blue-50 text-blue-600'}`}
                             >
                                {shareCode ? 'Regenerate Code' : 'Generate Share Code'}
                             </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-blue-900">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{schedules.length}</div>
                            <div className="text-xs text-blue-400 font-bold uppercase">Routines</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 text-orange-900">
                            <div className="text-3xl font-bold text-orange-600 mb-1">{moodLogs.length}</div>
                            <div className="text-xs text-orange-400 font-bold uppercase">Mood Logs</div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'routines' && (
                <div className="space-y-3">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center text-gray-800">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">{schedule.steps[0]?.emoji}</span>
                                <div>
                                    <h4 className="font-bold">{schedule.title}</h4>
                                    <p className="text-xs opacity-50">{schedule.steps.length} steps</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteSchedule(schedule.id)} className="text-red-400 p-2"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'messages' && (
                <div className="space-y-4">
                     <h3 className="font-bold">Voice Messages</h3>
                     {voiceMessages.length === 0 ? <p className="opacity-50">No messages yet.</p> : 
                        voiceMessages.map(msg => (
                            <div key={msg.id} className="bg-white text-black p-4 rounded-2xl shadow-sm">
                                <p className="text-xs text-gray-400 mb-2">{new Date(msg.timestamp).toLocaleString()}</p>
                                <audio controls src={URL.createObjectURL(msg.audioBlob)} className="w-full" />
                            </div>
                        ))
                     }
                </div>
            )}

            {activeTab === 'behavior' && (
                <div className="space-y-6">
                     <div className={`${isHighContrast ? 'bg-gray-900 border-2 border-yellow-400' : 'bg-white border-gray-100'} p-6 rounded-2xl shadow-sm border`}>
                        <h3 className="font-bold mb-4">Quick Log</h3>
                        <div className="space-y-4 text-black">
                            <select 
                                value={newLogBehavior}
                                onChange={(e) => setNewLogBehavior(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                            >
                                {['Meltdown', 'Stimming', 'Aggression', 'Elopement', 'Refusal', 'Anxiety'].map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <div className="flex gap-2">
                                {['Mild', 'Moderate', 'Severe'].map(l => (
                                    <button 
                                        key={l}
                                        onClick={() => setNewLogIntensity(l as any)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-bold border ${newLogIntensity === l ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200'}`}
                                    >
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <input 
                                type="text"
                                placeholder="Trigger (optional)"
                                value={newLogTrigger}
                                onChange={(e) => setNewLogTrigger(e.target.value)}
                                className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                            />
                            <button onClick={submitBehavior} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-md">
                                Log Incident
                            </button>
                        </div>
                     </div>

                     {/* AI Analysis Section */}
                     <div className={`${isHighContrast ? 'bg-purple-900' : 'bg-purple-50'} p-6 rounded-2xl shadow-sm border border-purple-100`}>
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold"><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>AI Insights</h3>
                             <div className="flex gap-2">
                                <button 
                                    onClick={() => videoInputRef.current?.click()}
                                    className="px-3 py-2 bg-purple-200 text-purple-800 text-xs font-bold rounded-lg"
                                >
                                    <i className="fa-solid fa-video mr-1"></i> Video
                                </button>
                                <button 
                                    onClick={runAnalysis}
                                    disabled={isAnalyzing || behaviorLogs.length < 2}
                                    className="px-3 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                                >
                                    {isAnalyzing ? 'Analyzing...' : 'Log Analysis'}
                                </button>
                             </div>
                             <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={handleVideoUpload} />
                        </div>
                        
                        {analysis ? (
                             <div className="space-y-3 text-sm text-black">
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">Insight:</p>
                                    <p className="text-gray-600">{analysis.insight}</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">Likely Triggers:</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {analysis.triggers.map(t => <span key={t} className="px-2 py-0.5 bg-red-100 text-red-600 rounded-md text-xs font-bold">{t}</span>)}
                                    </div>
                                </div>
                                <div className="bg-white p-3 rounded-xl">
                                    <p className="font-bold text-gray-700">Suggestions:</p>
                                    <ul className="list-disc list-inside text-gray-600">
                                        {analysis.suggestions.map((s,i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                             </div>
                        ) : (
                            <p className="opacity-70 text-sm italic text-center">
                                Log 2+ incidents or upload a video for AI analysis.
                            </p>
                        )}
                     </div>

                     <div className={`${isHighContrast ? 'bg-gray-900' : 'bg-white'} p-6 rounded-2xl shadow-sm border border-gray-100`}>
                        <h3 className="font-bold mb-4">Recent Logs</h3>
                        <div className="space-y-3">
                            {behaviorLogs.length === 0 ? <p className="opacity-50 text-sm">No incidents logged.</p> : 
                                behaviorLogs.slice().reverse().slice(0,5).map(log => (
                                    <div key={log.id} className="text-sm p-3 bg-red-50 text-red-900 rounded-lg flex justify-between">
                                        <span className="font-bold">{log.behavior}</span>
                                        <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))
                            }
                        </div>
                     </div>
                </div>
            )}
        </div>
    </div>
  );
};
