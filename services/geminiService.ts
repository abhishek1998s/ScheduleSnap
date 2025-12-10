import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis, ResearchResult, RewardItem, AACButton, MoodEntry, CompletionLog, WeeklyReport, VideoAnalysisResult, MeltdownPrediction, SpeechAnalysis, ScheduleOptimization, ConversationMode, BuilderFeedback } from "../types";

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
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: `Create a routine based on this image for a ${profile.age} year old child. 
                   Consider these past behaviors: ${history.map(h => h.behavior).join(', ')}.
                   Include missing items if any.` }
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
                required: ['id', 'emoji', 'instruction', 'encouragement', 'completed']
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
            model: 'gemini-2.5-flash',
            contents: `Break down the task "${instruction}" into 3-5 very simple micro-steps for a ${profile.age} year old.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return ["Prepare", "Do it", "Finish"];
    }
};

// --- PREDICTION & ANALYSIS ---

export const predictMeltdownRisk = async (
    profile: ChildProfile, 
    behaviorLogs: BehaviorLog[], 
    moodLogs: MoodEntry[],
    scheduleContext?: string
): Promise<MeltdownPrediction> => {
    if (!process.env.API_KEY || behaviorLogs.length === 0) return {
        riskLevel: 'low', confidence: 0, timeEstimate: '', riskFactors: [], preventionStrategies: [], recommendedAction: 'monitor'
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Analyze risk of meltdown.
                Profile: ${JSON.stringify(profile)}.
                Recent Behaviors: ${JSON.stringify(behaviorLogs.slice(-5))}.
                Recent Moods: ${JSON.stringify(moodLogs.slice(-5))}.
                Current Context: ${scheduleContext || 'Free play'}.
                Time: ${new Date().toLocaleTimeString()}.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        riskLevel: { type: Type.STRING, enum: ['low', 'medium', 'high', 'imminent'] },
                        confidence: { type: Type.NUMBER },
                        timeEstimate: { type: Type.STRING },
                        riskFactors: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    factor: { type: Type.STRING },
                                    contribution: { type: Type.NUMBER },
                                    evidence: { type: Type.STRING }
                                }
                            }
                        },
                        preventionStrategies: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    strategy: { type: Type.STRING },
                                    effectiveness: { type: Type.STRING },
                                    urgency: { type: Type.STRING, enum: ['now', 'soon', 'consider'] }
                                }
                            }
                        },
                        recommendedAction: { type: Type.STRING, enum: ['monitor', 'intervene', 'calm_mode', 'break'] }
                    },
                    required: ['riskLevel', 'confidence', 'riskFactors', 'preventionStrategies', 'recommendedAction']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { riskLevel: 'low', confidence: 0, timeEstimate: '', riskFactors: [], preventionStrategies: [], recommendedAction: 'monitor' };
    }
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
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
                    },
                    required: ['patterns', 'triggers', 'suggestions', 'insight']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return getMockAnalysis();
    }
};

export const analyzeBehaviorVideo = async (base64: string, profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'video/mp4', data: base64 } },
                    { text: "Analyze this video for behavioral triggers and signs of distress or engagement." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        triggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                        insight: { type: Type.STRING }
                    },
                    required: ['patterns', 'triggers', 'suggestions', 'insight']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return getMockAnalysis();
    }
};

export const generateWeeklyReport = async (
    moods: MoodEntry[], 
    behaviors: BehaviorLog[], 
    completions: CompletionLog[], 
    profile: ChildProfile
): Promise<WeeklyReport> => {
    if (!process.env.API_KEY) return { summary: "Great week!", improvements: [], concerns: [], wins: ["Consistent routine"] };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a weekly report for parents. 
                       Moods: ${JSON.stringify(moods)}. 
                       Behaviors: ${JSON.stringify(behaviors)}. 
                       Completions: ${JSON.stringify(completions)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        wins: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['summary', 'wins']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { summary: "Analysis unavailable", improvements: [], concerns: [], wins: [] };
    }
};

export const generateScheduleOptimization = async (
    schedule: Schedule, 
    behaviorLogs: BehaviorLog[], 
    completionLogs: CompletionLog[], 
    profile: ChildProfile
): Promise<ScheduleOptimization> => {
    if (!process.env.API_KEY) return getMockOptimization(schedule);
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Optimize this schedule based on logs to reduce meltdowns and improve time. 
                       Schedule: ${JSON.stringify(schedule)}. 
                       Logs: ${JSON.stringify(behaviorLogs)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scheduleId: { type: Type.STRING },
                        // Note: For complex nested objects like 'optimizedSchedule', we might simplify schema or rely on partial parsing
                        // Here we just ask for the key components to reconstruct or specific fields
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    evidence: { type: Type.STRING },
                                    confidence: { type: Type.NUMBER }
                                }
                            }
                        },
                        predictedImprovement: {
                            type: Type.OBJECT,
                            properties: {
                                completionRate: { type: Type.STRING },
                                avgTime: { type: Type.STRING },
                                stressLevel: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });
        
        const result = JSON.parse(response.text || '{}');
        // Manually constructing the optimized schedule for simplicity in this demo, 
        // normally we would ask AI to return the full schedule structure.
        return {
            ...result,
            scheduleId: schedule.id,
            originalSchedule: schedule,
            optimizedSchedule: schedule // In a real app, apply transformations based on recommendations
        };
    } catch (e) {
        return getMockOptimization(schedule);
    }
};

// --- INTERACTIVE & TOOLS ---

export const generateAACSymbol = async (label: string, language: string): Promise<AACButton> => {
    if (!process.env.API_KEY) return { id: 'mock', label, emoji: '🟦', voice: label, color: 'bg-blue-500', category: 'Custom' };
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create an AAC symbol for "${label}". Return JSON with emoji, color (tailwind class), and voice text.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        voice: { type: Type.STRING },
                        color: { type: Type.STRING },
                        category: { type: Type.STRING }
                    },
                    required: ['label', 'emoji', 'voice', 'color']
                }
            }
        });
        const data = JSON.parse(response.text || '{}');
        return { ...data, id: `custom-${Date.now()}`, category: 'Custom' };
    } catch (e) {
        return { id: `err-${Date.now()}`, label, emoji: '❓', voice: label, color: 'bg-gray-500', category: 'Custom' };
    }
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Take 3 deep breaths", "Ask for a hug"];
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest 3 simple coping strategies for a ${profile.age} year old who is feeling ${mood}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return JSON.parse(response.text || '[]');
    } catch (e) {
        return ["Count to 10", "Squeeze a pillow"];
    }
};

export const generateEmotionQuiz = async (age: number, level: number, language: string = 'English', lastTopic?: string): Promise<QuizQuestion> => {
    if (!process.env.API_KEY) return getMockQuiz();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a multiple choice emotion quiz question for a ${age} year old (Level ${level}). 
                       Language: ${language}.
                       Avoid topic: ${lastTopic || 'none'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        hint: { type: Type.STRING },
                        explanation: { type: Type.STRING },
                        visualType: { type: Type.STRING, enum: ['face', 'scenario'] },
                        difficultyLevel: { type: Type.NUMBER }
                    },
                    required: ['question', 'emoji', 'options', 'correctAnswer', 'visualType']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return getMockQuiz();
    }
};

export const generateRewards = async (profile: ChildProfile, tokens: number): Promise<RewardItem[]> => {
    if (!process.env.API_KEY) return getMockRewards();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest 4 rewards for a child interested in ${profile.interests.join(', ')}. Tokens available: ${tokens}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            emoji: { type: Type.STRING },
                            cost: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });
        const items = JSON.parse(response.text || '[]');
        return items.map((i: any) => ({ ...i, id: `rew-${Math.random()}` }));
    } catch (e) {
        return getMockRewards();
    }
};

export const generateSocialScenario = async (age: number, language: string = 'English'): Promise<SocialScenario> => {
    if (!process.env.API_KEY) return getMockScenario();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a social scenario practice for a ${age} year old. Language: ${language}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        description: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        options: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    text: { type: Type.STRING },
                                    isAppropriate: { type: Type.BOOLEAN },
                                    feedback: { type: Type.STRING }
                                }
                            }
                        }
                    },
                    required: ['title', 'description', 'options']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return getMockScenario();
    }
};

export const analyzeChildSpeech = async (audioBlob: Blob, profile: ChildProfile): Promise<SpeechAnalysis> => {
    if (!process.env.API_KEY) return {
        rawTranscription: "I want cookie",
        interpretedMeaning: "I am hungry and want a snack.",
        confidence: 0.9,
        aacSymbols: [{ label: "Hungry", emoji: "🍪" }],
        suggestedResponses: ["Here is a cookie"],
        emotionalTone: "Neutral"
    };

    try {
        const base64 = await blobToBase64(audioBlob);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/webm', data: base64 } }, // Assuming webm from browser recorder
                    { text: `Analyze this speech from a ${profile.age} year old autistic child. Interpret intent and suggest AAC symbols.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rawTranscription: { type: Type.STRING },
                        interpretedMeaning: { type: Type.STRING },
                        confidence: { type: Type.NUMBER },
                        aacSymbols: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: { label: { type: Type.STRING }, emoji: { type: Type.STRING } }
                            }
                        },
                        suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        emotionalTone: { type: Type.STRING }
                    },
                    required: ['rawTranscription', 'interpretedMeaning']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error(e);
        return {
             rawTranscription: "Audio processing failed",
             interpretedMeaning: "Could not analyze audio.",
             confidence: 0,
             aacSymbols: [],
             suggestedResponses: [],
             emotionalTone: "Unknown"
        };
    }
};

