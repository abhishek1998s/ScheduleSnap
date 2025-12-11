
import React, { useEffect, useRef, useState } from 'react';
import { ScheduleStep, ChildProfile, VideoAnalysisResult } from '../types';
import { analyzeRoutineFrame } from '../services/geminiService';
import { t } from '../utils/translations';

interface VideoGuidedStepProps {
    step: ScheduleStep;
    profile: ChildProfile;
    onComplete: () => void;
    audioEnabled?: boolean; // New prop
}

export const VideoGuidedStep: React.FC<VideoGuidedStepProps> = ({ step, profile, onComplete, audioEnabled = true }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [result, setResult] = useState<VideoAnalysisResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Refs to track current props without restarting the effect
    const stepRef = useRef(step);
    const profileRef = useRef(profile);

    // Keep refs synced with props
    useEffect(() => {
        stepRef.current = step;
        setResult(null); // Clear previous step's feedback immediately
    }, [step]);

    useEffect(() => {
        profileRef.current = profile;
    }, [profile]);

    // TTS Helper
    const speak = (text: string) => {
        // Safety Check: Block if audio disabled or child has high sound sensitivity
        if (!audioEnabled) return;
        if (profileRef.current.sensoryProfile.soundSensitivity === 'high') return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = profileRef.current.audioPreferences?.speechRate || 0.9;

        // Voice Selection Logic
        if (profileRef.current?.audioPreferences?.voiceId) {
            const voices = window.speechSynthesis.getVoices();
            const voiceId = profileRef.current.audioPreferences.voiceId;
            const isMale = ['Kore', 'Fenrir', 'Charon'].includes(voiceId);
            const isFemale = ['Puck', 'Aoede'].includes(voiceId);
            const langCode = profileRef.current.language === 'Spanish' ? 'es' : profileRef.current.language === 'Hindi' ? 'hi' : 'en';
            
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

    // Camera & Analysis Loop (Run once on mount)
    useEffect(() => {
        let isMounted = true;

        const startCamera = async () => {
            try {
                // Attempt to get the user-facing camera
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode: 'user' }, 
                    audio: false 
                });
                
                streamRef.current = stream;
                
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Ensure video plays (sometimes needed on mobile)
                    videoRef.current.play().catch(e => console.warn("Play error", e));
                }

                // Start Analysis Loop only after camera is ready
                intervalRef.current = setInterval(async () => {
                    if (!videoRef.current || !canvasRef.current || isAnalyzing || !isMounted) return;
                    
                    const video = videoRef.current;
                    // Ensure video has data
                    if (video.readyState !== 4) return;

                    const canvas = canvasRef.current;
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return;
                    
                    ctx.drawImage(video, 0, 0);
                    const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

                    // Use Refs to get the LATEST step instruction without restarting camera
                    const currentStep = stepRef.current;
                    const currentProfile = profileRef.current;

                    setIsAnalyzing(true);
                    try {
                        const analysis = await analyzeRoutineFrame(base64, currentStep.instruction, currentProfile);
                        
                        if (isMounted) {
                            // Only update if we are still on the same step we analyzed
                            if (currentStep.id === stepRef.current.id) {
                                setResult(analysis);
                                
                                if (analysis.completed) {
                                    speak(t(currentProfile.language, 'goodJob'));
                                    // Small delay before advancing to let them hear the praise
                                    setTimeout(() => {
                                        if (isMounted) onComplete();
                                    }, 2000);
                                } else if (analysis.feedback) {
                                    speak(analysis.feedback);
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Analysis failed", e);
                    } finally {
                        if (isMounted) setIsAnalyzing(false);
                    }
                }, 4000); // Check every 4 seconds

            } catch (err) {
                console.error("Camera error", err);
                if (isMounted) setError("Camera unavailable");
            }
        };

        startCamera();

        return () => {
            isMounted = false;
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            // Removed window.speechSynthesis.cancel() to prevent cutting off celebration audio
        };
    }, []); // Dependency array empty intentionally to keep camera alive

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-gray-900 text-white p-6 text-center">
                <i className="fa-solid fa-video-slash text-4xl mb-4 text-red-500"></i>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full bg-black flex flex-col items-center overflow-hidden">
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover opacity-80"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay UI */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 z-10 pointer-events-none">
                
                {/* Top Info */}
                <div className="bg-black/50 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-white text-center transition-all duration-300">
                    <div className="text-4xl mb-2 animate-bounce">{step.emoji}</div>
                    <h2 className="text-xl font-bold">{step.instruction}</h2>
                </div>

                {/* Analysis Feedback Bubble */}
                {result && (
                    <div className="flex flex-col items-center gap-4 animate-slideUp">
                        <div className={`px-6 py-3 rounded-full text-lg font-bold shadow-lg border-2 text-center ${
                            result.isOnTask ? 'bg-green-500/90 border-green-300 text-white' : 'bg-yellow-500/90 border-yellow-300 text-black'
                        }`}>
                             <i className={`fa-solid ${result.isOnTask ? 'fa-check' : 'fa-eye'} mr-2`}></i>
                             {result.feedback}
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full max-w-xs bg-gray-700/50 rounded-full h-4 overflow-hidden border border-white/20">
                            <div 
                                className="h-full bg-gradient-to-r from-blue-400 to-green-400 transition-all duration-1000"
                                style={{ width: `${result.taskProgress}%` }}
                            />
                        </div>
                    </div>
                )}
                
                {!result && (
                     <div className="self-center bg-black/40 px-4 py-2 rounded-full text-white/70 text-sm flex items-center gap-2">
                         <i className="fa-solid fa-circle-notch fa-spin"></i> {t(profile.language, 'aiWatching')}
                     </div>
                )}
            </div>
        </div>
    );
};
