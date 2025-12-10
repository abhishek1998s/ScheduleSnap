
import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis, ResearchResult, RewardItem, AACButton, MoodEntry, CompletionLog, WeeklyReport, VideoAnalysisResult, MeltdownPrediction, SpeechAnalysis, ScheduleOptimization, ConversationMode, BuilderFeedback, StoryBook, TherapySessionAnalysis, LearningPath, Lesson, EnvironmentScan } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'dummy_key_for_init' });

const getSystemInstruction = (lang: string) => `
You are an expert pediatric occupational therapist specializing in autism. 
Your goal is to create visual schedules and content for children.
ALWAYS generate content in the following language: ${lang}.
Keep language simple, direct, and positive. Use emojis heavily.
`;

// Helper for Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// --- CORE GENERATORS ---

export const generateScheduleFromImage = async (
  base64: string,
  mimeType: string,
  profile: ChildProfile,
  history: BehaviorLog[]
): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
  if (!process.env.API_KEY) return getMockSchedule();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: `
            Generate a personalized schedule for ${profile.name}, age ${profile.age}, who loves ${profile.interests.join(', ')}.
            
            Based on the image and child's profile, include:
            - 4-8 clear steps with logical dependencies.
            - 3 different encouragement phrases per step (rotate them in 'encouragementOptions').
            - Sensory warnings/tips where relevant (e.g., loud noises, texture alerts) in 'sensoryTip'.
            - Suggested break points if the routine is long (add as a step).
            - An interest-themed celebration message.
            - Identify missing items needed for the routine.

            Consider past behaviors: ${history.map(h => h.behavior).join(', ')}.
          ` }
        ]
      },
      config: {
        systemInstruction: getSystemInstruction(profile.language),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Morning', 'Bedtime', 'Meal', 'Play', 'General'] },
            socialStory: { type: Type.STRING },
            completionCelebration: { type: Type.STRING },
            missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            scheduledTime: { type: Type.STRING },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  emoji: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  encouragement: { type: Type.STRING },
                  encouragementOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sensoryTip: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN }
                },
                required: ['id', 'emoji', 'instruction', 'encouragement', 'encouragementOptions', 'completed']
              }
            }
          },
          required: ['title', 'type', 'steps', 'socialStory']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return getMockSchedule();
  }
};

export const generateMicroSteps = async (instruction: string, profile: ChildProfile): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Step 1", "Step 2", "Step 3"];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Break down the task "${instruction}" into 3-5 very simple micro-steps for a ${profile.age} year old.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return ["Prepare", "Do it", "Finish"]; }
};

export const predictMeltdownRisk = async (profile: ChildProfile, behaviorLogs: BehaviorLog[], moodLogs: MoodEntry[], scheduleContext?: string): Promise<MeltdownPrediction> => {
    if (!process.env.API_KEY || behaviorLogs.length === 0) return { riskLevel: 'low', confidence: 0, timeEstimate: '', riskFactors: [], preventionStrategies: [], recommendedAction: 'monitor' };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze risk of meltdown. Profile: ${JSON.stringify(profile)}. Behaviors: ${JSON.stringify(behaviorLogs.slice(-5))}. Context: ${scheduleContext || 'Free'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high', 'imminent'] },
                        confidence: { type: Type.NUMBER },
                        timeEstimate: { type: Type.STRING },
                        riskFactors: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { factor: { type: Type.STRING }, contribution: { type: Type.NUMBER }, evidence: { type: Type.STRING } } } },
                        preventionStrategies: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { strategy: { type: Type.STRING }, effectiveness: { type: Type.STRING }, urgency: { type: Type.STRING, enum: ['now', 'soon', 'consider'] } } } },
                        recommendedAction: { type: Type.STRING, enum: ['monitor', 'intervene', 'calm_mode', 'break'] }
                    },
                    required: ['riskLevel', 'riskFactors', 'preventionStrategies']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch(e) { return { riskLevel: 'low', confidence: 0, timeEstimate: '', riskFactors: [], preventionStrategies: [], recommendedAction: 'monitor' }; }
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze these behavior logs for patterns and triggers for a ${profile.age} year old: ${JSON.stringify(logs)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        insight: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return getMockAnalysis(); }
};

export const analyzeBehaviorVideo = async (base64: string, profile: ChildProfile, mimeType: string = 'video/mp4'): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType, data: base64 } }, { text: "Analyze video for behavioral triggers." }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        insight: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return getMockAnalysis(); }
};