export const searchAutismResources = async (query: string, language: string = 'English'): Promise<ResearchResult> => {
    if (!process.env.API_KEY) return { answer: "Mock answer about " + query, sources: [] };
    
    // Note: googleSearch tool doesn't support JSON schema output directly usually, so we parse text manually or ask for JSON string.
    // For simplicity in strict mode, we'll try to get text and assume we can parse it or present it as markdown.
    // However, the interface expects ResearchResult structure.
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Answer this question about autism for a parent: "${query}". Return valid JSON with 'answer' and 'sources'. Language: ${language}`,
            config: {
                tools: [{ googleSearch: {} }],
                // Note: Schema not supported with googleSearch in all cases, but we can try without strict schema or parse text
            }
        });
        
        // When using tools, we might get grounding metadata
        const text = response.text || '';
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        // Construct result from grounding chunks if JSON parsing fails or isn't used
        const sources = chunks
            .map(c => c.web ? { title: c.web.title || 'Source', uri: c.web.uri || '' } : null)
            .filter(s => s !== null) as { title: string, uri: string }[];

        // Try to see if model returned JSON in text despite tool use
        try {
            const json = JSON.parse(text);
            if (json.answer) return json;
        } catch(e) {}

        return {
            answer: text,
            sources: sources
        };

    } catch (e) {
        return { answer: "Search unavailable.", sources: [] };
    }
};

export const analyzeRoutineFrame = async (base64: string, instruction: string, profile: ChildProfile): Promise<VideoAnalysisResult> => {
    if (!process.env.API_KEY) return { isOnTask: true, taskProgress: 50, isStuck: false, feedback: "Keep going!", completed: false };
    try {
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                    { text: `Child is supposed to: "${instruction}". Analyze image. Is he doing it? Return JSON.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isOnTask: { type: Type.BOOLEAN },
                        taskProgress: { type: Type.NUMBER },
                        isStuck: { type: Type.BOOLEAN },
                        feedback: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN }
                    },
                    required: ['isOnTask', 'feedback', 'completed']
                }
            }
        });
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { isOnTask: true, taskProgress: 0, isStuck: false, feedback: "", completed: false };
    }
};

