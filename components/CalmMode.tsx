
import React, { useEffect, useState, useRef } from 'react';
import { t } from '../utils/translations';
import { ChildProfile } from '../types';

interface CalmModeProps {
  onExit: () => void;
  language?: string;
  audioEnabled?: boolean; // New
  profile?: ChildProfile; // New
}

type BreathingPattern = 'Balanced' | 'Relax' | 'Box' | 'Quick';
type VisualTheme = 'Circle' | 'Waves' | 'Bubbles' | 'Stars';
type Soundscape = 'None' | 'WhiteNoise' | 'Rain' | 'Drone' | 'Heartbeat' | 'Ocean' | 'Forest';

const PATTERNS: Record<BreathingPattern, { in: number; hold: number; out: number; holdEmpty: number }> = {
  Balanced: { in: 4, hold: 4, out: 4, holdEmpty: 0 },
  Relax: { in: 4, hold: 7, out: 8, holdEmpty: 0 },
  Box: { in: 4, hold: 4, out: 4, holdEmpty: 4 },
  Quick: { in: 3, hold: 0, out: 3, holdEmpty: 0 },
};

export const CalmMode: React.FC<CalmModeProps> = ({ onExit, language, audioEnabled = true, profile }) => {
  const [phase, setPhase] = useState<'In' | 'Hold' | 'Out' | 'HoldEmpty'>('In');
  const [text, setText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Settings State
  const [pattern, setPattern] = useState<BreathingPattern>('Balanced');
  const [visual, setVisual] = useState<VisualTheme>('Stars'); // Default to Stars based on screenshot
  const [sound, setSound] = useState<Soundscape>('None');

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<(OscillatorNode | AudioBufferSourceNode)[]>([]);

  // Background Elements State
  const [particles, setParticles] = useState<{ x: number, y: number, size: number, delay: number, duration: number }[]>([]);

  // Init Audio Context
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    return () => {
        audioCtxRef.current?.close();
    };
  }, []);

  // Audio Engine with Cross-fading
  useEffect(() => {
      if (!audioCtxRef.current || !gainNodeRef.current) return;
      const ctx = audioCtxRef.current;
      const masterGain = gainNodeRef.current;
      
      const fadeTime = 0.5;
      
      const oldSources = [...oscillatorsRef.current];
      oldSources.forEach(src => {
          try { src.stop(ctx.currentTime + fadeTime); } catch(e){}
      });
      oscillatorsRef.current = [];

      if (ctx.state === 'suspended') ctx.resume();

      masterGain.gain.cancelScheduledValues(ctx.currentTime);
      masterGain.gain.setValueAtTime(0, ctx.currentTime);

      // SAFETY CHECK: Force silence if audio off or sensitive
      if (!audioEnabled || profile?.sensoryProfile?.soundSensitivity === 'high') {
          return;
      }

      if (sound === 'None') return;
      
      masterGain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + fadeTime);

      if (sound === 'WhiteNoise' || sound === 'Rain' || sound === 'Ocean') {
          const bufferSize = ctx.sampleRate * 2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              // Pinkish noise approximation for ocean/rain
              const white = Math.random() * 2 - 1;
              data[i] = (lastOut + (0.02 * white)) / 1.02;
              lastOut = data[i];
              data[i] *= 3.5; 
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          
          if (sound === 'Rain') {
             const filter = ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.value = 400;
             noise.connect(filter);
             filter.connect(masterGain);
          } else if (sound === 'Ocean') {
             const filter = ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.value = 300;
             // LFO for wave effect
             const lfo = ctx.createOscillator();
             lfo.type = 'sine';
             lfo.frequency.value = 0.1; // Slow waves
             const lfoGain = ctx.createGain();
             lfoGain.gain.value = 200;
             lfo.connect(lfoGain);
             lfoGain.connect(filter.frequency);
             lfo.start();
             
             noise.connect(filter);
             filter.connect(masterGain);
             oscillatorsRef.current.push(lfo);
          } else {
             noise.connect(masterGain);
          }
          
          noise.start();
          oscillatorsRef.current.push(noise);
      } 
      else if (sound === 'Drone' || sound === 'Forest') {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          
          if (sound === 'Forest') {
              // Simulating wind
              osc1.frequency.value = 100;
              osc2.frequency.value = 150;
              const windFilter = ctx.createBiquadFilter();
              windFilter.type = 'bandpass';
              windFilter.frequency.value = 400;
              osc1.connect(windFilter);
              osc2.connect(windFilter);
              windFilter.connect(masterGain);
          } else {
              osc1.frequency.value = 110; 
              osc2.frequency.value = 111.5;
              const oscGain = ctx.createGain();
              oscGain.gain.value = 0.5;
              osc1.connect(masterGain);
              osc2.connect(oscGain);
              oscGain.connect(masterGain);
          }

          osc1.start();
          osc2.start();
          oscillatorsRef.current.push(osc1, osc2);
      }
      else if (sound === 'Heartbeat') {
          const osc = ctx.createOscillator();
          osc.frequency.value = 50;
          osc.type = 'sine';
          
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 1.2; 
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 300; 
          
          lfo.connect(lfoGain);
          lfoGain.connect(masterGain.gain);
          
          osc.connect(masterGain);
          osc.start();
          lfo.start();
          oscillatorsRef.current.push(osc, lfo);
      }

  }, [sound, audioEnabled, profile]);

  let lastOut = 0; // For pink noise generation

  // Visual Particle Generator
  useEffect(() => {
      const count = visual === 'Stars' ? 60 : visual === 'Bubbles' ? 30 : 0;
      const newParticles = Array.from({ length: count }).map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * (visual === 'Stars' ? 0.3 : 1.5) + 0.2,
          delay: Math.random() * 5,
          duration: Math.random() * 10 + 10
      }));
      setParticles(newParticles);
  }, [visual]);

  // Breathing Cycle Logic
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const vibrate = () => {
        if (navigator.vibrate) navigator.vibrate(50);
    };

    const nextPhase = (next: 'In' | 'Hold' | 'Out' | 'HoldEmpty') => {
        if (!isMounted) return;
        setPhase(next);
        vibrate();
        
        let label = '';
        let duration = 0;
        const p = PATTERNS[pattern];

        switch(next) {
            case 'In':
                label = t(language, 'breatheIn');
                duration = p.in;
                break;
            case 'Hold':
                label = t(language, 'hold');
                duration = p.hold;
                break;
            case 'Out':
                label = t(language, 'breatheOut');
                duration = p.out;
                break;
            case 'HoldEmpty':
                label = t(language, 'holdEmpty');
                duration = p.holdEmpty;
                break;
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

    return () => {
        isMounted = false;
        clearTimeout(timeout);
    };
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
      
      switch(visual) {
          case 'Circle':
              return (
                <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div 
                        className={`rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/40 shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all ease-in-out
                            ${phase === 'In' || phase === 'Hold' ? 'w-[70vw] h-[70vw] md:w-96 md:h-96' : 'w-[35vw] h-[35vw] md:w-48 md:h-48'}
                        `}
                        style={transitionStyle}
                    />
                </div>
              );
          case 'Waves':
               return (
                  <div className="absolute inset-0 flex items-end overflow-hidden z-0 bg-blue-50">
                      <div 
                          className={`w-full bg-blue-400/40 backdrop-blur-sm transition-all ease-in-out
                              ${phase === 'In' || phase === 'Hold' ? 'h-[85%]' : 'h-[15%]'}
                          `}
                          style={transitionStyle}
                      >
                           <div className="absolute -top-6 left-0 right-0 h-12 bg-white/30 rounded-[100%] scale-x-150 animate-pulse"></div>
                      </div>
                  </div>
               );
          case 'Stars':
              return (
                  <div className="absolute inset-0 bg-[#0B1026] overflow-hidden z-0">
                      {particles.map((p, i) => (
                          <div 
                             key={i}
                             className="absolute bg-white rounded-full animate-pulse"
                             style={{
                                 left: `${p.x}%`,
                                 top: `${p.y}%`,
                                 width: `${p.size}rem`,
                                 height: `${p.size}rem`,
                                 opacity: Math.random() * 0.7 + 0.3,
                                 animationDuration: `${p.delay}s`
                             }}
                          />
                      ))}
                      
                      {/* Central Breathing Guide - Translucent Ring/Glow for Text Contrast */}
                      <div className="absolute inset-0 flex items-center justify-center">
                         <div 
                            className={`rounded-full bg-blue-500/10 blur-3xl transition-all ease-in-out
                                ${phase === 'In' || phase === 'Hold' ? 'w-[80vw] h-[80vw] md:w-[500px] md:h-[500px] opacity-80' : 'w-[40vw] h-[40vw] md:w-[250px] md:h-[250px] opacity-40'}
                            `}
                            style={transitionStyle}
                         />
                         <div 
                            className={`rounded-full border-2 border-white/20 shadow-[0_0_50px_rgba(100,200,255,0.3)] bg-white/5 transition-all ease-in-out
                                ${phase === 'In' || phase === 'Hold' ? 'w-[60vw] h-[60vw] md:w-80 md:h-80' : 'w-[30vw] h-[30vw] md:w-40 md:h-40'}
                            `}
                            style={transitionStyle}
                         />
                      </div>
                  </div>
              );
           case 'Bubbles':
               return (
                   <div className="absolute inset-0 bg-gradient-to-b from-blue-900 to-blue-800 overflow-hidden z-0">
                       <style>{`
                         @keyframes floatUp {
                           0% { transform: translateY(110vh); opacity: 0; }
                           10% { opacity: 0.6; }
                           90% { opacity: 0.6; }
                           100% { transform: translateY(-10vh); opacity: 0; }
                         }
                       `}</style>
                       
                       <div className="absolute inset-0 flex items-center justify-center">
                            <div 
                                className={`rounded-full border-4 border-white/40 bg-white/10 backdrop-blur-md shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all ease-in-out
                                    ${phase === 'In' || phase === 'Hold' ? 'w-[70vw] h-[70vw] md:w-80 md:h-80' : 'w-[35vw] h-[35vw] md:w-40 md:h-40'}
                                `}
                                style={transitionStyle}
                            />
                       </div>

                       {particles.map((p, i) => (
                           <div 
                              key={i}
                              className="absolute rounded-full border border-white/20 bg-white/5"
                              style={{
                                  left: `${p.x}%`,
                                  width: `${p.size}rem`,
                                  height: `${p.size}rem`,
                                  animation: `floatUp ${p.duration}s linear infinite`,
                                  animationDelay: `-${p.delay}s` 
                              }}
                           />
                       ))}
                   </div>
               );
      }
  };

  const getBgColor = () => {
      if (visual === 'Stars') return 'bg-[#0B1026] text-white';
      if (visual === 'Bubbles') return 'bg-blue-900 text-white';
      if (visual === 'Waves') return 'bg-blue-50 text-blue-900'; // Darker text for Waves
      return 'bg-[#C8E6C9] text-gray-800'; // Darker text for Circle (default)
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col ${getBgColor()}`}>
      
      {/* Settings Toggle */}
      <button 
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="absolute top-6 left-6 bg-black/20 text-white p-4 rounded-full hover:bg-black/30 transition-colors z-30 backdrop-blur-md"
        aria-label="Settings"
      >
        <i className="fa-solid fa-sliders"></i>
      </button>

      {/* Exit */}
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 bg-black/20 text-white p-4 rounded-full hover:bg-black/30 transition-colors z-30 backdrop-blur-md"
        aria-label="Exit Calm Mode"
      >
        <i className="fa-solid fa-times text-2xl"></i>
      </button>

      {/* Settings Panel */}
      {settingsOpen && (
          <div className="absolute top-20 left-6 right-6 bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl z-40 transition-all duration-300 text-gray-800 max-w-md mx-auto">
             
             <div className="space-y-4">
                 <div>
                     <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">{t(language, 'breathingPattern')}</label>
                     <div className="grid grid-cols-2 gap-2">
                        {(['Balanced', 'Relax', 'Box', 'Quick'] as const).map(p => (
                            <button 
                                key={p} 
                                onClick={() => setPattern(p)}
                                className={`py-2 px-3 rounded-xl text-sm font-bold border-2 ${pattern === p ? 'border-primary bg-primary/10 text-primary' : 'border-transparent bg-gray-100'}`}
                            >
                                {t(language, `pattern${p}`)}
                            </button>
                        ))}
                     </div>
                 </div>

                 <div>
                     <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">{t(language, 'visualTheme')}</label>
                     <div className="flex gap-2 overflow-x-auto pb-2">
                        {(['Circle', 'Waves', 'Bubbles', 'Stars'] as const).map(v => (
                            <button 
                                key={v} 
                                onClick={() => setVisual(v)}
                                className={`py-2 px-4 rounded-xl text-sm font-bold border-2 whitespace-nowrap ${visual === v ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-transparent bg-gray-100'}`}
                            >
                                {t(language, `visual${v}`)}
                            </button>
                        ))}
                     </div>
                 </div>

                 <div>
                     <label className="text-xs font-bold uppercase text-gray-400 mb-2 block">{t(language, 'soundscape')}</label>
                     <div className="flex gap-2 overflow-x-auto pb-2">
                        {(['None', 'WhiteNoise', 'Rain', 'Drone', 'Heartbeat', 'Ocean', 'Forest'] as const).map(s => (
                            <button 
                                key={s} 
                                onClick={() => setSound(s)}
                                className={`py-2 px-4 rounded-xl text-sm font-bold border-2 whitespace-nowrap ${sound === s ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-transparent bg-gray-100'}`}
                            >
                                {t(language, `sound${s}`)}
                            </button>
                        ))}
                     </div>
                 </div>
             </div>
             
             <button onClick={() => setSettingsOpen(false)} className="w-full mt-6 bg-gray-900 text-white py-3 rounded-xl font-bold">Close</button>
          </div>
      )}

      {/* Visual Render Layer */}
      {renderVisuals()}

      {/* Text Overlay Layer - Perfectly Centered */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 p-4">
         <div className="text-center transition-all duration-300 transform">
            <h1 className={`text-6xl md:text-8xl font-bold drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] mb-6 tracking-wide transition-opacity duration-500 ${visual === 'Waves' ? 'text-blue-900' : 'text-white'}`}>
                {text}
            </h1>
            <div className="inline-block px-6 py-2 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-lg">
                <p className="text-sm md:text-base font-bold text-white/90 uppercase tracking-widest">
                    {t(language, `pattern${pattern}`)}
                </p>
            </div>
         </div>
      </div>
    </div>
  );
};
