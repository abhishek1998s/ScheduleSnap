
import React, { useEffect, useState, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { t } from '../utils/translations';
import { ChildProfile } from '../types';

interface CalmModeProps {
  onExit: () => void;
  language?: string;
  audioEnabled?: boolean;
  profile?: ChildProfile;
}

type BreathingPattern = 'Balanced' | 'Relax' | 'Box' | 'Quick';
type VisualTheme = 'Circle' | 'Waves' | 'Bubbles' | 'Stars';
type Soundscape = 'None' | 'WhiteNoise' | 'Rain' | 'Ocean' | 'Forest' | 'Birds' | 'Guided';

const PATTERNS: Record<BreathingPattern, { in: number; hold: number; out: number; holdEmpty: number }> = {
  Balanced: { in: 4, hold: 4, out: 4, holdEmpty: 0 }, // 4-4-4
  Relax: { in: 4, hold: 7, out: 8, holdEmpty: 0 },    // 4-7-8
  Box: { in: 4, hold: 4, out: 4, holdEmpty: 4 },      // 4-4-4-4
  Quick: { in: 3, hold: 0, out: 3, holdEmpty: 0 },    // 3-3
};

// --- AUDIO UTILITIES ---

const decodeAudioData = async (base64: string, ctx: AudioContext): Promise<AudioBuffer> => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  const dataInt16 = new Int16Array(bytes.buffer);
  const numChannels = 1; 
  const sampleRate = 24000;
  const frameCount = dataInt16.length / numChannels;
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
  }
  
  return buffer;
};