export const generateCompanionComment = async (profile: ChildProfile, mode: ConversationMode, context: any): Promise<string> => {
    if (!process.env.API_KEY) return "You are doing great!";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are 'Snap', a friendly robot companion for a ${profile.age} year old. 
                       Mode: ${mode}. Context: ${JSON.stringify(context)}. 
                       Generate a short, encouraging 1-sentence comment.`,
            config: {
                responseMimeType: "text/plain"
            }
        });
        return response.text || "Hello!";
    } catch (e) {
        return "Hi there!";
    }
};

export const validateBuilderRoutine = async (
    steps: string[],
    profile: ChildProfile
): Promise<BuilderFeedback> => {
    if (!process.env.API_KEY) {
        return {
            isValid: true,
            message: "That looks like a great plan!",
            missingSteps: [],
            suggestedOrder: steps
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                A ${profile.age} year old child built this schedule: ${steps.join(', ')}.
                Analyze it for logical order and completeness.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isValid: { type: Type.BOOLEAN },
                        message: { type: Type.STRING },
                        missingSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestedOrder: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ['isValid', 'message', 'missingSteps']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No validation response");
        return JSON.parse(text);

    } catch (e) {
        return {
            isValid: true,
            message: "Great job building your routine!",
            missingSteps: [],
            suggestedOrder: steps
        };
    }
};

// --- MOCK FALLBACKS ---

export const getMockSchedule = (): Omit<Schedule, 'id' | 'createdAt'> => ({
  title: "Morning Routine",
  type: "Morning",
  socialStory: "In the morning, we wake up and get ready.",
  completionCelebration: "Mission Accomplished!",
  missingItems: [],
  steps: [
    { id: '1', emoji: "🛏️", instruction: "Wake up", encouragement: "Good morning!", completed: false },
    { id: '2', emoji: "🦷", instruction: "Brush teeth", encouragement: "Sparkly smile!", completed: false },
  ]
});

export const getMockOptimization = (schedule: Schedule): ScheduleOptimization => ({
    scheduleId: schedule.id,
    originalSchedule: schedule,
    optimizedSchedule: schedule,
    recommendations: [{ type: 'reorder', description: "Move step", reason: "Better flow", evidence: "Data", confidence: 80 }],
    predictedImprovement: { completionRate: "+10%", avgTime: "-2min", stressLevel: "Low" }
});

export const getMockQuiz = (): QuizQuestion => ({
    question: "How does this face look?",
    emoji: "😢",
    options: ["Happy", "Sad", "Angry", "Scared"],
    correctAnswer: "Sad",
    hint: "Tears are falling.",
    explanation: "When we cry, we are usually sad.",
    visualType: 'face',
    difficultyLevel: 1
});

export const getMockScenario = (): SocialScenario => ({
    title: "Sharing Toys",
    description: "Your friend wants to play with your truck.",
    emoji: "🧸",
    options: [
        { text: "Share the truck", isAppropriate: true, feedback: "Great sharing!" },
        { text: "Yell 'NO!'", isAppropriate: false, feedback: "Yelling hurts ears." }
    ]
});

export const getMockAnalysis = (): BehaviorAnalysis => ({
    patterns: ["Morning routine stress"],
    triggers: ["Loud noises"],
    suggestions: ["Use headphones"],
    insight: "Sensory overload likely."
});

export const getMockRewards = (): RewardItem[] => [
    { id: '1', name: 'Sticker', emoji: '⭐', cost: 5 },
    { id: '2', name: 'Extra Play', emoji: '🎮', cost: 10 }
];
