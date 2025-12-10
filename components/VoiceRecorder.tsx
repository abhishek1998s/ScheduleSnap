
import React, { useState, useRef } from 'react';
import { VoiceMessage, SpeechAnalysis } from '../types';
import { analyzeChildSpeech } from '../services/geminiService';
import { t } from '../utils/translations';

interface VoiceRecorderProps {
  onSave: (msg: VoiceMessage) => void;
  onExit: () => void;
  language?: string;
}

// Temporary profile mock if not passed. In real app, pass from App.tsx
const TEMP_PROFILE = { name: 'Child', age: 6, interests: [], language: 'English', sensoryProfile: { soundSensitivity: 'medium' } as any };

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onExit, language }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setBlob(audioBlob);
        
        setIsAnalyzing(true);
        try {
            // Pass actual profile in production
            const result = await analyzeChildSpeech(audioBlob, { ...TEMP_PROFILE, language: language || 'English' });
            setAnalysis(result);
        } catch (e) {
            setError("Failed to analyze speech. Please try again.");
        } finally {
            setIsAnalyzing(false);
        }
        
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAnalysis(null);
    } catch (err) {
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // Simple language mapping
    u.lang = language === 'Spanish' ? 'es-ES' : language === 'Hindi' ? 'hi-IN' : 'en-US';
    window.speechSynthesis.speak(u);
  };

  const handleSend = () => {
    if (blob && analysis) {
      onSave({
        id: Date.now().toString(),
        timestamp: Date.now(),
        audioBlob: blob,
        transcription: analysis.interpretedMeaning, // Main display text
        analysis: analysis, // Full analysis for parent dashboard
        read: false
      });
      onExit();
    }
  };

  const handleTryAgain = () => {
      setAnalysis(null);
      setBlob(null);
      setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-pink-50 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 z-10">
          <button onClick={onExit} className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center active:bg-gray-100">
             <i className="fa-solid fa-arrow-left text-gray-500"></i>
          </button>
          <h2 className="text-xl font-bold text-pink-700">{t(language, 'tellParents')}</h2>
          <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 overflow-y-auto w-full">
         
         {!analysis && !isAnalyzing && (
             <div className="flex flex-col items-center animate-fadeIn">
                 <div className="mb-8">
                     <p className="text-2xl font-bold text-gray-700 mb-2">{t(language, 'tapToTalk')}</p>
                     <p className="text-gray-500">{t(language, 'iWillHelp')}</p>
                 </div>
                 
                 <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 ${
                        isRecording ? 'bg-red-500 scale-110 ring-8 ring-red-200' : 'bg-pink-500 hover:bg-pink-600'
                    }`}
                >
                    <i className={`fa-solid ${isRecording ? 'fa-stop fa-beat-fade' : 'fa-microphone'} text-7xl text-white`}></i>
                </button>
                {isRecording && <p className="mt-8 text-red-500 font-bold animate-pulse">{t(language, 'recording')}</p>}
                {error && <p className="mt-4 text-red-500 font-bold bg-red-100 px-4 py-2 rounded-xl">{error}</p>}
             </div>
         )}

         {isAnalyzing && (
             <div className="flex flex-col items-center animate-fadeIn">
                 <div className="w-24 h-24 border-8 border-pink-200 border-t-pink-500 rounded-full animate-spin mb-6"></div>
                 <p className="text-xl font-bold text-pink-600">{t(language, 'analyzingSpeech')}</p>
             </div>
         )}

         {analysis && (
             <div className="w-full max-w-md animate-slideUp pb-6">
                 {/* Heard Section */}
                 <div className="bg-white/60 p-4 rounded-2xl mb-4 border border-pink-100 text-left">
                     <p className="text-xs font-bold text-gray-400 uppercase mb-1">{t(language, 'iHeard')}</p>
                     <p className="text-gray-600 italic">"{analysis.rawTranscription}"</p>
                 </div>

                 {/* AAC Interpretation */}
                 <div className="bg-white p-6 rounded-3xl shadow-lg border-2 border-pink-100 mb-6">
                     <p className="text-sm font-bold text-pink-600 uppercase mb-4 tracking-wide">{t(language, 'iThinkYouMean')}</p>
                     
                     <div className="flex justify-center gap-4 mb-6 flex-wrap">
                         {analysis.aacSymbols.map((sym, i) => (
                             <div key={i} className="flex flex-col items-center">
                                 <button 
                                    onClick={() => speakText(sym.label)}
                                    className="w-20 h-20 bg-pink-50 rounded-2xl border-2 border-pink-200 flex items-center justify-center text-4xl shadow-sm mb-2 hover:bg-pink-100 active:scale-95 transition-all"
                                 >
                                     {sym.emoji}
                                 </button>
                                 <span className="font-bold text-gray-700 text-sm">{sym.label}</span>
                             </div>
                         ))}
                     </div>

                     <div className="bg-pink-50 p-4 rounded-xl border border-pink-100">
                         <p className="text-xl font-bold text-gray-800 text-center">"{analysis.interpretedMeaning}"</p>
                     </div>
                 </div>

                 {/* Actions */}
                 <div className="grid grid-cols-2 gap-3">
                     <button 
                        onClick={() => speakText(analysis.interpretedMeaning)}
                        className="col-span-2 bg-pink-500 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-pink-600 active:scale-95 transition-all"
                     >
                         <i className="fa-solid fa-volume-high"></i> {t(language, 'speakForMe')}
                     </button>
                     
                     <button 
                        onClick={handleTryAgain}
                        className="bg-gray-200 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-300"
                     >
                         {t(language, 'retry')}
                     </button>
                     
                     <button 
                        onClick={handleSend}
                        className="bg-blue-500 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-600"
                     >
                         {t(language, 'send')} <i className="fa-solid fa-paper-plane ml-1"></i>
                     </button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};
