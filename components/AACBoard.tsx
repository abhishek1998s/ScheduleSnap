
import React, { useState, useEffect, useRef } from 'react';
import { t } from '../utils/translations';
import { AACButton, AACCategoryType, VisualScene, ChildProfile } from '../types';
import { generateAACSymbol } from '../services/geminiService';

interface AACBoardProps {
  isOpen: boolean;
  onClose: () => void;
  language?: string;
  customButtons?: AACButton[];
  onAddCustomButton?: (btn: AACButton) => void;
  audioEnabled?: boolean;
  profile?: ChildProfile;
}

const CATEGORIES: { id: AACCategoryType, icon: string }[] = [
    { id: 'Core', icon: 'fa-star' },
    { id: 'Needs', icon: 'fa-utensils' },
    { id: 'Feelings', icon: 'fa-face-smile' },
    { id: 'Actions', icon: 'fa-person-running' },
    { id: 'Social', icon: 'fa-comments' },
    { id: 'Scenes', icon: 'fa-image' },
    { id: 'Custom', icon: 'fa-pen-to-square' },
];

export const AACBoard: React.FC<AACBoardProps> = ({ isOpen, onClose, language, customButtons = [], onAddCustomButton, audioEnabled = true, profile }) => {
  const [activeCategory, setActiveCategory] = useState<AACCategoryType>('Core');
  const [activeScene, setActiveScene] = useState<VisualScene | null>(null);
  const [newButtonLabel, setNewButtonLabel] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        // Focus management on open
        setTimeout(() => closeButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (isOpen && e.key === 'Escape') {
              onClose();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const speak = (text: string) => {
    if (!audioEnabled) return;
    if (profile?.sensoryProfile?.soundSensitivity === 'high') return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile?.audioPreferences?.speechRate || 1;

    // Voice Selection Logic
    if (profile?.audioPreferences?.voiceId) {
        const voices = window.speechSynthesis.getVoices();
        const voiceId = profile.audioPreferences.voiceId;
        // Heuristic mapping: Gemini Voice ID -> System Voice Gender
        const isMale = ['Kore', 'Fenrir', 'Charon'].includes(voiceId);
        const isFemale = ['Puck', 'Aoede'].includes(voiceId);
        const langCode = profile.language === 'Spanish' ? 'es' : profile.language === 'Hindi' ? 'hi' : 'en';
        
        const langVoices = voices.filter(v => v.lang.startsWith(langCode));
        let selectedVoice = langVoices[0];

        if (isMale) {
            selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('google us english')) || langVoices[0];
        } else if (isFemale) {
            selectedVoice = langVoices.find(v => v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')) || langVoices[0];
        }
        
        if (selectedVoice) utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
  };

  const getButtons = (cat: AACCategoryType): AACButton[] => {
      switch(cat) {
          case 'Core':
              return [
                  { id: 'yes', label: t(language, 'aacYes'), emoji: '✅', voice: 'Yes', color: 'bg-green-500', category: 'Core' },
                  { id: 'no', label: t(language, 'aacNo'), emoji: '❌', voice: 'No', color: 'bg-red-500', category: 'Core' },
                  { id: 'help', label: t(language, 'aacHelp'), emoji: '🆘', voice: 'I need help', color: 'bg-blue-500', category: 'Core' },
                  { id: 'done', label: t(language, 'aacDone'), emoji: '🏁', voice: 'I am all done', color: 'bg-purple-500', category: 'Core' },
                  { id: 'more', label: t(language, 'aacMoreTime'), emoji: '⏰', voice: 'I need more time', color: 'bg-orange-500', category: 'Core' },
                  { id: 'break', label: t(language, 'aacBreak'), emoji: '☕', voice: 'I need a break', color: 'bg-yellow-600', category: 'Core' },
              ];
          case 'Needs':
              return [
                  { id: 'bath', label: t(language, 'aacBathroom'), emoji: '🚽', voice: 'I need to use the bathroom', color: 'bg-cyan-500', category: 'Needs' },
                  { id: 'hungry', label: t(language, 'aacHungry'), emoji: '🍎', voice: 'I am hungry', color: 'bg-red-400', category: 'Needs' },
                  { id: 'thirsty', label: t(language, 'aacThirsty'), emoji: '💧', voice: 'I am thirsty', color: 'bg-blue-400', category: 'Needs' },
                  { id: 'hurt', label: t(language, 'aacHurt'), emoji: '🤕', voice: 'I am hurt', color: 'bg-red-600', category: 'Needs' },
                  { id: 'tired', label: t(language, 'aacTired'), emoji: '💤', voice: 'I am tired', color: 'bg-indigo-400', category: 'Needs' },
                  { id: 'loud', label: t(language, 'aacTooLoud'), emoji: '🙉', voice: 'It is too loud', color: 'bg-orange-600', category: 'Needs' },
                  { id: 'bright', label: t(language, 'aacTooBright'), emoji: '😎', voice: 'It is too bright', color: 'bg-yellow-500', category: 'Needs' },
              ];
          case 'Feelings':
              return [
                  { id: 'happy', label: t(language, 'aacHappy'), emoji: '😊', voice: 'I am happy', color: 'bg-green-400', category: 'Feelings' },
                  { id: 'sad', label: t(language, 'aacSad'), emoji: '😢', voice: 'I am sad', color: 'bg-blue-500', category: 'Feelings' },
                  { id: 'mad', label: t(language, 'aacMad'), emoji: '😠', voice: 'I am mad', color: 'bg-red-500', category: 'Feelings' },
                  { id: 'scared', label: t(language, 'aacScared'), emoji: '😰', voice: 'I am scared', color: 'bg-purple-600', category: 'Feelings' },
                  { id: 'hug', label: t(language, 'aacHug'), emoji: '🤗', voice: 'I want a hug', color: 'bg-pink-400', category: 'Feelings' },
              ];
          case 'Actions':
              return [
                  { id: 'stop', label: t(language, 'aacStop'), emoji: '🛑', voice: 'Stop', color: 'bg-red-600', category: 'Actions' },
                  { id: 'go', label: t(language, 'aacGo'), emoji: '🟢', voice: 'Go', color: 'bg-green-600', category: 'Actions' },
                  { id: 'wait', label: t(language, 'aacWait'), emoji: '✋', voice: 'Wait', color: 'bg-yellow-500', category: 'Actions' },
                  { id: 'look', label: t(language, 'aacLook'), emoji: '👀', voice: 'Look at this', color: 'bg-blue-500', category: 'Actions' },
                  { id: 'play', label: t(language, 'aacPlay'), emoji: '🧸', voice: 'I want to play', color: 'bg-pink-500', category: 'Actions' },
              ];
          case 'Social':
              return [
                  { id: 'hello', label: t(language, 'aacHello'), emoji: '👋', voice: 'Hello', color: 'bg-green-500', category: 'Social' },
                  { id: 'bye', label: t(language, 'aacBye'), emoji: '👋', voice: 'Goodbye', color: 'bg-red-400', category: 'Social' },
                  { id: 'thanks', label: t(language, 'aacThankYou'), emoji: '🙏', voice: 'Thank you', color: 'bg-yellow-500', category: 'Social' },
                  { id: 'please', label: t(language, 'aacPlease'), emoji: '🥺', voice: 'Please', color: 'bg-blue-400', category: 'Social' },
              ];
          default:
              return [];
      }
  };

  const SCENES: VisualScene[] = [
      {
          id: 'park',
          name: t(language, 'scenePark'),
          emoji: '🌳',
          vocabulary: [
              { id: 'slide', label: t(language, 'aacSlide'), emoji: '🎢', voice: 'I want the slide', color: 'bg-blue-400', category: 'Scenes' },
              { id: 'swing', label: t(language, 'aacSwing'), emoji: '🎪', voice: 'Push me on swing', color: 'bg-green-400', category: 'Scenes' },
              { id: 'run', label: t(language, 'aacRun'), emoji: '🏃', voice: 'I want to run', color: 'bg-orange-400', category: 'Scenes' },
              { id: 'home', label: t(language, 'aacGoHome'), emoji: '🏠', voice: 'I want to go home', color: 'bg-red-400', category: 'Scenes' },
          ]
      },
      {
          id: 'school',
          name: t(language, 'sceneSchool'),
          emoji: '🏫',
          vocabulary: [
              { id: 'teacher', label: t(language, 'aacTeacher'), emoji: '👩‍🏫', voice: 'Teacher', color: 'bg-purple-400', category: 'Scenes' },
              { id: 'friend', label: t(language, 'aacFriend'), emoji: '👫', voice: 'Friend', color: 'bg-green-400', category: 'Scenes' },
              { id: 'pencil', label: t(language, 'aacPencil'), emoji: '✏️', voice: 'I need a pencil', color: 'bg-yellow-400', category: 'Scenes' },
              { id: 'help', label: t(language, 'aacHelp'), emoji: '🙋', voice: 'I have a question', color: 'bg-blue-400', category: 'Scenes' },
          ]
      }
  ];

  const handleCreateCustom = async () => {
      if(!newButtonLabel.trim() || !onAddCustomButton) return;
      setIsAdding(true);
      try {
          const btn = await generateAACSymbol(newButtonLabel, language || 'English');
          onAddCustomButton(btn);
          setNewButtonLabel('');
      } catch(e) {
          alert('Failed to create button');
      } finally {
          setIsAdding(false);
      }
  };

  const renderButtons = () => {
      let btns: AACButton[] = [];
      if (activeCategory === 'Custom') {
          btns = customButtons;
      } else if (activeCategory === 'Scenes') {
          if (!activeScene) {
             return (
                 <div className="h-full overflow-y-auto p-4 pb-24">
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {SCENES.map(scene => (
                            <button 
                                key={scene.id}
                                onClick={() => {
                                    speak(`${t(language, 'aacIWantToGoTo')} ${scene.name}`);
                                    setActiveScene(scene);
                                }}
                                tabIndex={0}
                                className="aspect-square bg-white rounded-2xl shadow-md border-2 border-gray-100 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-gray-50 focus:ring-4 focus:ring-blue-200"
                                aria-label={`Open scene ${scene.name}`}
                            >
                                <span className="text-6xl">{scene.emoji}</span>
                                <span className="font-bold text-lg text-gray-700">{scene.name}</span>
                            </button>
                        ))}
                     </div>
                 </div>
             );
          } else {
             return (
                 <div className="flex flex-col h-full">
                     <div className="p-2 border-b flex items-center gap-2 bg-gray-50 shrink-0">
                         <button onClick={() => setActiveScene(null)} className="px-3 py-1 bg-white border rounded-lg text-sm font-bold shadow-sm hover:bg-gray-100" aria-label="Back to scenes">
                             <i className="fa-solid fa-arrow-left mr-1"></i> Back
                         </button>
                         <span className="font-bold text-lg">{activeScene.emoji} {activeScene.name}</span>
                     </div>
                     <div className="h-full overflow-y-auto p-4 pb-24">
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {activeScene.vocabulary.map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => speak(btn.voice)}
                                    tabIndex={0}
                                    onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speak(btn.voice); } }}
                                    className={`${btn.color} text-white p-2 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-md active:scale-95 transition-transform aspect-square focus:ring-4 focus:ring-offset-2`}
                                    aria-label={`Say ${btn.label}`}
                                >
                                    <span className="text-4xl">{btn.emoji}</span>
                                    <span className="font-bold text-sm text-center leading-tight w-full break-words">{btn.label}</span>
                                </button>
                            ))}
                         </div>
                     </div>
                 </div>
             );
          }
      } else {
          btns = getButtons(activeCategory);
      }

      return (
        <div className="h-full overflow-y-auto p-4 pb-24">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {btns.map(btn => (
                    <button
                        key={btn.id}
                        onClick={() => speak(btn.voice)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                             e.preventDefault();
                             speak(btn.voice);
                          }
                        }}
                        className={`${btn.color} text-white p-2 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-md active:scale-95 transition-transform aspect-square focus:ring-4 focus:ring-offset-2`}
                        aria-label={`Say ${btn.label}`}
                    >
                        <span className="text-4xl sm:text-5xl">{btn.emoji}</span>
                        <span className="font-bold text-sm sm:text-base text-center leading-tight break-words w-full">{btn.label}</span>
                    </button>
                ))}
                
                {activeCategory === 'Custom' && (
                    <div className="aspect-square bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 p-2">
                        <input 
                            type="text" 
                            value={newButtonLabel}
                            onChange={(e) => setNewButtonLabel(e.target.value)}
                            placeholder={t(language, 'enterWord')}
                            className="w-full text-center p-1 bg-white rounded border text-sm"
                            disabled={isAdding}
                            aria-label="Enter new button label"
                        />
                        <button 
                            onClick={handleCreateCustom}
                            disabled={!newButtonLabel || isAdding}
                            className="w-full bg-gray-800 text-white py-2 rounded-lg text-xs font-bold hover:bg-gray-700"
                            aria-label="Add new button"
                        >
                            {isAdding ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-plus"></i>} {t(language, 'addCustom')}
                        </button>
                    </div>
                )}
            </div>
        </div>
      );
  };

  return (
    <div 
        ref={containerRef}
        className="fixed inset-0 z-[60] bg-white sm:inset-4 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp border border-gray-100"
        role="dialog"
        aria-modal="true"
        aria-label="Communication Board"
    >
        {/* Header */}
        <div className="bg-gray-100 p-3 flex justify-between items-center border-b shrink-0">
          <h2 className="text-lg font-bold text-gray-700 flex items-center gap-2">
              <i className="fa-regular fa-comment-dots" aria-hidden="true"></i> {t(language, 'communication')}
          </h2>
          <button 
            ref={closeButtonRef}
            onClick={onClose}
            className="w-12 h-12 bg-white border border-gray-200 rounded-full hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors flex items-center justify-center shadow-sm"
            aria-label="Close Communication Board"
          >
            <i className="fa-solid fa-times text-xl" aria-hidden="true"></i>
          </button>
        </div>

        {/* Categories Tabs */}
        <div className="flex overflow-x-auto bg-white border-b shrink-0 no-scrollbar" role="tablist">
            {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id); setActiveScene(null); }}
                    role="tab"
                    aria-selected={activeCategory === cat.id}
                    className={`flex flex-col items-center justify-center p-3 min-w-[60px] sm:min-w-[80px] border-b-4 transition-colors ${
                        activeCategory === cat.id 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-transparent text-gray-500 hover:bg-gray-50'
                    }`}
                    aria-label={`Category ${cat.id}`}
                >
                    <i className={`fa-solid ${cat.icon} text-lg mb-1`} aria-hidden="true"></i>
                    <span className="text-[10px] font-bold uppercase tracking-wide">{t(language, `cat${cat.id}`)}</span>
                </button>
            ))}
        </div>
        
        {/* Button Grid Area */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative">
             {renderButtons()}
        </div>
    </div>
  );
};
