
import React, { useState, useEffect } from 'react';
import { Schedule, ChildProfile, CompletionLog, BehaviorLog, ScheduleOptimization } from '../types';
import { generateScheduleOptimization } from '../services/geminiService';
import { t } from '../utils/translations';

interface ScheduleOptimizerProps {
  schedule: Schedule;
  profile: ChildProfile;
  completionLogs: CompletionLog[];
  behaviorLogs: BehaviorLog[];
  onBack: () => void;
  onApply: (schedule: Schedule) => void;
  language?: string;
}

export const ScheduleOptimizer: React.FC<ScheduleOptimizerProps> = ({ 
  schedule, profile, completionLogs, behaviorLogs, onBack, onApply, language 
}) => {
  const [optimization, setOptimization] = useState<ScheduleOptimization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptimization = async () => {
      setLoading(true);
      try {
        const result = await generateScheduleOptimization(schedule, behaviorLogs, completionLogs, profile);
        setOptimization(result);
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    loadOptimization();
  }, [schedule, behaviorLogs, completionLogs, profile]);

  if (loading) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-indigo-50">
              <i className="fa-solid fa-wand-magic-sparkles text-6xl text-indigo-500 fa-bounce mb-6"></i>
              <p className="text-xl font-bold text-gray-500 animate-pulse">{t(language, 'agentOptimizing')}</p>
              <p className="text-sm text-gray-400 mt-2">{t(language, 'agentThinking')}</p>
          </div>
      );
  }

  if (!optimization) return (
    <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50">
        <i className="fa-solid fa-triangle-exclamation text-4xl text-gray-300 mb-4"></i>
        <p className="text-gray-500">Optimization currently unavailable.</p>
        <button onClick={onBack} className="mt-4 text-indigo-600 font-bold">Go Back</button>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
       {/* Header */}
       <div className="bg-white p-4 shadow-sm border-b flex items-center gap-4 shrink-0">
          <button onClick={onBack} aria-label="Back" className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center">
              <i className="fa-solid fa-arrow-left text-gray-500"></i>
          </button>
          <h1 className="font-bold text-slate-800 text-lg">{t(language, 'optTitle')}</h1>
       </div>

       {/* Content */}
       <div className="p-4 flex-1 overflow-y-auto space-y-6">
          
          {/* Impact Stats */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-100">
             <h3 className="font-bold text-indigo-800 text-xs uppercase mb-4 tracking-wider">{t(language, 'optImpact')}</h3>
             <div className="grid grid-cols-3 gap-4 text-center">
                 <div className="p-2 bg-green-50 rounded-xl">
                     <span className="block text-green-700/60 text-[10px] font-bold uppercase mb-1">{t(language, 'optCompletion')}</span>
                     <span className="text-lg font-bold text-green-600">{optimization.predictedImprovement.completionRate}</span>
                 </div>
                 <div className="p-2 bg-blue-50 rounded-xl">
                     <span className="block text-blue-700/60 text-[10px] font-bold uppercase mb-1">{t(language, 'optTime')}</span>
                     <span className="text-lg font-bold text-blue-600">{optimization.predictedImprovement.avgTime}</span>
                 </div>
                 <div className="p-2 bg-purple-50 rounded-xl">
                     <span className="block text-purple-700/60 text-[10px] font-bold uppercase mb-1">{t(language, 'optStress')}</span>
                     <span className="text-lg font-bold text-purple-600">{optimization.predictedImprovement.stressLevel}</span>
                 </div>
             </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-4">
              <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wide px-2">{t(language, 'optChanges')}</h3>
              {optimization.recommendations.map((rec, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-indigo-500 animate-slideUp" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="flex justify-between items-start mb-2">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">{rec.type.replace('_', ' ')}</span>
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                              <i className="fa-solid fa-robot"></i> {rec.confidence}%
                          </span>
                      </div>
                      <p className="font-bold text-gray-800 mb-2 text-lg">{rec.description}</p>
                      <p className="text-sm text-gray-600 italic mb-3">"{rec.reason}"</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                          <i className="fa-solid fa-chart-line"></i> {rec.evidence}
                      </div>
                  </div>
              ))}
          </div>
       </div>

       {/* Actions */}
       <div className="p-4 bg-white border-t flex gap-4 shrink-0 safe-area-bottom">
           <button 
               onClick={onBack} 
               className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors"
           >
               {t(language, 'optDiscard')}
           </button>
           <button 
               onClick={() => onApply(optimization.optimizedSchedule)}
               className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
           >
               <i className="fa-solid fa-check"></i> {t(language, 'optApply')}
           </button>
       </div>
    </div>
  );
};
