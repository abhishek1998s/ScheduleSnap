
import React, { useState, useRef } from 'react';
import { Schedule, ChildProfile, ScheduleStep } from '../types';
import { generateMicroSteps } from '../services/geminiService';
import { t } from '../utils/translations';

interface PreviewScheduleProps {
  schedule: Omit<Schedule, 'id' | 'createdAt'>;
  profile: ChildProfile;
  onSave: (schedule: Omit<Schedule, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export const PreviewSchedule: React.FC<PreviewScheduleProps> = ({ schedule, profile, onSave, onCancel, isEditing }) => {
  const [localSchedule, setLocalSchedule] = useState(schedule);
  const [loadingStepId, setLoadingStepId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
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

  const handleStepChange = (index: number, field: keyof ScheduleStep, value: string) => {
      const newSteps = [...localSchedule.steps];
      const step = { ...newSteps[index] };

      // Update the specific field
      // @ts-ignore
      step[field] = value;

      // Sync encouragement to options
      if (field === 'encouragement') {
          step.encouragementOptions = [value]; 
      }

      newSteps[index] = step;
      setLocalSchedule({ ...localSchedule, steps: newSteps });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && activeStepIndex !== null) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64 = reader.result as string;
              const newSteps = [...localSchedule.steps];
              newSteps[activeStepIndex] = {
                  ...newSteps[activeStepIndex],
                  imageUrl: base64
              };
              setLocalSchedule({ ...localSchedule, steps: newSteps });
              setActiveStepIndex(null);
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerImageUpload = (index: number) => {
      setActiveStepIndex(index);
      fileInputRef.current?.click();
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
      const newSteps = [...localSchedule.steps];
      if (direction === 'up' && index > 0) {
          [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
      } else if (direction === 'down' && index < newSteps.length - 1) {
          [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
      }
      setLocalSchedule({ ...localSchedule, steps: newSteps });
  };

  const deleteStep = (index: number) => {
      if (confirm('Delete this step?')) {
          const newSteps = localSchedule.steps.filter((_, i) => i !== index);
          setLocalSchedule({ ...localSchedule, steps: newSteps });
      }
  };

  const addStep = () => {
      const newStep: ScheduleStep = {
          id: `manual-${Date.now()}`,
          emoji: '✨',
          instruction: 'New Step',
          encouragement: 'You can do it!',
          encouragementOptions: ['You can do it!'], 
          completed: false
      };
      setLocalSchedule({ ...localSchedule, steps: [...localSchedule.steps, newStep] });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
      
      <div className="bg-white p-4 shadow-sm border-b flex justify-between items-center shrink-0">
        <button onClick={onCancel} className="text-gray-500">{t(lang, 'cancel')}</button>
        <h2 className="font-bold text-lg text-gray-700">
            {isEditing ? t(lang, 'editRoutine') : t(lang, 'previewRoutine')}
        </h2>
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
                    className="text-2xl font-bold text-gray-800 text-center bg-transparent border-b-2 border-transparent focus:border-primary outline-none w-full placeholder-gray-400"
                    placeholder="Routine Title"
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
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-left">
                <h3 className="text-yellow-800 font-bold text-sm uppercase mb-1 flex items-center gap-2">
                    <i className="fa-solid fa-book-open"></i> {t(lang, 'socialStory')}
                </h3>
                <textarea 
                    value={localSchedule.socialStory}
                    onChange={(e) => setLocalSchedule({...localSchedule, socialStory: e.target.value})}
                    className="w-full bg-transparent text-yellow-900 font-medium leading-relaxed outline-none resize-none min-h-[60px] placeholder-yellow-700/50"
                    placeholder="Write a short story about why we do this..."
                />
            </div>
        </div>

        <div className="space-y-4">
            {localSchedule.steps.map((step, index) => (
                <div key={index} className="bg-white p-4 rounded-2xl shadow-sm relative overflow-hidden group border border-transparent hover:border-gray-200">
                    
                    <div className="flex items-start gap-3">
                        {/* Image/Emoji Input */}
                        <div className="flex flex-col gap-2 items-center">
                            <div className="relative w-16 h-16 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border hover:border-primary cursor-pointer" onClick={() => triggerImageUpload(index)}>
                                {step.imageUrl ? (
                                    <img src={step.imageUrl} alt="Step" className="w-full h-full object-cover" />
                                ) : (
                                    <input 
                                        value={step.emoji}
                                        onChange={(e) => handleStepChange(index, 'emoji', e.target.value)}
                                        className="text-3xl bg-transparent w-full h-full text-center outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                )}
                                <div className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-tl-lg text-[10px]">
                                    <i className="fa-solid fa-camera"></i>
                                </div>
                            </div>
                            {step.imageUrl && (
                                <button onClick={() => handleStepChange(index, 'imageUrl', '')} className="text-xs text-red-400 font-bold hover:text-red-500">
                                    Remove Photo
                                </button>
                            )}
                        </div>

                        {/* Text Inputs */}
                        <div className="flex-1 space-y-1">
                            <input 
                                value={step.instruction}
                                onChange={(e) => handleStepChange(index, 'instruction', e.target.value)}
                                className="font-bold text-gray-900 w-full outline-none border-b-2 border-gray-100 focus:border-primary bg-gray-50 placeholder-gray-400 p-1 rounded"
                                placeholder="Step Instruction"
                            />
                            <input
                                value={step.encouragement}
                                onChange={(e) => handleStepChange(index, 'encouragement', e.target.value)}
                                className="text-sm text-primary italic font-bold w-full outline-none border-b-2 border-gray-100 focus:border-primary/50 bg-gray-50 placeholder-primary/30 p-1 rounded"
                                placeholder="Encouragement phrase"
                            />
                            
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

                        {/* Controls */}
                        <div className="flex flex-col gap-1 items-center">
                            <button 
                                onClick={() => moveStep(index, 'up')}
                                disabled={index === 0}
                                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center text-xs transition-colors"
                            >
                                <i className="fa-solid fa-arrow-up"></i>
                            </button>
                            <button 
                                onClick={() => moveStep(index, 'down')}
                                disabled={index === localSchedule.steps.length - 1}
                                className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 disabled:opacity-30 text-gray-500 flex items-center justify-center text-xs transition-colors"
                            >
                                <i className="fa-solid fa-arrow-down"></i>
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                        <button 
                            onClick={() => handleMagicWand(index)}
                            disabled={loadingStepId === step.id || (step.subSteps && step.subSteps.length > 0)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${step.subSteps?.length ? 'bg-purple-50 text-purple-300' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'}`}
                        >
                            {loadingStepId === step.id ? (
                                <><i className="fa-solid fa-circle-notch fa-spin"></i> Breaking down...</>
                            ) : (
                                <><i className="fa-solid fa-wand-magic-sparkles"></i> AI Breakdown</>
                            )}
                        </button>

                        <button 
                            onClick={() => deleteStep(index)}
                            className="w-8 h-8 rounded-full hover:bg-red-50 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        >
                            <i className="fa-solid fa-trash-can"></i>
                        </button>
                    </div>

                </div>
            ))}
            
            <button 
                onClick={addStep}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-bold hover:border-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-plus"></i> Add Step
            </button>
        </div>

        {/* Celebration Message */}
        <div className="mt-6 bg-green-50 p-4 rounded-xl border border-green-100">
            <h3 className="text-green-800 font-bold text-sm uppercase mb-1 flex items-center gap-2">
                <i className="fa-solid fa-trophy"></i> {t(lang, 'celebrationMessage')}
            </h3>
            <input 
                value={localSchedule.completionCelebration || ''}
                onChange={(e) => setLocalSchedule({...localSchedule, completionCelebration: e.target.value})}
                className="w-full bg-transparent text-green-900 font-medium leading-relaxed border-b border-green-200 focus:border-green-500 outline-none placeholder-green-700/50"
                placeholder="Message to say when done..."
            />
        </div>

      </div>

      <div className="p-4 bg-white border-t flex gap-4 shrink-0">
        <button 
            onClick={() => onSave(localSchedule)}
            className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
        >
            <i className="fa-solid fa-check"></i> {isEditing ? t(lang, 'saveChanges') : t(lang, 'saveStart')}
        </button>
      </div>
    </div>
  );
};
