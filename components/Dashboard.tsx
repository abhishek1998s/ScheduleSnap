
import React, { useState } from 'react';
import { Schedule, ChildProfile, BehaviorLog, MoodEntry, BehaviorAnalysis } from '../types';
import { analyzeBehaviorLogs } from '../services/geminiService';

interface DashboardProps {
  schedules: Schedule[];
  profile: ChildProfile;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  onExit: () => void;
  onSelectSchedule: (id: string) => void;
  onDeleteSchedule: (id: string) => void;
  onLogBehavior: (log: Omit<BehaviorLog, 'id' | 'timestamp'>) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  schedules, profile, moodLogs, behaviorLogs, onExit, onSelectSchedule, onDeleteSchedule, onLogBehavior
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'routines' | 'behavior'>('overview');
  
  // Behavior Form State
  const [newLogBehavior, setNewLogBehavior] = useState('Meltdown');
  const [newLogIntensity, setNewLogIntensity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [newLogTrigger, setNewLogTrigger] = useState('');

  // Analysis State
  const [analysis, setAnalysis] = useState<BehaviorAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    <div className="flex flex-col h-full bg-background">
        <div className="bg-white p-4 shadow-sm flex items-center gap-4">
            <button onClick={onExit} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full">
                <i className="fa-solid fa-arrow-left"></i>
            </button>
            <h1 className="text-xl font-bold text-gray-800">Caregiver Dashboard</h1>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-white border-b gap-2 overflow-x-auto">
            {['overview', 'routines', 'behavior'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-2 rounded-full text-sm font-bold capitalize whitespace-nowrap ${activeTab === tab ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}
                >
                    {tab}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {activeTab === 'overview' && (
                <>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 mb-2">{profile.name}'s Profile</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.interests.map(interest => (
                                <span key={interest} className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full font-bold">{interest}</span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <div className="text-3xl font-bold text-blue-600 mb-1">{schedules.length}</div>
                            <div className="text-xs text-blue-400 font-bold uppercase">Routines</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <div className="text-3xl font-bold text-orange-600 mb-1">{moodLogs.length}</div>
                            <div className="text-xs text-orange-400 font-bold uppercase">Mood Logs</div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'routines' && (
                <div className="space-y-3">
                    {schedules.map(schedule => (
                        <div key={schedule.id} className="bg-white p-4 rounded-2xl shadow-sm flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <span className="text-2xl">{schedule.steps[0]?.emoji}</span>
                                <div>
                                    <h4 className="font-bold text-gray-800">{schedule.title}</h4>
                                    <p className="text-xs text-gray-500">{schedule.steps.length} steps</p>
                                </div>
                            </div>
                            <button onClick={() => onDeleteSchedule(schedule.id)} className="text-red-400 p-2"><i className="fa-solid fa-trash"></i></button>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'behavior' && (
                <div className="space-y-6">
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4">Quick Log</h3>
                        <div className="space-y-4">
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
                     <div className="bg-purple-50 p-6 rounded-2xl shadow-sm border border-purple-100">
                        <div className="flex justify-between items-center mb-4">
                             <h3 className="font-bold text-purple-800"><i className="fa-solid fa-wand-magic-sparkles mr-2"></i>AI Insights</h3>
                             <button 
                                onClick={runAnalysis}
                                disabled={isAnalyzing || behaviorLogs.length < 2}
                                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg disabled:opacity-50"
                             >
                                {isAnalyzing ? 'Analyzing...' : 'Analyze Patterns'}
                             </button>
                        </div>
                        
                        {analysis ? (
                             <div className="space-y-3 text-sm">
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
                            <p className="text-purple-400 text-sm italic text-center">
                                Log 2+ incidents and tap Analyze to identify patterns.
                            </p>
                        )}
                     </div>

                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-700 mb-4">Recent Logs</h3>
                        <div className="space-y-3">
                            {behaviorLogs.length === 0 ? <p className="text-gray-400 text-sm">No incidents logged.</p> : 
                                behaviorLogs.slice().reverse().slice(0,5).map(log => (
                                    <div key={log.id} className="text-sm p-3 bg-red-50 rounded-lg flex justify-between">
                                        <span className="font-bold text-red-700">{log.behavior}</span>
                                        <span className="text-red-400">{new Date(log.timestamp).toLocaleDateString()}</span>
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
