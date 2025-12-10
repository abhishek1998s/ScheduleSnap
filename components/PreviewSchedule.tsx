
import React, { useState } from 'react';
import { Schedule, ChildProfile } from '../types';
import { generateMicroSteps } from '../services/geminiService';
import { t } from '../utils/translations';

interface PreviewScheduleProps {
  schedule: Omit<Schedule, 'id' | 'createdAt'>;
  profile: ChildProfile;
  onSave: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

export const PreviewSchedule: React.FC<PreviewScheduleProps> = ({ schedule, profile, onSave, onCancel }) => {
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const lang = profile.language;

  const handleMagicWand = async (stepIndex: number) => {
    const step = localSchedule.steps[stepIndex];
    if(step.subSteps && step.subSteps.length > 0) return;

    setLoadingStepId(step.id);
    try {
        const microSteps = await generateMicroSteps(step.instruction, profile);
        
        const updatedSteps = [...localSchedule.steps];
        updatedSteps[stepIndex] = {
            ...step,
            subSteps: microSteps.map((s, i) => ({
                id: `${step.id}-sub-${i}`,
                text: s,
                completed: false
            }))
        };
        
        setLocalSchedule({ ...localSchedule, steps: updatedSteps });
    } catch(e) {
        alert("Couldn't generate steps. Try again.");
    } finally {
        setLoadingStepId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="bg-white p-4 shadow-sm border-b flex justify-between items-center">
        <button onClick={onCancel} className="text-gray-500">{t(lang, 'cancel')}</button>
        <h2 className="font-bold text-lg text-gray-700">{t(lang, 'previewRoutine')}</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center mb-6">
            <div className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-bold mb-2">
                {localSchedule.type}
            </div>
            
            {/* Title & Time Edit */}
            <div className="flex flex-col items-center gap-2 mb-4">
                <input 
                    value={localSchedule.title}
                    onChange={(e) => setLocalSchedule({...localSchedule, title: e.target.value})}
                    className="text-2xl font-bold text-gray-800 text-center bg-transparent border-b-2 border-transparent focus:border-primary outline-none"
                />
                
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-lg">
                    <i className="fa-regular fa-clock text-gray-500"></i>
                    <input 
                        type="time"
                        value={localSchedule.scheduledTime || ''}
                        onChange={(e) => setLocalSchedule({...localSchedule, scheduledTime: e.target.value})}
                        className="bg-transparent text-gray-600 font-bold outline-none"
                    />
                </div>
            </div>

            {/* Missing Items Alert */}
            {localSchedule.missingItems && localSchedule.missingItems.length > 0 && (
                <div className="mb-4 bg-orange-50 border border-orange-200 p-3 rounded-xl text-left">
                    <h3 className="text-orange-800 font-bold text-xs uppercase flex items-center gap-2 mb-1">
                        <i className="fa-solid fa-triangle-exclamation"></i> {t(lang, 'missingItems')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {localSchedule.missingItems.map((item, i) => (
                            <span key={i} className="px-2 py-1 bg-white text-orange-800 text-xs font-bold rounded-lg border border-orange-100 shadow-sm">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Social Story */}
            {localSchedule.socialStory && (
                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-left">
                    <h3 className="text-yellow-800 font-bold text-sm uppercase mb-1 flex items-center gap-2">
                        <i className="fa-solid fa-book-open"></i> {t(lang, 'socialStory')}
                    </h3>
                    <p className="text-yellow-900 font-medium leading-relaxed">
                        {localSchedule.socialStory}
                    </p>
                </div>
            )}
        </div>

        <div className="space-y-4">
            {localSchedule.steps.map((step, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl shadow-sm relative overflow-hidden">
                    {/* Sensory Tip Marker */}
                    {step.sensoryTip && (
                        <div className="absolute top-0 right-0 bg-yellow-100 text-yellow-700 px-2 py-1 text-[10px] font-bold rounded-bl-lg">
                            <i className="fa-solid fa-hand-sparkles mr-1"></i> {step.sensoryTip}
                        </div>
                    )}
                    
                    <div className="flex items-start gap-4">
                        <div className="text-3xl bg-gray-50 w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                            {step.emoji}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-gray-800">{step.instruction}</h4>
                                    <p className="text-sm text-primary italic font-bold">"{step.encouragement}"</p>
                                </div>
                                <button 
                                    onClick={() => handleMagicWand(index)}
                                    disabled={loadingStepId === step.id || (step.subSteps && step.subSteps.length > 0)}
                                    className={`p-2 rounded-full transition-all ${step.subSteps?.length ? 'bg-purple-100 text-purple-400' : 'bg-purple-100 text-purple-600 hover:scale-110 active:scale-95'}`}
                                    title="Breakdown step with AI"
                                >
                                    {loadingStepId === step.id ? (
                                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                                    ) : (
                                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                                    )}
                                </button>
                            </div>
                            
                            {step.subSteps && step.subSteps.length > 0 && (
                                <div className="mt-3 pl-2 border-l-2 border-purple-200 space-y-1">
                                    {step.subSteps.map(sub => (
                                        <div key={sub.id} className="text-xs text-gray-500 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-300"></div>
                                            {sub.text}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Celebration Message */}
        <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100">
            <h3 className="text-green-800 font-bold text-sm uppercase mb-1 flex items-center gap-2">
                <i className="fa-solid fa-trophy"></i> {t(lang, 'celebrationMessage')}
            </h3>
            <input 
                value={localSchedule.completionCelebration || ''}
                onChange={(e) => setLocalSchedule({...localSchedule, completionCelebration: e.target.value})}
                className="w-full bg-transparent text-green-900 font-medium leading-relaxed border-b border-green-200 focus:border-green-500 outline-none"
                placeholder="Message to say when done..."
            />
        </div>

      </div>

      <div className="p-4 bg-white border-t flex gap-4">
        <button 
            onClick={() => onSave(localSchedule)}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2"
        >
            <i className="fa-solid fa-check"></i> {t(lang, 'saveStart')}
        </button>
      </div>
    </div>
  );
};