export const CalmMode: React.FC<CalmModeProps> = ({ onExit, language, audioEnabled = true, profile }) => {
  const [phase, setPhase] = useState<'In' | 'Hold' | 'Out' | 'HoldEmpty'>('In');
  const [text, setText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [isLoadingGuided, setIsLoadingGuided] = useState(false);
  
  const [pattern, setPattern] = useState<BreathingPattern>('Balanced');
  const [visual, setVisual] = useState<VisualTheme>('Stars');
  const [sound, setSound] = useState<Soundscape>('None');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<AudioNode[]>([]);
  
  const stopAllSound = () => {
      sourceNodesRef.current.forEach(node => {
          try { node.disconnect(); } catch(e){}
          try { (node as any).stop && (node as any).stop(); } catch(e){}
      });
      sourceNodesRef.current = [];
  };

  const initAudio = () => {
      if (!audioCtxRef.current) {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
              const ctx = new AudioContextClass();
              audioCtxRef.current = ctx;
              masterGainRef.current = ctx.createGain();
              masterGainRef.current.connect(ctx.destination);
              // Ensure master volume is set
              masterGainRef.current.gain.setValueAtTime(0.5, ctx.currentTime);
          }
      }
      
      if (audioCtxRef.current) {
          if (audioCtxRef.current.state === 'suspended') {
              audioCtxRef.current.resume().then(() => setAudioReady(true));
          } else {
              setAudioReady(true);
          }
      }
  };

  // --- SOUND GENERATORS ---

  const playNoise = (type: 'pink' | 'brown' | 'white') => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const ctx = audioCtxRef.current;
      
      // Create Buffer
      const bufferSize = ctx.sampleRate * 2; // 2 seconds is enough for noise
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          if (type === 'white') {
              data[i] = white;
          } else {
              // Brown noise (integrated white noise) for Rain/Ocean
              data[i] = (lastOut + (0.02 * white)) / 1.02;
              lastOut = data[i];
              data[i] *= 3.5; // Gain compensation
          }
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      
      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      // Adjust frequencies for better audibility while remaining calm
      filter.frequency.value = type === 'white' ? 800 : 400; 
      
      // Individual Gain for Fade In
      const fadeGain = ctx.createGain();
      fadeGain.gain.setValueAtTime(0, ctx.currentTime);
      fadeGain.gain.linearRampToValueAtTime(type === 'white' ? 0.05 : 0.25, ctx.currentTime + 1);

      source.connect(filter);
      filter.connect(fadeGain);
      fadeGain.connect(masterGainRef.current);
      source.start();
      
      sourceNodesRef.current.push(source, filter, fadeGain);
  };

  const playOscillatorDrone = (freq1: number, freq2: number) => {
      if (!audioCtxRef.current || !masterGainRef.current) return;
      const ctx = audioCtxRef.current;

      const createOsc = (f: number) => {
          const osc = ctx.createOscillator();
          osc.frequency.value = f;
          osc.type = 'sine';
          
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 1);
          
          osc.connect(g);
          g.connect(masterGainRef.current!);
          osc.start();
          sourceNodesRef.current.push(osc, g);
      };

      createOsc(freq1);
      createOsc(freq2);
  };

  const generateGuidedMeditation = async () => {
      if (!process.env.API_KEY || !audioCtxRef.current || !masterGainRef.current) {
          // Fallback if no API key
          playOscillatorDrone(150, 154);
          return;
      }
      setIsLoadingGuided(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Say in a very slow, warm, soothing voice: "Breathe in slowly... hold it... and breathe out. You are doing great. Feel calm and safe."`;
          
          const response = await ai.models.generateContent({
              model: "gemini-2.5-flash-preview-tts",
              contents: [{ parts: [{ text: prompt }] }],
              config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
              },
          });

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
              const buffer = await decodeAudioData(base64Audio, audioCtxRef.current);
              const source = audioCtxRef.current.createBufferSource();
              source.buffer = buffer;
              source.loop = true; 
              
              const gain = audioCtxRef.current.createGain();
              gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
              gain.gain.linearRampToValueAtTime(0.8, audioCtxRef.current.currentTime + 1);
              
              source.connect(gain);
              gain.connect(masterGainRef.current);
              source.start();
              sourceNodesRef.current.push(source, gain);
          }
      } catch (e) {
          console.error("Gemini TTS failed", e);
          playOscillatorDrone(150, 154); 
      } finally {
          setIsLoadingGuided(false);
      }
  };

  // Ensure Audio Context is resumed when sound changes
  useEffect(() => {
      if (sound !== 'None' && audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume().then(() => setAudioReady(true));
      }
  }, [sound]);

  // Handle Sound Changes
  useEffect(() => {
      stopAllSound();
      
      // If user selected a sound but context isn't ready/created, try init
      if (sound !== 'None' && !audioCtxRef.current) {
          initAudio();
      }

      if (!audioEnabled || !audioReady || sound === 'None') return;

      // Small delay to ensure context is ready and clean state
      const timer = setTimeout(() => {
          switch(sound) {
              case 'WhiteNoise': playNoise('white'); break;
              case 'Rain': playNoise('pink'); break; // Using brown/pink algo
              case 'Ocean': playNoise('brown'); break; 
              case 'Forest': playOscillatorDrone(300, 305); break; 
              case 'Guided': generateGuidedMeditation(); break;
          }
      }, 50);

      return () => clearTimeout(timer);
  }, [sound, audioReady, audioEnabled]);

  // Cleanup on unmount
  useEffect(() => {
      return () => {
          stopAllSound();
          if (audioCtxRef.current) {
              audioCtxRef.current.close();
              audioCtxRef.current = null;
          }
      };
  }, []);

  // --- VISUAL LOGIC ---
  const [particles, setParticles] = useState<{ x: number, y: number, size: number, delay: number, duration: number }[]>([]);

  useEffect(() => {
      const count = 40;
      const newParticles = Array.from({ length: count }).map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 10 + 2,
          delay: Math.random() * 5,
          duration: Math.random() * 10 + 5
      }));
      setParticles(newParticles);
  }, [visual]);

  // --- BREATHING LOGIC ---
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const nextPhase = (next: 'In' | 'Hold' | 'Out' | 'HoldEmpty') => {
        if (!isMounted) return;
        setPhase(next);
        
        let label = '';
        let duration = 0;
        const p = PATTERNS[pattern];

        switch(next) {
            case 'In': label = t(language, 'breatheIn'); duration = p.in; break;
            case 'Hold': label = t(language, 'hold'); duration = p.hold; break;
            case 'Out': label = t(language, 'breatheOut'); duration = p.out; break;
            case 'HoldEmpty': label = t(language, 'holdEmpty'); duration = p.holdEmpty; break;
        }
        setText(label);

        if (duration > 0) {
            timeout = setTimeout(() => {
                if (next === 'In') nextPhase(p.hold > 0 ? 'Hold' : 'Out');
                else if (next === 'Hold') nextPhase('Out');
                else if (next === 'Out') nextPhase(p.holdEmpty > 0 ? 'HoldEmpty' : 'In');
                else if (next === 'HoldEmpty') nextPhase('In');
            }, duration * 1000);
        } else {
            if (next === 'In') nextPhase('Out');
            else if (next === 'Hold') nextPhase('Out');
            else if (next === 'HoldEmpty') nextPhase('In');
        }
    };

    nextPhase('In');
    return () => { isMounted = false; clearTimeout(timeout); };
  }, [pattern, language]);

  const getPhaseDuration = () => {
      const p = PATTERNS[pattern];
      switch(phase) {
          case 'In': return p.in;
          case 'Hold': return p.hold;
          case 'Out': return p.out;
          case 'HoldEmpty': return p.holdEmpty;
          default: return 1;
      }
  };

  const renderVisuals = () => {
      const duration = getPhaseDuration();
      const transitionStyle = { transitionDuration: `${duration}s` };
      
      if (visual === 'Stars') {
          return (
              <div className="absolute inset-0 bg-slate-900 overflow-hidden z-0">
                  {particles.map((p, i) => (
                      <div key={i} className="absolute rounded-full bg-white opacity-40 animate-pulse"
                         style={{
                             left: `${p.x}%`, top: `${p.y}%`,
                             width: i % 3 === 0 ? '2px' : '4px', height: i % 3 === 0 ? '2px' : '4px',
                             animationDuration: `${p.duration}s`
                         }}
                      />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`rounded-full bg-yellow-100 blur-[60px] transition-all ease-in-out ${phase === 'In' || phase === 'Hold' ? 'scale-125 opacity-30' : 'scale-75 opacity-10'}`} 
                           style={{ width: '300px', height: '300px', ...transitionStyle }} />
                  </div>
              </div>
          );
      }
      
      if (visual === 'Bubbles') {
          return (
               <div className="absolute inset-0 bg-gradient-to-b from-cyan-800 to-blue-900 overflow-hidden z-0">
                   {particles.map((p, i) => (
                       <div key={i} className="absolute rounded-full border border-white/20 bg-white/5"
                          style={{
                              left: `${p.x}%`, bottom: '-20px',
                              width: `${p.size}rem`, height: `${p.size}rem`,
                              animation: `floatUp ${p.duration}s linear infinite ${p.delay}s`,
                          }}
                       />
                   ))}
                   <style>{`@keyframes floatUp { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 0.5; } 100% { transform: translateY(-110vh); opacity: 0; } }`}</style>
               </div>
          );
      }

      // Default Circle/Waves
      return (
          <div className={`absolute inset-0 z-0 flex items-center justify-center overflow-hidden ${visual === 'Waves' ? 'bg-blue-100' : 'bg-green-100'}`}>
              <div className={`absolute rounded-full border-4 border-white/40 transition-all ease-in-out ${phase === 'In' || phase === 'Hold' ? 'w-[120vw] h-[120vw] opacity-0' : 'w-0 h-0 opacity-100'}`} 
                   style={{ transitionDuration: `${duration * 1.5}s` }}></div>
          </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-screen bg-black text-white overflow-hidden">
      {/* Background */}
      {renderVisuals()}

      {/* Main Breathing Indicator */}
      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div 
             className={`relative rounded-full flex items-center justify-center transition-all ease-in-out shadow-2xl backdrop-blur-sm
                 ${phase === 'In' || phase === 'Hold' ? 'scale-150' : 'scale-100'}
                 ${visual === 'Stars' ? 'bg-white/10 border border-white/30' : 'bg-white/30 border-4 border-white/60'}
             `}
             style={{ 
                 width: 'min(50vw, 300px)', 
                 height: 'min(50vw, 300px)',
                 transitionDuration: `${getPhaseDuration()}s` 
             }}
          >
              <div className={`text-center transition-opacity duration-300 ${visual==='Stars' || visual==='Bubbles' ? 'text-white' : 'text-slate-800'}`}>
                  <div className="text-4xl md:text-6xl font-bold mb-2 drop-shadow-md">{text}</div>
                  <div className="text-sm uppercase tracking-widest opacity-80">{t(language, `pattern${pattern}`)}</div>
              </div>
          </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
          <button 
              onClick={() => setSettingsOpen(true)}
              className="w-12 h-12 rounded-full bg-black/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/30 transition-colors"
          >
              <i className="fa-solid fa-sliders text-xl"></i>
          </button>
          
          <button 
              onClick={onExit}
              className="w-12 h-12 rounded-full bg-black/20 text-white backdrop-blur-md flex items-center justify-center hover:bg-black/30 transition-colors"
          >
              <i className="fa-solid fa-times text-xl"></i>
          </button>
      </div>

      {/* Audio Start Overlay (If context suspended or not created) */}
      {!audioReady && (
          <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center backdrop-blur-sm p-6">
              <div className="text-center">
                  <button 
                      onClick={initAudio}
                      className="bg-white text-black px-8 py-4 rounded-full font-bold text-xl shadow-xl hover:scale-105 transition-transform animate-bounce"
                  >
                      <i className="fa-solid fa-play mr-2"></i> Start Calm Mode
                  </button>
                  <p className="mt-4 text-white/80 font-bold">Tap to enable calming sounds</p>
              </div>
          </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-gray-800">
                 <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                     <h2 className="text-xl font-bold"><i className="fa-solid fa-sliders text-primary mr-2"></i> Settings</h2>
                     <button onClick={() => setSettingsOpen(false)}><i className="fa-solid fa-times text-xl text-gray-500"></i></button>
                 </div>

                 <div className="p-6 overflow-y-auto space-y-6 flex-1">
                     <section>
                         <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">{t(language, 'soundscape')}</h3>
                         <div className="grid grid-cols-2 gap-3">
                             {(['None', 'Guided', 'WhiteNoise', 'Rain', 'Ocean', 'Forest'] as const).map(s => (
                                 <button key={s} 
                                     onClick={() => { 
                                         setSound(s); 
                                         // Force audio init if selecting a sound from menu first
                                         if(!audioCtxRef.current || audioCtxRef.current.state === 'suspended') initAudio(); 
                                     }}
                                     className={`p-3 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition-all ${sound === s ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}
                                 >
                                     <i className={`fa-solid ${s === 'Guided' ? 'fa-wand-magic-sparkles' : 'fa-music'}`}></i>
                                     {s === 'Guided' && isLoadingGuided ? 'Loading...' : t(language, `sound${s}`)}
                                 </button>
                             ))}
                         </div>
                     </section>

                     <section>
                         <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">{t(language, 'breathingPattern')}</h3>
                         <div className="grid grid-cols-2 gap-3">
                             {(['Balanced', 'Relax', 'Box', 'Quick'] as const).map(p => (
                                 <button key={p} onClick={() => setPattern(p)}
                                     className={`p-3 rounded-xl border-2 text-xs font-bold transition-all ${pattern === p ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'}`}
                                 >
                                     {t(language, `pattern${p}`)}
                                 </button>
                             ))}
                         </div>
                     </section>

                     <section>
                         <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">{t(language, 'visualTheme')}</h3>
                         <div className="grid grid-cols-4 gap-2">
                             {(['Circle', 'Waves', 'Bubbles', 'Stars'] as const).map(v => (
                                 <button key={v} onClick={() => setVisual(v)}
                                     className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${visual === v ? 'border-blue-500 bg-blue-50' : 'border-gray-100'}`}
                                 >
                                     <div className={`w-6 h-6 rounded-full border ${v === 'Stars' ? 'bg-slate-800' : 'bg-blue-200'}`}></div>
                                     <span className="text-[9px] font-bold">{v}</span>
                                 </button>
                             ))}
                         </div>
                     </section>
                 </div>
             </div>
          </div>
      )}
    </div>
  );
};
