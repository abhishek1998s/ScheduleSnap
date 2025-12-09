
import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ChildProfile } from '../types';

interface LiveVoiceCoachProps {
  profile: ChildProfile;
  onExit: () => void;
}

export const LiveVoiceCoach: React.FC<LiveVoiceCoachProps> = ({ profile, onExit }) => {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [volume, setVolume] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputNodeRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Session & Streams
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<any>(null); // To hold the session object if needed, though we use closures
  
  useEffect(() => {
    let cleanup = () => {};

    const startSession = async () => {
      try {
        if (!process.env.API_KEY) {
            alert("API Key required for Live Coach");
            setStatus('error');
            return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Setup Audio Contexts
        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        outputNodeRef.current = outputAudioContextRef.current.createGain();
        outputNodeRef.current.connect(outputAudioContextRef.current.destination);

        // Get User Media (Audio + Video for "Vision" capabilities if we want to add later, using audio for now)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        // Video Preview
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setStatus('connected');
              
              // Process Input Audio
              const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
              inputNodeRef.current = scriptProcessor;

              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                
                // Simple volume visualization logic
                let sum = 0;
                for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                setVolume(Math.sqrt(sum / inputData.length) * 5);

                const pcmBlob = createBlob(inputData);
                sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
              };
              
              source.connect(scriptProcessor);
              scriptProcessor.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (msg: LiveServerMessage) => {
              const base64Audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio) {
                 const ctx = outputAudioContextRef.current!;
                 nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                 
                 const audioBuffer = await decodeAudioData(
                    decode(base64Audio),
                    ctx,
                    24000,
                    1
                 );
                 
                 const source = ctx.createBufferSource();
                 source.buffer = audioBuffer;
                 source.connect(outputNodeRef.current!);
                 source.start(nextStartTimeRef.current);
                 nextStartTimeRef.current += audioBuffer.duration;
                 
                 const sources = sourcesRef.current;
                 sources.add(source);
                 source.onended = () => sources.delete(source);
              }
            },
            onclose: () => setStatus('disconnected'),
            onerror: (err) => {
                console.error(err);
                setStatus('error');
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
            },
            systemInstruction: `You are a friendly, calm, and encouraging robot friend named "Snap" for a ${profile.age}-year-old autistic child named ${profile.name}. 
            Your goal is to help them feel calm, happy, and ready for their day. 
            Keep sentences short. Speak slowly. 
            If they seem quiet, ask about their favorite things: ${profile.interests.join(', ')}.`
          }
        });

        cleanup = () => {
            sessionPromise.then(s => s.close()); // Try to close if resolved
            inputNodeRef.current?.disconnect();
            inputAudioContextRef.current?.close();
            outputAudioContextRef.current?.close();
            stream.getTracks().forEach(t => t.stop());
        };

      } catch (e) {
        console.error(e);
        setStatus('error');
      }
    };

    startSession();
    return cleanup;
  }, [profile]);

  // --- Helpers for PCM ---
  function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
    const binary = String.fromCharCode(...new Uint8Array(int16.buffer));
    return {
        data: btoa(binary),
        mimeType: 'audio/pcm;rate=16000'
    };
  }

  function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  }

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
     const dataInt16 = new Int16Array(data.buffer);
     const frameCount = dataInt16.length / numChannels;
     const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
     for(let c=0; c<numChannels; c++) {
        const channelData = buffer.getChannelData(c);
        for(let i=0; i<frameCount; i++) {
            channelData[i] = dataInt16[i*numChannels + c] / 32768.0;
        }
     }
     return buffer;
  }


  return (
    <div className="flex flex-col h-full bg-black relative">
      <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-50" muted playsInline />
      
      <div className="absolute inset-0 flex flex-col items-center justify-between p-8 z-10">
         <div className="w-full flex justify-between items-center text-white">
            <h2 className="text-xl font-bold bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
                AI Coach Snap 🤖
            </h2>
            <div className={`px-3 py-1 rounded-full text-sm font-bold ${status==='connected' ? 'bg-green-500' : 'bg-red-500'}`}>
                {status.toUpperCase()}
            </div>
         </div>

         <div className="flex flex-col items-center gap-4">
             {/* Visualizer Circle */}
             <div 
               className="w-32 h-32 bg-primary/80 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(91,140,90,0.6)] transition-transform duration-100 border-4 border-white"
               style={{ transform: `scale(${1 + Math.min(volume, 0.5)})` }}
             >
                <i className="fa-solid fa-microphone text-4xl text-white"></i>
             </div>
             <p className="text-white font-bold text-lg bg-black/40 px-4 py-2 rounded-xl backdrop-blur-sm">
                 {status === 'connected' ? "I'm listening..." : "Connecting..."}
             </p>
         </div>

         <button 
            onClick={onExit}
            className="bg-red-500 hover:bg-red-600 text-white w-full max-w-sm py-4 rounded-2xl font-bold text-xl shadow-lg flex items-center justify-center gap-2"
         >
            <i className="fa-solid fa-phone-slash"></i>
            End Call
         </button>
      </div>
    </div>
  );
};
