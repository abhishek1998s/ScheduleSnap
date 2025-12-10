
import React, { useState, useRef, useEffect } from 'react';
import { EnvironmentScan, ChildProfile } from '../types';
import { scanEnvironment } from '../services/geminiService';
import { t } from '../utils/translations';

interface EnvironmentScannerProps {
  profile: ChildProfile;
  onExit: () => void;
}

export const EnvironmentScanner: React.FC<EnvironmentScannerProps> = ({ profile, onExit }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [result, setResult] = useState<EnvironmentScan | null>(null);
  const [videoError, setVideoError] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const noiseLevelRef = useRef<number>(0);

  const lang = profile.language;

  useEffect(() => {
    const startSensors = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
            streamRef.current = stream;
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Audio Analysis Setup
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Measure noise loop
            const measureNoise = () => {
                if (!analyserRef.current || !isScanning) return;
                const dataArray = new Uint8Array(analyser.frequencyBinCount);
                analyser.getByteFrequencyData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const average = sum / dataArray.length;
                
                // Simple running average
                noiseLevelRef.current = (noiseLevelRef.current * 0.9) + (average * 0.1);
                
                if(isScanning) requestAnimationFrame(measureNoise);
            };
            measureNoise();

            // Auto-scan after 3 seconds
            setTimeout(performScan, 3000);

        } catch (e) {
            console.error("Sensor error", e);
            setVideoError(true);
        }
    };

    if (isScanning) {
        startSensors();
    }

    return () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isScanning]);

  const performScan = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
      
      // Stop video to freeze frame visually (optional, but good for UX)
      if (videoRef.current) videoRef.current.pause();

      try {
          const scanResult = await scanEnvironment(base64, Math.round(noiseLevelRef.current), profile);
          setResult(scanResult);
          setIsScanning(false);
      } catch (e) {
          console.error("Scan failed");
      }
  };

  const handleScanAgain = () => {
      setResult(null);
      setIsScanning(true);
      if (videoRef.current) videoRef.current.play();
  };

  const getRiskColor = (risk: string) => {
      if (risk === 'high') return 'bg-red-500';
      if (risk === 'medium') return 'bg-yellow-500';
      return 'bg-green-500';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white relative overflow-hidden">
        {/* Camera Layer */}
        <div className="absolute inset-0 z-0">
            {!videoError ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-50" />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <p>Camera Unavailable</p>
                </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* UI Overlay */}
        <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={onExit} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <i className="fa-solid fa-times"></i>
                </button>
                <h2 className="font-bold text-lg tracking-wide uppercase">{t(lang, 'envScanner')}</h2>
                <div className="w-10"></div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-6">
                {isScanning ? (
                    <div className="relative w-full max-w-sm aspect-square border-2 border-white/30 rounded-3xl overflow-hidden">
                        {/* Scanning Line Animation */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)] animate-[scan_2s_linear_infinite]"></div>
                        <style>{`
                            @keyframes scan {
                                0% { top: 0%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { top: 100%; opacity: 0; }
                            }
                        `}</style>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <p className="font-bold text-xl animate-pulse">{t(lang, 'scanningRoom')}</p>
                        </div>
                    </div>
                ) : result ? (
                    <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-6 text-slate-800 shadow-2xl animate-slideUp overflow-y-auto max-h-[75vh]">
                        
                        {/* Overall Risk Header */}
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <span className="font-bold text-gray-500 uppercase text-xs">{t(lang, 'envRisk')}</span>
                            <span className={`px-3 py-1 rounded-full text-white text-xs font-bold uppercase ${getRiskColor(result.overallRisk)}`}>
                                {result.overallRisk}
                            </span>
                        </div>

                        {/* Gauges Grid */}
                        <div className="grid grid-cols-3 gap-2 mb-6">
                            {/* Light */}
                            <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center text-center">
                                <i className={`fa-solid fa-sun text-2xl mb-2 ${result.lightLevel === 'good' ? 'text-green-500' : 'text-orange-500'}`}></i>
                                <span className="text-[10px] font-bold uppercase text-gray-400">{t(lang, 'lightLevel')}</span>
                                <span className="text-xs font-bold">{result.lightLevel}</span>
                            </div>
                            {/* Noise */}
                            <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center text-center">
                                <i className={`fa-solid fa-volume-high text-2xl mb-2 ${result.noiseLevel > 60 ? 'text-red-500' : result.noiseLevel > 30 ? 'text-yellow-500' : 'text-green-500'}`}></i>
                                <span className="text-[10px] font-bold uppercase text-gray-400">{t(lang, 'noiseLevel')}</span>
                                <span className="text-xs font-bold">{result.noiseLevel}%</span>
                            </div>
                            {/* Clutter */}
                            <div className="bg-slate-50 p-3 rounded-2xl flex flex-col items-center text-center">
                                <i className={`fa-solid fa-boxes-stacked text-2xl mb-2 ${result.visualClutter === 'low' ? 'text-green-500' : 'text-orange-500'}`}></i>
                                <span className="text-[10px] font-bold uppercase text-gray-400">{t(lang, 'visualClutter')}</span>
                                <span className="text-xs font-bold">{result.visualClutter}</span>
                            </div>
                        </div>

                        {/* Analysis Text */}
                        <p className="text-sm text-gray-600 italic mb-4 border-l-4 border-blue-400 pl-3">
                            "{result.colorAnalysis}"
                        </p>

                        {/* Recommendations */}
                        <div className="space-y-3 mb-6">
                            <h3 className="font-bold text-slate-800 text-sm uppercase">{t(lang, 'recommendations')}</h3>
                            {result.recommendations.map((rec, i) => (
                                <div key={i} className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl text-sm text-blue-900">
                                    <i className="fa-solid fa-lightbulb mt-1 text-blue-500"></i>
                                    {rec}
                                </div>
                            ))}
                            {result.lightSuggestion && <div className="text-xs text-orange-600 px-2">• {result.lightSuggestion}</div>}
                            {result.noiseSuggestion && <div className="text-xs text-orange-600 px-2">• {result.noiseSuggestion}</div>}
                        </div>

                        <button 
                            onClick={handleScanAgain}
                            className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 active:scale-95 transition-all"
                        >
                            <i className="fa-solid fa-rotate-right mr-2"></i> {t(lang, 'scanAgain')}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    </div>
  );
};
