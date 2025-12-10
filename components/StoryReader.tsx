
import React, { useState, useEffect } from 'react';
import { StoryBook } from '../types';
import { t } from '../utils/translations';

interface StoryReaderProps {
  story: StoryBook;
  onClose: () => void;
  language?: string;
  speechRate?: number;
}

export const StoryReader: React.FC<StoryReaderProps> = ({ story, onClose, language, speechRate = 1 }) => {
  const [currentPage, setCurrentPage] = useState(-1); // -1 is Cover
  const [isFlipping, setIsFlipping] = useState(false);

  const totalPages = story.pages.length;

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
      // Auto-speak on page turn
      if (currentPage === -1) {
          speak(story.title);
      } else if (currentPage < totalPages) {
          speak(story.pages[currentPage].text);
      } else {
          speak(t(language, 'theEnd'));
      }
  }, [currentPage]);

  const handleNext = () => {
      if (isFlipping) return;
      if (currentPage < totalPages) {
          setIsFlipping(true);
          setTimeout(() => {
              setCurrentPage(prev => prev + 1);
              setIsFlipping(false);
          }, 300);
      } else {
          onClose();
      }
  };

  const handlePrev = () => {
      if (isFlipping) return;
      if (currentPage > -1) {
          setIsFlipping(true);
          setTimeout(() => {
              setCurrentPage(prev => prev - 1);
              setIsFlipping(false);
          }, 300);
      }
  };

  const getPageContent = () => {
      if (currentPage === -1) {
          // Cover Page
          return (
              <div className="flex flex-col items-center justify-center h-full text-center bg-indigo-50 p-8 rounded-3xl border-4 border-indigo-200">
                  <div className="text-9xl mb-8 animate-bounce">{story.coverEmoji}</div>
                  <h1 className="text-4xl font-bold text-indigo-900 mb-4">{story.title}</h1>
                  <p className="text-indigo-400 font-bold uppercase tracking-widest text-sm">{t(language, 'magicBook')}</p>
              </div>
          );
      } else if (currentPage === totalPages) {
          // End Page
          return (
              <div className="flex flex-col items-center justify-center h-full text-center bg-green-50 p-8 rounded-3xl border-4 border-green-200">
                  <div className="text-9xl mb-8 animate-pulse">🌟</div>
                  <h1 className="text-4xl font-bold text-green-900 mb-4">{t(language, 'theEnd')}</h1>
                  <button 
                    onClick={onClose}
                    className="mt-8 bg-green-500 text-white px-8 py-4 rounded-full font-bold text-xl shadow-lg hover:bg-green-600"
                  >
                      {t(language, 'closeBook')}
                  </button>
              </div>
          );
      } else {
          // Story Page
          const page = story.pages[currentPage];
          return (
              <div className={`flex flex-col items-center justify-center h-full text-center p-6 rounded-3xl border-4 border-white/50 shadow-inner transition-colors duration-500 ${page.color}`}>
                  <div className="flex-1 flex items-center justify-center">
                      <div className="text-[10rem] filter drop-shadow-lg transform transition-transform hover:scale-110 duration-300">
                          {page.emoji}
                      </div>
                  </div>
                  <div className="bg-white/90 p-6 rounded-2xl shadow-sm w-full mb-8">
                      <p className="text-2xl md:text-3xl font-bold text-gray-800 leading-relaxed font-sans">
                          {page.text}
                      </p>
                  </div>
              </div>
          );
      }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        {/* Book Container */}
        <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-video bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Header / Progress */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 pointer-events-none">
                <button onClick={onClose} className="pointer-events-auto bg-black/20 text-white w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center hover:bg-black/40">
                    <i className="fa-solid fa-times"></i>
                </button>
                {currentPage >= 0 && currentPage < totalPages && (
                    <div className="bg-black/20 text-white px-4 py-1 rounded-full backdrop-blur-md font-bold text-sm">
                        {currentPage + 1} / {totalPages}
                    </div>
                )}
            </div>

            {/* Main Content Area with Animation */}
            <div className={`flex-1 p-2 md:p-6 transition-opacity duration-300 ${isFlipping ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
                {getPageContent()}
            </div>

            {/* Navigation Controls */}
            <div className="p-4 flex justify-between items-center bg-white border-t z-10">
                <button 
                    onClick={handlePrev}
                    disabled={currentPage === -1}
                    className="w-16 h-16 rounded-full bg-gray-100 text-gray-600 disabled:opacity-30 flex items-center justify-center hover:bg-gray-200 active:scale-90 transition-all"
                >
                    <i className="fa-solid fa-arrow-left text-2xl"></i>
                </button>

                {currentPage >= 0 && currentPage < totalPages && (
                    <button 
                        onClick={() => speak(story.pages[currentPage].text)}
                        className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 active:scale-90 transition-all shadow-sm"
                    >
                        <i className="fa-solid fa-volume-high text-2xl"></i>
                    </button>
                )}

                <button 
                    onClick={handleNext}
                    className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:bg-secondary active:scale-90 transition-all shadow-lg"
                >
                    <i className={`fa-solid ${currentPage === totalPages ? 'fa-check' : 'fa-arrow-right'} text-2xl`}></i>
                </button>
            </div>
        </div>
    </div>
  );
};