export const generateWeeklyReport = async (moods: MoodEntry[], behaviors: BehaviorLog[], completions: CompletionLog[], profile: ChildProfile): Promise<WeeklyReport> => {
    if (!process.env.API_KEY) return { summary: "Great week!", improvements: [], concerns: [], wins: [] };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate report. Moods: ${JSON.stringify(moods)}. Behaviors: ${JSON.stringify(behaviors)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        wins: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return { summary: "N/A", improvements: [], concerns: [], wins: [] }; }
};

export const generateScheduleOptimization = async (schedule: Schedule, behaviorLogs: BehaviorLog[], completionLogs: CompletionLog[], profile: ChildProfile): Promise<ScheduleOptimization> => {
    if (!process.env.API_KEY) return getMockOptimization(schedule);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Optimize schedule. Schedule: ${JSON.stringify(schedule)}. Logs: ${JSON.stringify(behaviorLogs)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scheduleId: { type: Type.STRING },
                        recommendations: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { type: { type: Type.STRING }, description: { type: Type.STRING }, reason: { type: Type.STRING }, evidence: { type: Type.STRING }, confidence: { type: Type.NUMBER } } } },
                        predictedImprovement: { type: Type.OBJECT, properties: { completionRate: { type: Type.STRING }, avgTime: { type: Type.STRING }, stressLevel: { type: Type.STRING } } }
                    }
                }
            }
        });
        const result = JSON.parse(response.text || '{}');
        return { ...result, scheduleId: schedule.id, originalSchedule: schedule, optimizedSchedule: schedule };
    } catch (e) { return getMockOptimization(schedule); }
};

export const analyzeTherapySession = async (mediaBase64: string, mimeType: string, profile: ChildProfile, previousSummary?: string): Promise<TherapySessionAnalysis> => {
    if (!process.env.API_KEY) return { duration: 15, summary: "Mock session analysis.", techniquesObserved: [], breakthroughMoments: [], challengingMoments: [], homePractice: [], progressComparedToLastSession: "Stable" };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType, data: mediaBase64 } }, { text: "Analyze therapy session." }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        duration: { type: Type.NUMBER },
                        summary: { type: Type.STRING },
                        techniquesObserved: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { technique: { type: Type.STRING }, effectiveness: { type: Type.STRING }, timestamp: { type: Type.STRING } } } },
                        breakthroughMoments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, significance: { type: Type.STRING }, timestamp: { type: Type.STRING } } } },
                        challengingMoments: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { description: { type: Type.STRING }, suggestedApproach: { type: Type.STRING }, timestamp: { type: Type.STRING } } } },
                        homePractice: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { activity: { type: Type.STRING }, duration: { type: Type.STRING }, tips: { type: Type.ARRAY, items: { type: Type.STRING } } } } },
                        progressComparedToLastSession: { type: Type.STRING }
                    }
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { throw e; }
};

export const generateLearningPath = async (profile: ChildProfile, skillArea: string): Promise<LearningPath> => {
    if (!process.env.API_KEY) return { id: 'mock', skillArea, currentLevel: 1, progress: 0, colorTheme: 'blue', lessons: [] };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create learning path for ${skillArea} for ${profile.age}yo.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { lessons: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, type: { type: Type.STRING }, estimatedTime: { type: Type.STRING }, emoji: { type: Type.STRING } } } } }
                }
            }
        });
        const data = JSON.parse(response.text || '{}');
        const lessons = data.lessons?.map((l: any, i: number) => ({ ...l, id: `l-${Date.now()}-${i}`, isCompleted: false, isLocked: i > 0 })) || [];
        return { id: `p-${Date.now()}`, skillArea, currentLevel: 1, progress: 0, colorTheme: 'blue', lessons };
    } catch (e) { throw e; }
};

export const generateLessonContent = async (lesson: Lesson, profile: ChildProfile): Promise<any> => {
    if (!process.env.API_KEY) return { text: "Mock content" };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate content for lesson ${lesson.title} (${lesson.type}).`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return {}; }
};

export const generateAACSymbol = async (label: string, language: string): Promise<AACButton> => {
    if (!process.env.API_KEY) return { id: 'mock', label, emoji: '🟦', voice: label, color: 'bg-blue-500', category: 'Custom' };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create AAC symbol for "${label}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, emoji: { type: Type.STRING }, voice: { type: Type.STRING }, color: { type: Type.STRING }, category: { type: Type.STRING } } }
            }
        });
        return { ...JSON.parse(response.text || '{}'), id: `c-${Date.now()}`, category: 'Custom' };
    } catch (e) { return { id: 'err', label, emoji: '?', voice: label, color: 'bg-gray', category: 'Custom' }; }
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Breathe", "Hug"];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Strategies for ${mood}.`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) { return ["Breathe"]; }
};

