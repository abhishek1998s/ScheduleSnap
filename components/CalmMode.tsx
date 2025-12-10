
import React, { useEffect, useState, useRef } from 'react';
import { t } from '../utils/translations';

interface CalmModeProps {
  onExit: () => void;
  language?: string;
}

type BreathingPattern = 'Balanced' | 'Relax' | 'Box' | 'Quick';
type VisualTheme = 'Circle' | 'Waves' | 'Bubbles' | 'Stars';
type Soundscape = 'None' | 'WhiteNoise' | 'Rain' | 'Drone' | 'Heartbeat';

const PATTERNS: Record<BreathingPattern, { in: number; hold: number; out: number; holdEmpty: number }> = {
  Balanced: { in: 4, hold: 4, out: 4, holdEmpty: 0 },
  Relax: { in: 4, hold: 7, out: 8, holdEmpty: 0 },
  Box: { in: 4, hold: 4, out: 4, holdEmpty: 4 },
  Quick: { in: 3, hold: 0, out: 3, holdEmpty: 0 },
};

export const CalmMode: React.FC<CalmModeProps> = ({ onExit, language }) => {
  const [phase, setPhase] = useState<'In' | 'Hold' | 'Out' | 'HoldEmpty'>('In');
  const [text, setText] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Settings State
  const [pattern, setPattern] = useState<BreathingPattern>('Balanced');
  const [visual, setVisual] = useState<VisualTheme>('Circle');
  const [sound, setSound] = useState<Soundscape>('None');

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Background Elements State (for Stars/Bubbles)
  const [particles, setParticles] = useState<{ x: number, y: number, size: number, speed: number }[]>([]);

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

  // Audio Engine
  useEffect(() => {
      if (!audioCtxRef.current || !gainNodeRef.current) return;
      const ctx = audioCtxRef.current;
      const masterGain = gainNodeRef.current;
      
      // Stop previous
      oscillatorsRef.current.forEach(osc => osc.stop());
      oscillatorsRef.current = [];
      if (noiseNodeRef.current) {
          noiseNodeRef.current.stop();
          noiseNodeRef.current = null;
      }

      if (ctx.state === 'suspended') ctx.resume();

      if (sound === 'None') {
          masterGain.gain.setValueAtTime(0, ctx.currentTime);
          return;
      }
      
      masterGain.gain.setValueAtTime(0.1, ctx.currentTime); // Default low volume

      if (sound === 'WhiteNoise' || sound === 'Rain') {
          const bufferSize = ctx.sampleRate * 2;
          const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = buffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
              data[i] = Math.random() * 2 - 1;
          }

          const noise = ctx.createBufferSource();
          noise.buffer = buffer;
          noise.loop = true;
          
          if (sound === 'Rain') {
             // Lowpass filter for rain
             const filter = ctx.createBiquadFilter();
             filter.type = 'lowpass';
             filter.frequency.value = 800;
             noise.connect(filter);
             filter.connect(masterGain);
          } else {
             noise.connect(masterGain);
          }
          
          noise.start();
          noiseNodeRef.current = noise;
      } 
      else if (sound === 'Drone') {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'triangle';
          osc1.frequency.value = 110; // A2
          osc2.frequency.value = 164.81; // E3
          
          osc1.connect(masterGain);
          osc2.connect(masterGain); // Harmony
          osc1.start();
          osc2.start();
          oscillatorsRef.current.push(osc1, osc2);
      }
      else if (sound === 'Heartbeat') {
          // Heartbeat needs to be triggered in the rhythm loop, but simplified here:
          // Just a low thrum for now, or handled in visual loop
          const osc = ctx.createOscillator();
          osc.frequency.value = 60;
          osc.type = 'sine';
          const lfo = ctx.createOscillator();
          lfo.frequency.value = 1.2; // ~70 BPM
          const lfoGain = ctx.createGain();
          lfoGain.gain.value = 50;
          
          lfo.connect(lfoGain);
          lfoGain.connect(masterGain.gain);
          osc.connect(masterGain);
          osc.start();
          lfo.start();
          oscillatorsRef.current.push(osc, lfo);
      }

  }, [sound]);

  // Visual Particle Generator
  useEffect(() => {
      const count = visual === 'Stars' ? 50 : visual === 'Bubbles' ? 20 : 0;
      const newParticles = Array.from({ length: count }).map(() => ({
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * (visual === 'Stars' ? 0.3 : 2) + 0.1,
          speed: Math.random() * 2 + 1
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

        // Schedule next
        if (duration > 0) {
            timeout = setTimeout(() => {
                if (next === 'In') {
                    nextPhase(p.hold > 0 ? 'Hold' : 'Out');
                } else if (next === 'Hold') {
                    nextPhase('Out');
                } else if (next === 'Out') {
                    nextPhase(p.holdEmpty > 0 ? 'HoldEmpty' : 'In');
                } else if (next === 'HoldEmpty') {
                    nextPhase('In');
                }
            }, duration * 1000);
        } else {
            // Skip 0 duration phases immediately
            if (next === 'In') nextPhase('Out'); // Quick fallback
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

  // Calculate dynamic duration for visual transitions
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

  // Visual Renderers
  const renderVisuals = () => {
      const durationStyle = { transitionDuration: `${getPhaseDuration()}s` };
      
      switch(visual) {
          case 'Circle':
              return (
                <div 
                    className={`relative flex items-center justify-center transition-all ease-in-out
                        ${phase === 'In' ? 'scale-150' : phase === 'Hold' ? 'scale-150' : 'scale-75'}
                    `}
                    style={durationStyle}
                >
                    <div className="w-64 h-64 bg-white/30 rounded-full absolute animate-ping opacity-20"></div>
                    <div className="w-48 h-48 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border-4 border-white/50 shadow-[0_0_60px_rgba(255,255,255,0.4)]">
                        <span className="text-6xl drop-shadow-md">
                            {phase === 'In' ? '🌬️' : phase === 'Hold' || phase === 'HoldEmpty' ? '😌' : '💨'}
                        </span>
                    </div>
                </div>
              );
          case 'Waves':
               return (
                  <div className="absolute inset-0 flex items-end overflow-hidden">
                      <div 
                          className={`w-full bg-blue-400/30 backdrop-blur-sm transition-all ease-in-out
                              ${phase === 'In' || phase === 'Hold' ? 'h-[90%]' : 'h-[20%]'}
                          `}
                          style={durationStyle}
                      >
                           <div className="absolute top-0 w-[200%] h-12 bg-white/30 rounded-[50%] animate-pulse -translate-y-1/2"></div>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                           <span className="text-8xl drop-shadow-lg">{phase === 'In' ? '⬆️' : phase === 'Out' ? '⬇️' : '⏸️'}</span>
                      </div>
                  </div>
               );
          case 'Stars':
              return (
                  <div className="absolute inset-0 bg-[#0B1026] overflow-hidden">
                      {particles.map((p, i) => (
                          <div 
                             key={i}
                             className="absolute bg-white rounded-full animate-pulse"
                             style={{
                                 left: `${p.x}%`,
                                 top: `${p.y}%`,
                                 width: `${p.size}rem`,
                                 height: `${p.size}rem`,
                                 opacity: Math.random()
                             }}
                          />
                      ))}
                      <div 
                        className={`absolute inset-0 flex items-center justify-center transition-opacity ${phase === 'In' ? 'opacity-100' : 'opacity-40'}`}
                        style={durationStyle}
                      >
                           <div className="w-64 h-64 bg-yellow-100/10 rounded-full blur-3xl"></div>
                      </div>
                  </div>
              );
           case 'Bubbles':
               return (
                   <div className="absolute inset-0 bg-blue-900 overflow-hidden">
                       {particles.map((p, i) => (
                           <div 
                              key={i}
                              className={`absolute border-2 border-white/30 rounded-full bg-white/10 backdrop-blur-sm transition-transform duration-[4000ms] ease-linear`}
                              style={{
                                  left: `${p.x}%`,
                                  bottom: `-20%`,
                                  width: `${p.size * 2}rem`,
                                  height: `${p.size * 2}rem`,
                                  transform: phase === 'In' ? `translateY(-${100 + Math.random()*20}vh)` : 'translateY(0)'
                              }}
                           />
                       ))}
                       <div className="absolute inset-0 flex items-center justify-center z-10">
                          <span className="text-6xl text-white/80">{phase === 'In' ? '🫧' : ''}</span>
                       </div>
                   </div>
               );
      }
  };

  const getBgColor = () => {
      if (visual === 'Stars') return 'bg-[#0B1026] text-white';
      if (visual === 'Bubbles') return 'bg-blue-900 text-white';
      if (visual === 'Waves') return 'bg-blue-50 text-blue-800';
      return 'bg-[#C8E6C9] text-primary'; // Circle/Default
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-colors duration-1000 ${getBgColor()}`}>
      
      {/* Settings Toggle */}
      <button 
        onClick={() => setSettingsOpen(!settingsOpen)}
        className="absolute top-6 left-6 bg-black/20 text-white p-3 rounded-full hover:bg-black/30 transition-colors z-20 backdrop-blur-md"
      >
        <i className="fa-solid fa-sliders"></i>
      </button>

      {/* Exit */}
      <button 
        onClick={onExit}
        className="absolute top-6 right-6 bg-black/20 text-white p-3 rounded-full hover:bg-black/30 transition-colors z-20 backdrop-blur-md"
      >
        <i className="fa-solid fa-times text-2xl"></i>
      </button>

      {/* Settings Panel */}
      {settingsOpen && (
          <div className="absolute top-20 left-6 right-6 bg-white/90 backdrop-blur-lg rounded-3xl p-6 shadow-2xl z-30 animate-slideUp text-gray-800 max-w-md mx-auto">
             
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
                        {(['None', 'WhiteNoise', 'Rain', 'Drone', 'Heartbeat'] as const).map(s => (
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

      {/* Visual Render */}
      {renderVisuals()}

      {/* Text Overlay */}
      <div className="absolute bottom-20 text-center z-10 px-4">
        <div className="text-4xl md:text-5xl font-bold opacity-90 drop-shadow-lg mb-2 transition-all">
            {text}
        </div>
        <p className="text-lg opacity-70 font-medium">{t(language, `pattern${pattern}`)}</p>
      </div>
    </div>
  );
};
