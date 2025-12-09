
import React, { useState, useRef } from 'react';
import { VoiceMessage } from '../types';
import { transcribeAudio } from '../services/geminiService';

interface VoiceRecorderProps {
  onSave: (msg: VoiceMessage) => void;
  onExit: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, onExit }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
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
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setBlob(audioBlob);
        
        // Auto-transcribe
        setIsTranscribing(true);
        const text = await transcribeAudio(audioBlob);
        setTranscription(text);
        setIsTranscribing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setTranscription(''); // Clear previous
    } catch (err) {
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleSend = () => {
    if (blob) {
      onSave({
        id: Date.now().toString(),
        timestamp: Date.now(),
        audioBlob: blob,
        transcription: transcription
      });
      onExit();
    }
  };

  return (
    <div className="flex flex-col h-full bg-pink-50 items-center justify-center p-6 text-center">
      <h2 className="text-2xl font-bold text-pink-700 mb-2">Tell Parents</h2>
      <p className="text-gray-500 mb-8">Record a message for mom or dad</p>

      {!audioURL ? (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-40 h-40 rounded-full flex items-center justify-center shadow-xl transition-all ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-pink-500'
          }`}
        >
          <i className={`fa-solid ${isRecording ? 'fa-stop' : 'fa-microphone'} text-5xl text-white`}></i>
        </button>
      ) : (
        <div className="w-full max-w-sm bg-white p-6 rounded-3xl shadow-lg flex flex-col gap-4">
          <audio src={audioURL} controls className="w-full" />
          
          {/* Transcription Area */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[60px] flex items-center justify-center text-sm text-gray-700 italic">
            {isTranscribing ? (
                <div className="flex items-center gap-2 text-pink-500">
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>Converting speech to text...</span>
                </div>
            ) : (
                <p>"{transcription}"</p>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => { setAudioURL(null); setBlob(null); setTranscription(''); }}
              className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100"
            >
              Retry
            </button>
            <button 
              onClick={handleSend}
              className="flex-1 py-3 rounded-xl font-bold text-white bg-green-500 shadow-md"
            >
              Send <i className="fa-solid fa-paper-plane ml-2"></i>
            </button>
          </div>
        </div>
      )}

      {!audioURL && (
          <p className="mt-8 text-xl font-bold text-gray-400">
              {isRecording ? "Recording..." : "Tap to Start"}
          </p>
      )}

      <button onClick={onExit} className="absolute top-6 left-6 p-2">
         <i className="fa-solid fa-arrow-left text-2xl text-gray-400"></i>
      </button>
    </div>
  );
};