export const generateEmotionQuiz = async (age: number, level: number, language: string, lastTopic?: string): Promise<QuizQuestion> => {
    if (!process.env.API_KEY) return getMockQuiz();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Emotion quiz question. Level ${level}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, emoji: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, correctAnswer: { type: Type.STRING }, hint: { type: Type.STRING }, explanation: { type: Type.STRING }, visualType: { type: Type.STRING }, difficultyLevel: { type: Type.NUMBER } } }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return getMockQuiz(); }
};

export const generateRewards = async (profile: ChildProfile, tokens: number): Promise<RewardItem[]> => {
    if (!process.env.API_KEY) return getMockRewards();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Suggest rewards.`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, name: { type: Type.STRING }, emoji: { type: Type.STRING }, cost: { type: Type.NUMBER } } } } }
        });
        return JSON.parse(response.text || '[]').map((i:any)=>({...i, id: `r-${Math.random()}`}));
    } catch (e) { return getMockRewards(); }
};

export const generateSocialScenario = async (age: number, language: string): Promise<SocialScenario> => {
    if (!process.env.API_KEY) return getMockScenario();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Social scenario.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, emoji: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, isAppropriate: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } } } } }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return getMockScenario(); }
};

export const analyzeChildSpeech = async (audioBlob: Blob, profile: ChildProfile): Promise<SpeechAnalysis> => {
    if (!process.env.API_KEY) return { rawTranscription: "Mock", interpretedMeaning: "Mock", confidence: 1, aacSymbols: [], suggestedResponses: [], emotionalTone: "Neutral" };
    try {
        const base64 = await blobToBase64(audioBlob);
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType: 'audio/webm', data: base64 } }, { text: "Analyze speech." }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { rawTranscription: { type: Type.STRING }, interpretedMeaning: { type: Type.STRING }, confidence: { type: Type.NUMBER }, aacSymbols: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { label: { type: Type.STRING }, emoji: { type: Type.STRING } } } }, suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } }, emotionalTone: { type: Type.STRING } } }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return { rawTranscription: "Error", interpretedMeaning: "Error", confidence: 0, aacSymbols: [], suggestedResponses: [], emotionalTone: "Error" }; }
};

export const searchAutismResources = async (query: string, language: string): Promise<ResearchResult> => {
    if (!process.env.API_KEY) return { answer: "Mock answer", sources: [] };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Search: ${query}`,
            config: { tools: [{ googleSearch: {} }] }
        });
        return { answer: response.text || '', sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((c:any)=>({title:c.web?.title, uri:c.web?.uri})).filter((s:any)=>s.title) || [] };
    } catch (e) { return { answer: "Error", sources: [] }; }
};

export const analyzeRoutineFrame = async (base64: string, instruction: string, profile: ChildProfile): Promise<VideoAnalysisResult> => {
    if (!process.env.API_KEY) return { isOnTask: true, taskProgress: 50, isStuck: false, feedback: "Mock", completed: false };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64 } }, { text: `Analyze frame vs task: ${instruction}` }] },
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.OBJECT, properties: { isOnTask: { type: Type.BOOLEAN }, taskProgress: { type: Type.NUMBER }, isStuck: { type: Type.BOOLEAN }, feedback: { type: Type.STRING }, completed: { type: Type.BOOLEAN } } }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return { isOnTask: true, taskProgress: 0, isStuck: false, feedback: "", completed: false }; }
};

export const generateCompanionComment = async (profile: ChildProfile, mode: ConversationMode, context: any): Promise<string> => {
    if (!process.env.API_KEY) return "Hello!";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Robot friend comment. Mode: ${mode}. Context: ${JSON.stringify(context)}.`,
            config: { responseMimeType: "text/plain" }
        });
        return response.text || "Hi!";
    } catch (e) { return "Hi!"; }
};

export const validateBuilderRoutine = async (steps: string[], profile: ChildProfile): Promise<BuilderFeedback> => {
    if (!process.env.API_KEY) return { isValid: true, message: "Good job!", missingSteps: [] };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Validate routine: ${steps.join(', ')}.`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { isValid: { type: Type.BOOLEAN }, message: { type: Type.STRING }, missingSteps: { type: Type.ARRAY, items: { type: Type.STRING } }, suggestedOrder: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) { return { isValid: true, message: "Nice!", missingSteps: [] }; }
};

