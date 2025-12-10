
import React, { useState, useRef, useEffect } from 'react';
import { t } from '../utils/translations';
import { ChildProfile } from '../types';

interface CameraCaptureProps {
  onImageSelected: (base64: string, mimeType: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  language?: string;
  audioEnabled?: boolean; // NEW
  profile?: ChildProfile; // NEW
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageSelected, onCancel, isLoading, language, audioEnabled = false, profile }) => {
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize shared AudioContext for sound effects
  useEffect(() => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            audioContextRef.current = new AudioContext();
        }
    } catch (e) {
        console.warn("AudioContext not supported");
    }
    return () => {
        audioContextRef.current?.close();
    };
  }, []);

  const shouldPlaySound = () => {
      if (!audioEnabled) return false;
      if (profile?.sensoryProfile?.soundSensitivity === 'high') return false;
      return true;
  };

  const playShutterSound = () => {
    if (!shouldPlaySound()) return;
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      // Resume if suspended (common in browsers)
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // High pitch click
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const playRecordSound = (isStarting: boolean) => {
    if (!shouldPlaySound()) return;
    try {
      const ctx = audioContextRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      
      const beep = (time: number, freq: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          osc.frequency.setValueAtTime(freq, time);
          gain.gain.setValueAtTime(0.3, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
          
          osc.start(time);
          osc.stop(time + 0.1);
      };

      if (isStarting) {
        beep(ctx.currentTime, 600);
        beep(ctx.currentTime + 0.15, 1000);
      } else {
        beep(ctx.currentTime, 1000);
        beep(ctx.currentTime + 0.15, 600);
      }
    } catch (e) {
      console.error("Audio error", e);
    }
  };

  const handleStreamSuccess = (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      setCameraError(null);
    }
  };

  // Initialize Camera with Fallbacks
  useEffect(() => {
    const startCamera = async () => {
      setCameraError(null);
      
      if (streamRef.current) {
         streamRef.current.getTracks().forEach(t => t.stop());
      }

      try {
        // Attempt 1: Ideal (Back Camera + Audio if video)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' },
            audio: mode === 'video' 
        });
        handleStreamSuccess(stream);
      } catch (err) {
        console.warn("Primary camera request failed, trying fallback...", err);
        try {
            // Attempt 2: Relaxed Video (Any Camera) + Audio
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true,
                audio: mode === 'video' 
            });
            handleStreamSuccess(stream);
        } catch (err2) {
            console.warn("Secondary camera request failed...", err2);
            if (mode === 'video') {
                 try {
                    // Attempt 3: Video Only (No Audio)
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    handleStreamSuccess(stream);
                 } catch (err3) {
                     console.error("All camera requests failed", err3);
                     setCameraError("Camera unavailable. Please check permissions or upload a file.");
                 }
            } else {
                 setCameraError("Camera unavailable. Please check permissions or upload a file.");
            }
        }
      }
    };

    if (!preview && !isLoading) {
      startCamera();
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, preview, isLoading]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      playShutterSound();
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPreview(dataUrl);
        setMimeType('image/jpeg');
        // Stop stream to save battery
        streamRef.current?.getTracks().forEach(t => t.stop());
      }
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    if (streamRef.current) {
      playRecordSound(true);
      chunksRef.current = [];
      
      const options = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
        ? { mimeType: 'video/webm;codecs=vp9' } 
        : MediaRecorder.isTypeSupported('video/mp4') 
             ? { mimeType: 'video/mp4' }
             : undefined;

      const recorder = new MediaRecorder(streamRef.current, options);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' }); 
        const reader = new FileReader();
        reader.onloadend = () => {
           setPreview(reader.result as string);
           setMimeType('video/mp4');
        };
        reader.readAsDataURL(blob);
        // Stop stream
        streamRef.current?.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      playRecordSound(false);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setMimeType(file.type);
        // Stop stream if active
        streamRef.current?.getTracks().forEach(t => t.stop());
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      const base64Clean = preview.split(',')[1];
      onImageSelected(base64Clean, mimeType);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setIsRecording(false);
    setRecordingTime(0);
    setCameraError(null);
    // Camera will restart via useEffect
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={onCancel} className="p-3 w-12 h-12 bg-black/20 rounded-full backdrop-blur-md flex items-center justify-center" aria-label="Close Camera">
            <i className="fa-solid fa-times text-xl"></i>
        </button>
        <span className="font-bold text-lg drop-shadow-md">
            {mode === 'photo' ? t(language, 'snapRoutine') : "Record Video"}
        </span>
        <button 
             onClick={() => {
                 setMode(prev => prev === 'photo' ? 'video' : 'photo');
                 setIsRecording(false);
                 setRecordingTime(0);
             }}
             className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-md text-xs font-bold"
             disabled={!!preview || isRecording}
             aria-label={mode === 'photo' ? "Switch to Video" : "Switch to Photo"}
        >
             {mode === 'photo' ? <i className="fa-solid fa-video"></i> : <i className="fa-solid fa-camera"></i>}
        </button>
      </div>

      {/* Viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-gray-900">
        {isLoading ? (
          <div className="text-center text-white p-8 z-20">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">{t(language, 'cameraThinking')}</h3>
            <p className="text-gray-400">{t(language, 'cameraAnalyzing')}</p>
          </div>
        ) : preview ? (
            mode === 'video' || mimeType.startsWith('video') ? (
                 <video src={preview} controls className="w-full h-full object-contain bg-black" />
            ) : (
                 <img src={preview} alt="Preview" className="w-full h-full object-contain" />
            )
        ) : cameraError ? (
          <div className="text-center text-white p-6 max-w-xs">
            <i className="fa-solid fa-triangle-exclamation text-4xl text-yellow-500 mb-4"></i>
            <p className="font-bold mb-4">{cameraError}</p>
            <p className="text-sm text-gray-400">Please use the upload button below.</p>
          </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className="w-full h-full object-cover" 
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Recording Indicator */}
        {isRecording && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500/80 text-white px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2 animate-pulse z-20">
                <div className="w-2 h-2 bg-white rounded-full"></div>
                {formatTime(recordingTime)}
            </div>
        )}
      </div>

      {/* Controls */}
      {!isLoading && (
        <div className="bg-black/80 backdrop-blur-sm p-4 sm:p-8 pb-8 sm:pb-12 flex justify-between items-center">
          {!preview ? (
            <>
               {/* Upload Button */}
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-white hover:bg-gray-700 active:scale-95 transition-transform"
                  title="Upload Photo or Video"
                  aria-label="Upload file"
                >
                  <i className="fa-solid fa-folder-open text-xl"></i>
                </button>

               {/* Shutter Button (Disabled if camera error) */}
               {!cameraError ? (
                   mode === 'photo' ? (
                       <button 
                         onClick={handleCapturePhoto}
                         className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center active:bg-gray-200 shadow-lg transform active:scale-95 transition-transform"
                         aria-label="Take Photo"
                       >
                         <div className="w-16 h-16 bg-primary rounded-full"></div>
                       </button>
                   ) : (
                       <button 
                         onClick={toggleRecording}
                         className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg transform active:scale-95 transition-transform ${isRecording ? 'border-red-500 bg-white' : 'border-white bg-red-500'}`}
                         aria-label={isRecording ? "Stop Recording" : "Start Recording"}
                       >
                         <div className={`rounded-md transition-all ${isRecording ? 'w-8 h-8 bg-red-500' : 'w-8 h-8 bg-white rounded-full'}`}></div>
                       </button>
                   )
               ) : (
                   <div className="w-20 h-20"></div> // Spacer
               )}

               <div className="w-14"></div> {/* Spacer for symmetry */}
            </>
          ) : (
            <div className="flex w-full gap-4 justify-center">
              <button 
                onClick={handleRetake}
                className="px-6 py-4 bg-gray-700 text-white rounded-full font-bold flex items-center gap-2"
              >
                <i className="fa-solid fa-rotate-left"></i> {t(language, 'retake')}
              </button>
              <button 
                onClick={handleConfirm}
                className="px-8 py-4 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-secondary flex items-center gap-2"
              >
                {t(language, 'generate')} <i className="fa-solid fa-magic"></i>
              </button>
            </div>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*,video/*"
            className="hidden" 
            onChange={handleFileUpload} 
          />
        </div>
      )}
    </div>
  );
};
