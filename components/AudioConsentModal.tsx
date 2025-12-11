
import React, { useEffect, useRef } from 'react';

interface AudioConsentModalProps {
  onConsent: (enabled: boolean) => void;
}

export const AudioConsentModal: React.FC<AudioConsentModalProps> = ({ onConsent }) => {
  const yesButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus 'Yes' button on mount for keyboard accessibility
    if (yesButtonRef.current) {
        yesButtonRef.current.focus();
    }
    
    // Trap focus management for accessibility
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
             // Simple focus keep-alive (MVP) - in a robust app use a focus-trap library
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div 
        className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-consent-title"
        aria-describedby="audio-consent-desc"
    >
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-bounceIn">
        <i className="fa-solid fa-volume-high text-4xl text-green-600 mb-4" aria-hidden="true"></i>
        <h2 id="audio-consent-title" className="text-xl font-bold text-gray-800 mb-2">Enable Sounds?</h2>
        <p id="audio-consent-desc" className="text-gray-600 mb-6 text-sm">
          ScheduleSnap uses audio for speech, alarms, and calming sounds. Would you like to enable audio?
        </p>
        
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => onConsent(false)}
                className="py-3 px-4 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 focus:ring-4 focus:ring-gray-200 outline-none transition-colors"
                aria-label="No, keep sounds muted"
            >
                No
            </button>
            <button 
                ref={yesButtonRef}
                onClick={() => onConsent(true)}
                className="py-3 px-4 rounded-xl bg-green-600 text-white font-bold shadow-lg hover:bg-green-700 focus:ring-4 focus:ring-green-300 outline-none transition-colors"
                aria-label="Yes, enable sounds"
            >
                Yes
            </button>
        </div>
      </div>
    </div>
  );
};