export const generateMagicStory = async (topic: string, concern: string, profile: ChildProfile): Promise<StoryBook> => {
    if (!process.env.API_KEY) return { id: 'mock', title: topic, topic, coverEmoji: '📖', pages: [], createdAt: Date.now() };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Social story about ${topic}. Concern: ${concern}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        coverEmoji: { type: Type.STRING },
                        pages: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING }, emoji: { type: Type.STRING }, color: { type: Type.STRING } } } }
                    }
                }
            }
        });
        return { ...JSON.parse(response.text || '{}'), id: `s-${Date.now()}`, topic, createdAt: Date.now() };
    } catch (e) { throw e; }
};

// --- NEW: ENVIRONMENT SCANNER ---

export const scanEnvironment = async (
    frameBase64: string, 
    audioLevel: number, // 0-100 normalized
    profile: ChildProfile
): Promise<EnvironmentScan> => {
    if (!process.env.API_KEY) {
        return {
            lightLevel: 'good',
            visualClutter: 'medium',
            noiseLevel: audioLevel,
            colorAnalysis: "Room colors seem neutral.",
            overallRisk: 'low',
            recommendations: ["Looks good!", "Maybe organize the desk."]
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: frameBase64 } },
                    { text: `
                        Analyze this room for an autistic child's sensory needs.
                        Measured Noise Level: ${audioLevel}/100.
                        Profile Sensitivities: ${profile.sensoryProfile.soundSensitivity} sound sensitivity.
                        
                        Return JSON with:
                        - lightLevel (too bright, good, too dim) & suggestion
                        - visualClutter (high, medium, low) & suggestion
                        - noiseLevel (echo back the input unless you see visual sources of noise like TV) & suggestion
                        - colorAnalysis (brief string)
                        - overallRisk (low, medium, high)
                        - recommendations (list of strings)
                    ` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lightLevel: { type: Type.STRING, enum: ['too bright', 'good', 'too dim'] },
                        lightSuggestion: { type: Type.STRING },
                        visualClutter: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
                        clutterSuggestion: { type: Type.STRING },
                        noiseLevel: { type: Type.NUMBER },
                        noiseSuggestion: { type: Type.STRING },
                        colorAnalysis: { type: Type.STRING },
                        overallRisk: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
                        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['lightLevel', 'visualClutter', 'recommendations']
                }
            }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("Scanner failed", e);
        return {
            lightLevel: 'good', visualClutter: 'low', noiseLevel: audioLevel, colorAnalysis: "Analysis failed", overallRisk: 'low', recommendations: ["Could not analyze."]
        };
    }
};

export const getMockSchedule = (): Omit<Schedule, 'id' | 'createdAt'> => ({
  title: "Morning Routine",
  type: "Morning",
  socialStory: "In the morning, we wake up and get ready.",
  completionCelebration: "Mission Accomplished!",
  missingItems: [],
  steps: [
    { id: '1', emoji: "🛏️", instruction: "Wake up", encouragement: "Good morning!", encouragementOptions: ["Good morning!", "Rise and shine!", "Hello sun!"], completed: false },
    { id: '2', emoji: "🦷", instruction: "Brush teeth", encouragement: "Sparkly smile!", encouragementOptions: ["Sparkly smile!", "Fight the sugar bugs!", "Shinny teeth!"], completed: false },
  ]
});

export const getMockOptimization = (schedule: Schedule): ScheduleOptimization => ({
    scheduleId: schedule.id,
    originalSchedule: schedule,
    optimizedSchedule: schedule,
    recommendations: [],
    predictedImprovement: { completionRate: "+0%", avgTime: "0min", stressLevel: "Same" }
});

export const getMockQuiz = (): QuizQuestion => ({ question: "Q", emoji: "❓", options: ["A"], correctAnswer: "A", hint: "H", explanation: "E", visualType: 'face', difficultyLevel: 1 });
export const getMockScenario = (): SocialScenario => ({ title: "T", description: "D", emoji: "E", options: [] });
export const getMockAnalysis = (): BehaviorAnalysis => ({ patterns: [], triggers: [], suggestions: [], insight: "N/A" });
export const getMockRewards = (): RewardItem[] => [];
