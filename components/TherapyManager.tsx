
import React, { useState, useRef } from 'react';
import { TherapySession, ChildProfile, TherapySessionAnalysis } from '../types';
import { analyzeTherapySession } from '../services/geminiService';
import { t } from '../utils/translations';

interface TherapyManagerProps {
  sessions: TherapySession[];
  profile: ChildProfile;
  onSaveSession: (session: TherapySession) => void;
  onExit: () => void;
}

export const TherapyManager: React.FC<TherapyManagerProps> = ({ sessions, profile, onSaveSession, onExit }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'upload' | 'analysis'>('list');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TherapySessionAnalysis | null>(null);
  const [viewingSession, setViewingSession] = useState<TherapySession | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lang = profile.language;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setAnalyzing(true);
      setActiveTab('upload');
      
      const reader = new FileReader();
      reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
              // Find previous summary for context
              const lastSession = sessions.length > 0 ? sessions[0] : undefined;
              
              const result = await analyzeTherapySession(
                  base64, 
                  file.type, 
                  profile, 
                  lastSession?.analysis.summary
              );
              setAnalysisResult(result);
              setActiveTab('analysis');
          } catch (e) {
              alert("Analysis failed. Please try a shorter video or check connection.");
              setActiveTab('list');
          } finally {
              setAnalyzing(false);
          }
      };
      reader.readAsDataURL(file);
  };

  const handleSave = () => {
      if (analysisResult) {
          const newSession: TherapySession = {
              id: `therapy-${Date.now()}`,
              timestamp: Date.now(),
              type: 'Video', // Assuming video upload for now
              analysis: analysisResult
          };
          onSaveSession(newSession);
          setAnalysisResult(null);
          setActiveTab('list');
      }
  };

  const renderAnalysis = (analysis: TherapySessionAnalysis, isPreview: boolean = false) => (
      <div className="space-y-6 animate-fadeIn">
          {/* Summary Card */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100">
              <h3 className="text-indigo-800 font-bold uppercase text-xs mb-2 tracking-wide">{t(lang, 'clinicalSummary')}</h3>
              <p className="text-gray-700 leading-relaxed font-medium">{analysis.summary}</p>
              <div className="mt-4 flex gap-4 text-sm text-gray-500">
                  <span><i className="fa-regular fa-clock mr-1"></i> {analysis.duration} {t(lang, 'minutes')}</span>
                  <span><i className="fa-solid fa-chart-line mr-1"></i> {analysis.progressComparedToLastSession}</span>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Breakthroughs */}
              <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
                  <h3 className="text-green-800 font-bold mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-star"></i> {t(lang, 'breakthroughs')}
                  </h3>
                  <div className="space-y-3">
                      {analysis.breakthroughMoments.map((moment, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl shadow-sm text-sm">
                              <div className="font-bold text-gray-800">{moment.description}</div>
                              <div className="text-green-600 text-xs mt-1">{moment.significance}</div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Challenges */}
              <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
                  <h3 className="text-orange-800 font-bold mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i> {t(lang, 'challenges')}
                  </h3>
                  <div className="space-y-3">
                      {analysis.challengingMoments.map((moment, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl shadow-sm text-sm">
                              <div className="font-bold text-gray-800">{moment.description}</div>
                              <div className="text-orange-600 text-xs mt-1 font-bold">Try: {moment.suggestedApproach}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* Techniques */}
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <h3 className="text-blue-800 font-bold mb-3 flex items-center gap-2">
                  <i className="fa-solid fa-clipboard-check"></i> {t(lang, 'techniques')}
              </h3>
              <div className="flex flex-wrap gap-2">
                  {analysis.techniquesObserved.map((tech, i) => (
                      <div key={i} className="bg-white px-3 py-2 rounded-lg text-sm border border-blue-100 shadow-sm flex items-center gap-2">
                          <span className="font-bold text-gray-700">{tech.technique}</span>
                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${tech.effectiveness === 'High' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {tech.effectiveness}
                          </span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Home Practice */}
          <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
              <h3 className="text-purple-800 font-bold mb-4 flex items-center gap-2 text-lg">
                  <i className="fa-solid fa-house-chimney"></i> {t(lang, 'homePractice')}
              </h3>
              <div className="space-y-4">
                  {analysis.homePractice.map((practice, i) => (
                      <div key={i} className="bg-white p-4 rounded-2xl shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                              <h4 className="font-bold text-gray-800">{practice.activity}</h4>
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg font-bold">{practice.duration}</span>
                          </div>
                          <ul className="space-y-1">
                              {practice.tips.map((tip, j) => (
                                  <li key={j} className="text-sm text-gray-600 flex items-start gap-2">
                                      <i className="fa-solid fa-check text-purple-400 mt-1"></i> {tip}
                                  </li>
                              ))}
                          </ul>
                      </div>
                  ))}
              </div>
          </div>

          {isPreview && (
              <button 
                  onClick={handleSave}
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2 text-lg"
              >
                  <i className="fa-solid fa-save"></i> Save Session Analysis
              </button>
          )}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 shadow-sm border-b flex items-center justify-between sticky top-0 z-10">
            <button onClick={onExit} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <i className="fa-solid fa-arrow-left text-gray-600"></i>
            </button>
            <h1 className="font-bold text-xl text-slate-800">{t(lang, 'therapyTitle')}</h1>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            
            {activeTab === 'list' && !viewingSession && (
                <div className="space-y-6">
                    {/* Upload CTA */}
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-8 rounded-3xl shadow-lg flex flex-col items-center gap-3 active:scale-95 transition-transform"
                    >
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                            <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
                        </div>
                        <h2 className="text-2xl font-bold">{t(lang, 'startSession')}</h2>
                        <p className="text-white/80">{t(lang, 'uploadPrompt')}</p>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*,audio/*"
                        onChange={handleFileUpload} 
                    />

                    {/* History List */}
                    <div>
                        <h3 className="text-slate-500 font-bold uppercase text-xs mb-3 tracking-wide">{t(lang, 'sessionHistory')}</h3>
                        {sessions.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
                                <p>{t(lang, 'noIncidents')}</p> 
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sessions.slice().reverse().map(session => (
                                    <button 
                                        key={session.id}
                                        onClick={() => setViewingSession(session)}
                                        className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-4 hover:border-indigo-200 transition-colors text-left"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 text-indigo-500 font-bold text-xs flex-col">
                                            <span>{new Date(session.timestamp).getDate()}</span>
                                            <span className="text-[10px] uppercase">{new Date(session.timestamp).toLocaleString('default', { month: 'short' })}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 truncate">{session.analysis.summary}</p>
                                            <div className="flex gap-2 mt-1">
                                                {session.analysis.breakthroughMoments.length > 0 && (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold">
                                                        <i className="fa-solid fa-star mr-1"></i>Breakthrough
                                                    </span>
                                                )}
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">
                                                    {session.analysis.duration}m
                                                </span>
                                            </div>
                                        </div>
                                        <i className="fa-solid fa-chevron-right text-gray-300 mt-2"></i>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'upload' && analyzing && (
                <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 border-8 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-8"></div>
                    <h2 className="text-2xl font-bold text-indigo-900 mb-2">{t(lang, 'analyzingSession')}</h2>
                    <p className="text-gray-500 max-w-xs">Our AI Clinical Supervisor is reviewing the techniques and engagement levels...</p>
                </div>
            )}

            {activeTab === 'analysis' && analysisResult && renderAnalysis(analysisResult, true)}

            {viewingSession && (
                <div className="animate-slideUp">
                    <button 
                        onClick={() => setViewingSession(null)} 
                        className="mb-4 text-indigo-600 font-bold flex items-center gap-2"
                    >
                        <i className="fa-solid fa-arrow-left"></i> Back to History
                    </button>
                    <div className="mb-4 text-center">
                        <p className="text-sm text-gray-400 font-bold uppercase">{new Date(viewingSession.timestamp).toLocaleString()}</p>
                    </div>
                    {renderAnalysis(viewingSession.analysis)}
                </div>
            )}

        </div>
    </div>
  );
};
