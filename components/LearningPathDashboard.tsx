
import React, { useState } from 'react';
import { ChildProfile, LearningPath, Lesson } from '../types';
import { generateLearningPath } from '../services/geminiService';
import { LessonActivity } from './LessonActivity';
import { t } from '../utils/translations';

interface LearningPathDashboardProps {
  profile: ChildProfile;
  paths: LearningPath[];
  onUpdatePath: (path: LearningPath) => void;
  onExit: () => void;
  audioEnabled?: boolean; // New prop
}

const AREAS = [
    { id: 'Emotional Regulation', icon: 'fa-heart-pulse', color: 'bg-red-500' },
    { id: 'Social Skills', icon: 'fa-users', color: 'bg-blue-500' },
    { id: 'Communication', icon: 'fa-comments', color: 'bg-purple-500' },
    { id: 'Daily Living', icon: 'fa-shirt', color: 'bg-green-500' },
    { id: 'Safety', icon: 'fa-shield-halved', color: 'bg-orange-500' },
];

export const LearningPathDashboard: React.FC<LearningPathDashboardProps> = ({ profile, paths, onUpdatePath, onExit, audioEnabled = true }) => {
  const [activeArea, setActiveArea] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  
  const lang = profile.language;

  // Get or Create Path
  const handleAreaSelect = async (areaId: string) => {
      const existing = paths.find(p => p.skillArea === areaId);
      if (existing) {
          setActiveArea(areaId);
      } else {
          setLoading(true);
          try {
              const newPath = await generateLearningPath(profile, areaId);
              onUpdatePath(newPath);
              setActiveArea(areaId);
          } catch (e) {
              alert("Could not generate path. Try again.");
          } finally {
              setLoading(false);
          }
      }
  };

  const currentPath = paths.find(p => p.skillArea === activeArea);

  const handleLessonComplete = () => {
      if (!currentPath || !activeLesson) return;
      
      const lessonIndex = currentPath.lessons.findIndex(l => l.id === activeLesson.id);
      const newLessons = [...currentPath.lessons];
      newLessons[lessonIndex] = { ...activeLesson, isCompleted: true };
      
      // Unlock next
      if (lessonIndex + 1 < newLessons.length) {
          newLessons[lessonIndex + 1] = { ...newLessons[lessonIndex + 1], isLocked: false };
      }

      // Calculate progress
      const completed = newLessons.filter(l => l.isCompleted).length;
      const progress = Math.round((completed / newLessons.length) * 100);

      onUpdatePath({ ...currentPath, lessons: newLessons, progress });
      setActiveLesson(null);
  };

  if (activeLesson) {
      return (
          <LessonActivity 
            lesson={activeLesson} 
            profile={profile} 
            onComplete={handleLessonComplete} 
            onExit={() => setActiveLesson(null)} 
            audioEnabled={audioEnabled} // Passed here
          />
      );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
        <div className="bg-white p-4 shadow-sm border-b flex items-center justify-between sticky top-0 z-10">
            <button onClick={activeArea ? () => setActiveArea(null) : onExit} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <i className="fa-solid fa-arrow-left text-gray-600"></i>
            </button>
            <h1 className="font-bold text-xl text-slate-800">{activeArea ? activeArea : t(lang, 'myLearning')}</h1>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            
            {loading && (
                <div className="flex flex-col items-center justify-center h-64">
                    <i className="fa-solid fa-rocket text-4xl text-blue-500 fa-bounce mb-4"></i>
                    <p className="font-bold text-gray-500">{t(lang, 'buildingPath')}</p>
                </div>
            )}

            {!activeArea && !loading && (
                <div className="grid grid-cols-1 gap-4">
                    {AREAS.map(area => {
                        const path = paths.find(p => p.skillArea === area.id);
                        return (
                            <button 
                                key={area.id}
                                onClick={() => handleAreaSelect(area.id)}
                                className="bg-white p-4 rounded-2xl shadow-sm border-b-4 border-gray-100 flex items-center gap-4 hover:border-gray-200 transition-all active:scale-95"
                            >
                                <div className={`w-16 h-16 rounded-xl ${area.color} flex items-center justify-center text-white text-2xl shadow-md`}>
                                    <i className={`fa-solid ${area.icon}`}></i>
                                </div>
                                <div className="flex-1 text-left">
                                    <h3 className="font-bold text-lg text-slate-800">{t(lang, `area${area.id.split(' ')[0]}`)}</h3>
                                    {path ? (
                                        <div className="mt-2">
                                            <div className="flex justify-between text-xs font-bold text-gray-400 mb-1">
                                                <span>Level {path.currentLevel}</span>
                                                <span>{path.progress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full ${area.color}`} style={{width: `${path.progress}%`}}></div>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-400 mt-1 font-bold">Tap to start</p>
                                    )}
                                </div>
                                <i className="fa-solid fa-chevron-right text-gray-300"></i>
                            </button>
                        );
                    })}
                </div>
            )}

            {activeArea && currentPath && !loading && (
                <div className="relative py-8 px-4 flex flex-col items-center gap-8">
                    {/* Visual Path Line */}
                    <div className="absolute top-8 bottom-8 left-1/2 w-2 bg-gray-200 rounded-full -translate-x-1/2 z-0"></div>

                    {currentPath.lessons.map((lesson, index) => (
                        <div key={lesson.id} className={`relative z-10 w-full flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                            <button 
                                onClick={() => !lesson.isLocked && setActiveLesson(lesson)}
                                disabled={lesson.isLocked}
                                className={`w-3/4 max-w-[200px] p-4 rounded-3xl shadow-lg border-b-4 transition-transform active:scale-95 flex flex-col items-center gap-2 relative
                                    ${lesson.isCompleted 
                                        ? 'bg-green-500 border-green-700 text-white' 
                                        : lesson.isLocked 
                                            ? 'bg-gray-100 border-gray-300 text-gray-400' 
                                            : 'bg-white border-blue-200 text-slate-800'
                                    }
                                `}
                            >
                                <span className="text-4xl filter drop-shadow-sm">{lesson.emoji}</span>
                                <span className="font-bold text-sm text-center leading-tight">{lesson.title}</span>
                                
                                {lesson.isLocked && (
                                    <div className="absolute inset-0 bg-gray-100/50 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                                        <i className="fa-solid fa-lock text-gray-400 text-xl"></i>
                                    </div>
                                )}
                                {lesson.isCompleted && (
                                    <div className="absolute top-2 right-2 bg-white text-green-500 rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-sm">
                                        <i className="fa-solid fa-check"></i>
                                    </div>
                                )}
                            </button>
                            
                            {/* Connector Circle on Line */}
                            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm ${lesson.isCompleted ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                        </div>
                    ))}
                    
                    {/* Final Trophy */}
                    <div className="relative z-10 bg-yellow-400 text-white w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl border-4 border-white">
                        <i className="fa-solid fa-trophy"></i>
                    </div>
                </div>
            )}

        </div>
    </div>
  );
};
