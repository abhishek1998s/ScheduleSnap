
import React, { useState, useEffect } from 'react';
import { Schedule, ChildProfile, CompletionLog, BehaviorLog, MoodEntry, ScheduleOptimization } from '../types';
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

  if (!optimization) return <div className="p-8 text-center">Optimization failed.</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50">
       <div className="bg-white p-4 shadow-sm border-b flex items-center gap-4">
          <button onClick={onBack} aria-label="Back"><i className="fa-solid fa-arrow-left text-gray-500"></i></button>
          <h1 className="font-bold text-slate-800">{t(language, 'optTitle')}</h1>
       </div>

       <div className="p-4 flex-1 overflow-y-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100">
             <h3 className="font-bold text-indigo-800 text-sm uppercase mb-3">{t(language, 'optImpact')}</h3>
             <div className="flex gap-6 text-sm">
                 <div>
                     <span className="block text-gray-400 text-xs font-bold uppercase">{t(language, 'optCompletion')}</span>
                     <span className="text-lg font-bold text-green-600">{optimization.predictedImprovement.completionRate}</span>
                 </div>
                 <div>
                     <span className="block text-gray-400 text-xs font-bold uppercase">{t(language, 'optTime')}</span>
                     <span className="text-lg font-bold text-blue-600">{optimization.predictedImprovement.avgTime}</span>
                 </div>
                 <div>
                     <span className="block text-gray-400 text-xs font-bold uppercase">{t(language, 'optStress')}</span>
                     <span className="text-lg font-bold text-purple-600">{optimization.predictedImprovement.stressLevel}</span>
                 </div>
             </div>
          </div>

          <div className="space-y-4">
              <h3 className="font-bold text-gray-500 uppercase text-xs tracking-wide">{t(language, 'optChanges')}</h3>
              {optimization.recommendations.map((rec, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500">
                      <div className="flex justify-between items-start mb-2">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase">{rec.type}</span>
                          <span className="text-xs font-bold text-green-600">{rec.confidence}% {t(language, 'confidence')}</span>
                      </div>
                      <p className="font-bold text-gray-800 mb-1">{rec.description}</p>
                      <p className="text-sm text-gray-600 italic mb-2">"{rec.reason}"</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 p-2 rounded-lg">
                          <i className="fa-solid fa-chart-line"></i> {rec.evidence}
                      </div>
                  </div>
              ))}
          </div>
       </div>

       <div className="p-4 bg-white border-t flex gap-4">
           <button onClick={onBack} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
               {t(language, 'optDiscard')}
           </button>
           <button 
               onClick={() => onApply(optimization.optimizedSchedule)}
               className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg"
           >
               {t(language, 'optApply')}
           </button>
       </div>
    </div>
  );
};
