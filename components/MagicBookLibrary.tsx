
import React, { useState } from 'react';
import { StoryBook, ChildProfile } from '../types';
import { generateMagicStory } from '../services/geminiService';
import { StoryReader } from './StoryReader';
import { t } from '../utils/translations';

interface MagicBookLibraryProps {
  stories: StoryBook[];
  profile: ChildProfile;
  onSaveStory: (story: StoryBook) => void;
  onDeleteStory: (id: string) => void;
  onExit: () => void;
}

export const MagicBookLibrary: React.FC<MagicBookLibraryProps> = ({ stories, profile, onSaveStory, onDeleteStory, onExit }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [topic, setTopic] = useState('');
  const [concern, setConcern] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [readingStory, setReadingStory] = useState<StoryBook | null>(null);

  const handleCreate = async () => {
      if (!topic.trim()) return;
      setIsGenerating(true);
      try {
          const newStory = await generateMagicStory(topic, concern, profile);
          onSaveStory(newStory);
          setIsCreating(false);
          setTopic('');
          setConcern('');
          // Auto-open new story
          setReadingStory(newStory);
      } catch (e) {
          alert("Failed to create story. Please try again.");
      } finally {
          setIsGenerating(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-indigo-50">
        {/* Reader Overlay */}
        {readingStory && (
            <StoryReader 
                story={readingStory} 
                onClose={() => setReadingStory(null)} 
                language={profile.language}
                speechRate={profile.audioPreferences?.speechRate}
            />
        )}

        {/* Header */}
        <div className="bg-white p-4 shadow-sm flex items-center justify-between z-10">
            <button onClick={onExit} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <i className="fa-solid fa-arrow-left text-gray-600"></i>
            </button>
            <h1 className="font-bold text-xl text-indigo-800 flex items-center gap-2">
                <i className="fa-solid fa-book-sparkles text-indigo-500"></i> {t(profile.language, 'magicBooks')}
            </h1>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
            
            {/* Create New Prompt */}
            {!isCreating ? (
                <button 
                    onClick={() => setIsCreating(true)}
                    className="w-full bg-white p-6 rounded-3xl shadow-sm border-2 border-dashed border-indigo-200 flex flex-col items-center gap-2 mb-8 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                >
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i className="fa-solid fa-plus text-2xl text-indigo-600"></i>
                    </div>
                    <span className="font-bold text-indigo-700">{t(profile.language, 'createStory')}</span>
                </button>
            ) : (
                <div className="bg-white p-6 rounded-3xl shadow-lg border border-indigo-100 mb-8 animate-slideUp">
                    <h2 className="font-bold text-lg mb-4 text-gray-800">{t(profile.language, 'newStoryTitle')}</h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t(profile.language, 'storyTopic')}</label>
                            <input 
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. Going to the Dentist"
                                className="w-full p-3 bg-gray-50 rounded-xl border focus:border-indigo-500 outline-none font-bold text-gray-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">{t(profile.language, 'storyConcern')}</label>
                            <input 
                                value={concern}
                                onChange={(e) => setConcern(e.target.value)}
                                placeholder="e.g. Scared of the loud noises"
                                className="w-full p-3 bg-gray-50 rounded-xl border focus:border-indigo-500 outline-none text-gray-700"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setIsCreating(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
                            >
                                {t(profile.language, 'cancel')}
                            </button>
                            <button 
                                onClick={handleCreate}
                                disabled={!topic || isGenerating}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <><i className="fa-solid fa-circle-notch fa-spin"></i> {t(profile.language, 'writing')}</>
                                ) : (
                                    <><i className="fa-solid fa-wand-magic-sparkles"></i> {t(profile.language, 'create')}</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Library Grid */}
            <h3 className="font-bold text-gray-400 text-sm uppercase mb-4 tracking-wide">{t(profile.language, 'yourLibrary')}</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {stories.map(story => (
                    <div key={story.id} className="relative group">
                        <button 
                            onClick={() => setReadingStory(story)}
                            className="w-full aspect-[3/4] bg-white rounded-2xl shadow-sm border-b-4 border-indigo-200 flex flex-col items-center justify-center p-4 hover:translate-y-1 hover:border-indigo-100 transition-all"
                        >
                            <span className="text-6xl mb-4 group-hover:scale-110 transition-transform">{story.coverEmoji}</span>
                            <span className="font-bold text-indigo-900 text-sm text-center leading-tight line-clamp-2">{story.title}</span>
                            <span className="text-[10px] text-gray-400 mt-2 font-bold">{story.pages.length} Pages</span>
                        </button>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDeleteStory(story.id); }}
                            className="absolute top-2 right-2 w-8 h-8 bg-white/80 rounded-full text-red-400 hover:text-red-500 hover:bg-white shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <i className="fa-solid fa-trash text-xs"></i>
                        </button>
                    </div>
                ))}

                {stories.length === 0 && (
                    <div className="col-span-2 text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-3xl">
                        <i className="fa-solid fa-book-open text-4xl mb-2 opacity-50"></i>
                        <p className="text-sm font-bold">{t(profile.language, 'noStories')}</p>
                    </div>
                )}
            </div>

        </div>
    </div>
  );
};
