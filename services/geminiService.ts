
import { GoogleGenAI, Type } from "@google/genai";
import { 
    SocialScenario, AACButton, BehaviorLog, ChildProfile, BehaviorAnalysis, 
    Schedule, ScheduleOptimization, CompletionLog, WeeklyReport, 
    MeltdownPrediction, MoodEntry, QuizQuestion, 
    RewardItem, SpeechAnalysis, ResearchResult, VideoAnalysisResult, 
    ConversationMode, BuilderFeedback, StoryBook, TherapySessionAnalysis, 
    Lesson, LearningPath, EnvironmentScan, ScheduleStep 
} from "../types";

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper for JSON parsing with fallback
const parseJSON = (text: string | undefined, fallback: any) => {
    if (!text) return fallback;
    try {
        // Remove markdown code blocks if present
        const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.error("JSON Parse Error", e);
        return fallback;
    }
};

// --- CONFIGURATION HELPERS ---

// Deep Think configuration - ONLY for Gemini 2.5 models
const getThinkingConfig = (taskType: 'simple' | 'medium' | 'complex' | 'maximum') => {
  const budgets = {
    simple: 1024,      // micro-steps, coping strategies
    medium: 2048,      // schedules, quizzes
    complex: 4096,     // behavior analysis, predictions
    maximum: 8192      // video analysis, agentic tasks
  };
  return { thinkingConfig: { thinkingBudget: budgets[taskType] } };
};

// --- CORE FEATURES ---

export const generateScheduleFromImage = async (
    base64Image: string, 
    mimeType: string,
    profile: ChildProfile, 
    history: BehaviorLog[]
): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
    const prompt = `
    You are an expert pediatric occupational therapist. Create a visual schedule based on this image for a ${profile.age}-year-old child named ${profile.name} who loves ${profile.interests.join(', ')}.
    
    Language: ${profile.language || 'English'}
    
    1. Identify all objects in the image.
    2. Determine the most likely routine (Morning, Bedtime, Meal, Play, etc.).
    3. Create 4-8 logical steps.
    4. For each step, provide a clear instruction and an encouraging phrase related to their interests.
    5. Suggest a social story.
    
    Output JSON.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType, data: base64Image } },
            { text: prompt }
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['Morning', 'Bedtime', 'Meal', 'Play', 'General'] },
                    steps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                emoji: { type: Type.STRING },
                                instruction: { type: Type.STRING },
                                encouragement: { type: Type.STRING },
                                sensoryTip: { type: Type.STRING }
                            }
                        }
                    },
                    socialStory: { type: Type.STRING },
                    completionCelebration: { type: Type.STRING },
                    missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                    scheduledTime: { type: Type.STRING }
                }
            }
        }
    });

    const data = parseJSON(response.text, { title: "New Routine", type: "General", steps: [], socialStory: "" });
    
    // Add local state fields
    data.steps = data.steps.map((s: any, i: number) => ({
        ...s,
        id: `gen-${Date.now()}-${i}`,
        completed: false,
        encouragementOptions: [s.encouragement]
    }));

    return data;
};

export const generateMicroSteps = async (instruction: string, profile: ChildProfile): Promise<string[]> => {
    const prompt = `Break down the task "${instruction}" into 3-5 micro-steps for a ${profile.age}-year-old autistic child. Keep it simple. Return JSON array of strings. Language: ${profile.language}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('simple'),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    return parseJSON(response.text, ["Step 1", "Step 2", "Step 3"]);
};

// --- ADVANCED ANALYSIS (DEEP THINK) ---

export const predictMeltdownRisk = async (
    profile: ChildProfile,
    behaviorLogs: BehaviorLog[],
    moodLogs: MoodEntry[],
    currentActivity?: string
): Promise<MeltdownPrediction> => {
    const prompt = `
    Analyze meltdown risk for ${profile.name}, age ${profile.age}.
    Current Activity: ${currentActivity || 'Unknown'}
    Recent Moods: ${JSON.stringify(moodLogs.slice(-5))}
    Recent Behaviors: ${JSON.stringify(behaviorLogs.slice(-5))}
    Sensory Profile: ${JSON.stringify(profile.sensoryProfile)}
    
    Predict risk level, confidence, and prevention strategies.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
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
                }
            }
        }
    });

    return parseJSON(response.text, { riskLevel: 'low', confidence: 0, riskFactors: [], preventionStrategies: [] });
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    const prompt = `Analyze these behavior logs for patterns and triggers for a child age ${profile.age}. Logs: ${JSON.stringify(logs)}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
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

    return parseJSON(response.text, { patterns: [], triggers: [], suggestions: [], insight: "No data" });
};

export const analyzeBehaviorVideo = async (base64Video: string, profile: ChildProfile, mimeType: string): Promise<BehaviorAnalysis> => {
    const prompt = `Analyze this video of a ${profile.age}-year-old child. Identify antecedents, behaviors, and consequences (ABC data). Suggest functions of behavior.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType, data: base64Video } },
            { text: prompt }
        ],
        config: {
            responseMimeType: 'application/json',
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

    return parseJSON(response.text, { patterns: [], triggers: [], suggestions: [], insight: "Video analysis failed" });
};

export const generateWeeklyReport = async (
    moods: MoodEntry[], 
    behaviors: BehaviorLog[], 
    completions: CompletionLog[], 
    profile: ChildProfile
): Promise<WeeklyReport> => {
    const prompt = `Generate a weekly progress report for ${profile.name}.
    Moods: ${JSON.stringify(moods)}
    Behaviors: ${JSON.stringify(behaviors)}
    Completions: ${JSON.stringify(completions)}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                    concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                    wins: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    return parseJSON(response.text, { summary: "No data", improvements: [], concerns: [], wins: [], suggestions: [] });
};

// --- AGENTIC OPTIMIZATION ---

export const generateScheduleOptimization = async (
    schedule: Schedule,
    behaviorLogs: BehaviorLog[],
    completionLogs: CompletionLog[],
    profile: ChildProfile
): Promise<ScheduleOptimization> => {
    const prompt = `
    Act as an expert scheduler. Optimize this routine for ${profile.name} based on performance history.
    Schedule: ${JSON.stringify(schedule)}
    History: ${JSON.stringify(completionLogs)}
    Behaviors during routine: ${JSON.stringify(behaviorLogs)}
    
    Goal: Increase completion rate and reduce stress.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    recommendations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                type: { type: Type.STRING },
                                description: { type: Type.STRING },
                                reason: { type: Type.STRING },
                                evidence: { type: Type.STRING },
                                confidence: { type: Type.NUMBER },
                                impact: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
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
                    },
                    optimizedSchedule: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            type: { type: Type.STRING },
                            steps: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        id: { type: Type.STRING },
                                        emoji: { type: Type.STRING },
                                        instruction: { type: Type.STRING },
                                        encouragement: { type: Type.STRING },
                                        completed: { type: Type.BOOLEAN }
                                    }
                                }
                            },
                            socialStory: { type: Type.STRING },
                            createdAt: { type: Type.NUMBER }
                        }
                    }
                }
            }
        }
    });

    const result = parseJSON(response.text, null);
    if (result) {
        return {
            scheduleId: schedule.id,
            originalSchedule: schedule,
            optimizedSchedule: result.optimizedSchedule || schedule,
            recommendations: result.recommendations || [],
            predictedImprovement: result.predictedImprovement || { completionRate: "0%", avgTime: "0", stressLevel: "Same" }
        };
    }
    throw new Error("Optimization failed");
};

// --- THERAPY TOOLS ---

export const analyzeTherapySession = async (
    base64Media: string, 
    mimeType: string, 
    profile: ChildProfile,
    previousContext?: string
): Promise<TherapySessionAnalysis> => {
    const prompt = `
    Analyze this therapy session recording for ${profile.name}.
    Previous Context: ${previousContext || 'None'}
    Identify techniques (DTT, NET, etc.), breakthroughs, and challenges.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType, data: base64Media } },
            { text: prompt }
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    duration: { type: Type.NUMBER },
                    summary: { type: Type.STRING },
                    techniquesObserved: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                technique: { type: Type.STRING },
                                effectiveness: { type: Type.STRING },
                                timestamp: { type: Type.STRING }
                            }
                        }
                    },
                    breakthroughMoments: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: { type: Type.STRING },
                                significance: { type: Type.STRING },
                                timestamp: { type: Type.STRING }
                            }
                        }
                    },
                    challengingMoments: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                description: { type: Type.STRING },
                                suggestedApproach: { type: Type.STRING },
                                timestamp: { type: Type.STRING }
                            }
                        }
                    },
                    homePractice: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                activity: { type: Type.STRING },
                                duration: { type: Type.STRING },
                                tips: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    },
                    progressComparedToLastSession: { type: Type.STRING }
                }
            }
        }
    });

    return parseJSON(response.text, { summary: "Analysis failed", techniquesObserved: [], breakthroughMoments: [], challengingMoments: [], homePractice: [], progressComparedToLastSession: "Unknown", duration: 0 });
};

// --- LEARNING & CONTENT ---

export const generateLearningPath = async (profile: ChildProfile, skillArea: string): Promise<LearningPath> => {
    const prompt = `Create a 5-lesson learning path for ${skillArea} for a ${profile.age}-year-old child.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    lessons: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                description: { type: Type.STRING },
                                type: { type: Type.STRING, enum: ['quiz', 'story', 'practice'] },
                                estimatedTime: { type: Type.STRING },
                                emoji: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    const data = parseJSON(response.text, { lessons: [] });
    
    return {
        id: `path-${Date.now()}`,
        skillArea,
        currentLevel: 1,
        progress: 0,
        colorTheme: 'bg-blue-500',
        lessons: data.lessons.map((l: any, i: number) => ({
            ...l,
            id: `lesson-${Date.now()}-${i}`,
            isCompleted: false,
            isLocked: i > 0,
            content: null // Load content lazily
        }))
    };
};

export const generateLessonContent = async (lesson: Lesson, profile: ChildProfile): Promise<any> => {
    const prompt = `Generate content for a ${lesson.type} lesson titled "${lesson.title}" for a ${profile.age}-year-old.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json'
        }
    });

    return parseJSON(response.text, {});
};

export const generateAACSymbol = async (label: string, language: string): Promise<AACButton> => {
    const prompt = `Suggest an emoji, color (Tailwind class), and simple voice phrase for an AAC button labeled "${label}". Language: ${language}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    emoji: { type: Type.STRING },
                    voice: { type: Type.STRING },
                    color: { type: Type.STRING }
                }
            }
        }
    });

    const data = parseJSON(response.text, { emoji: '❓', voice: label, color: 'bg-gray-500' });
    return {
        id: `custom-${Date.now()}`,
        label,
        emoji: data.emoji,
        voice: data.voice,
        color: data.color,
        category: 'Custom'
    };
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
    const prompt = `Suggest 3 simple coping strategies for a ${profile.age}-year-old autistic child feeling ${mood}. Keep it short.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('simple'),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    });

    return parseJSON(response.text, ["Breathe in and out", "Count to 10", "Ask for a hug"]);
};

export const generateEmotionQuiz = async (
    age: number, 
    level: number, 
    language: string, 
    lastTopic?: string,
    visualType: 'emoji' | 'cartoon' | 'photo' = 'emoji'
): Promise<QuizQuestion> => {
    const prompt = `
    Generate an emotion recognition question for a ${age}-year-old (Level ${level}).
    Visual Type: ${visualType}
    Language: ${language}
    Avoid topic: ${lastTopic || 'none'}
    
    Output JSON with: question, emoji (or description if not emoji), options (4), correctAnswer, hint, explanation.
    explanation should include: facialFeatures, bodyLanguage, whyItLooksThisWay.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    emoji: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correctAnswer: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    explanation: {
                        type: Type.OBJECT,
                        properties: {
                            text: { type: Type.STRING },
                            facialFeatures: { type: Type.STRING },
                            bodyLanguage: { type: Type.STRING },
                            whyItLooksThisWay: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    });

    const data = parseJSON(response.text, {
        question: "How is he feeling?",
        emoji: "😊",
        options: ["Happy", "Sad", "Angry", "Tired"],
        correctAnswer: "Happy",
        hint: "Look at the smile",
        explanation: { text: "He is smiling", facialFeatures: "Smile", bodyLanguage: "Relaxed", whyItLooksThisWay: "Good things happened" },
        visualType,
        difficultyLevel: level
    });
    
    data.visualType = visualType;
    return data;
};

export const generateRewards = async (profile: ChildProfile, currentTokens: number): Promise<RewardItem[]> => {
    const prompt = `Suggest 6 rewards for a child who likes ${profile.interests.join(', ')}.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        cost: { type: Type.NUMBER }
                    }
                }
            }
        }
    });

    const data = parseJSON(response.text, []);
    return data.map((r: any, i: number) => ({ ...r, id: `reward-${i}` }));
};

export const generateSocialScenario = async (age: number, language: string): Promise<SocialScenario> => {
    const prompt = `Generate a social scenario for a ${age}-year-old to practice social skills.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json',
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
                }
            }
        }
    });

    return parseJSON(response.text, { title: "Error", description: "Try again", emoji: "⚠️", options: [] });
};

export const analyzeChildSpeech = async (audioBlob: Blob, profile: ChildProfile): Promise<SpeechAnalysis> => {
    // Convert Blob to Base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
    });
    const base64Audio = await base64Promise;

    const prompt = `
    Analyze speech from a ${profile.age}-year-old autistic child.
    Transcribe and interpret intent. Suggest AAC symbols.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
            { text: prompt }
        ],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json',
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
                            properties: {
                                label: { type: Type.STRING },
                                emoji: { type: Type.STRING }
                            }
                        }
                    },
                    suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    emotionalTone: { type: Type.STRING }
                }
            }
        }
    });

    return parseJSON(response.text, { 
        rawTranscription: "Audio processed", 
        interpretedMeaning: "Could not interpret", 
        confidence: 0, 
        aacSymbols: [], 
        suggestedResponses: [], 
        emotionalTone: "Neutral" 
    });
};

export const searchAutismResources = async (query: string, language: string = 'English'): Promise<ResearchResult> => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Research this autism topic: "${query}". Language: ${language}. Provide a summarized answer and sources.`,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const text = response.text || "No results found.";
    // Basic extraction of sources if grounded
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.map((c: any) => ({
        title: c.web?.title || "Source",
        uri: c.web?.uri || "#"
    })).filter((s: any) => s.uri !== "#");

    return { answer: text, sources };
};

export const analyzeRoutineFrame = async (
    base64Image: string, 
    instruction: string, 
    profile: ChildProfile
): Promise<VideoAnalysisResult> => {
    const prompt = `
    Child is supposed to: "${instruction}".
    Analyze image. Is child doing it? Progress?
    Output JSON: isOnTask, taskProgress (0-100), isStuck, feedback (short encouragement), completed (boolean).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
        ],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isOnTask: { type: Type.BOOLEAN },
                    taskProgress: { type: Type.NUMBER },
                    isStuck: { type: Type.BOOLEAN },
                    feedback: { type: Type.STRING },
                    completed: { type: Type.BOOLEAN }
                }
            }
        }
    });

    return parseJSON(response.text, { isOnTask: false, taskProgress: 0, isStuck: false, feedback: "Keep going!", completed: false });
};

export const generateCompanionComment = async (
    profile: ChildProfile, 
    mode: ConversationMode, 
    context: any
): Promise<string> => {
    const prompt = `
    You are Snap, a friendly robot friend for ${profile.name}.
    Mode: ${mode}. Context: ${JSON.stringify(context)}.
    Generate a short, 1-sentence comment.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'text/plain'
        }
    });

    return response.text || "I'm here for you!";
};

export const validateBuilderRoutine = async (steps: string[], profile: ChildProfile): Promise<BuilderFeedback> => {
    const prompt = `
    Child built a routine: ${steps.join(', ')}.
    Is this logical? Return JSON with isValid, message, suggestions.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isValid: { type: Type.BOOLEAN },
                    message: { type: Type.STRING },
                    missingSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedOrder: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        }
    });

    return parseJSON(response.text, { isValid: true, message: "Looks good!", missingSteps: [] });
};

export const generateMagicStory = async (topic: string, concern: string, profile: ChildProfile): Promise<StoryBook> => {
    const prompt = `
    Write a 4-page social story about ${topic} for ${profile.name}.
    Concern to address: ${concern}.
    Return JSON: title, topic, coverEmoji, pages array (text, emoji, color).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ text: prompt }],
        config: {
            ...getThinkingConfig('medium'),
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    topic: { type: Type.STRING },
                    coverEmoji: { type: Type.STRING },
                    pages: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING },
                                emoji: { type: Type.STRING },
                                color: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
    });

    const data = parseJSON(response.text, { title: "My Story", topic, coverEmoji: "📖", pages: [] });
    return { ...data, id: `story-${Date.now()}`, createdAt: Date.now() };
};

export const scanEnvironment = async (
    base64Image: string, 
    noiseLevel: number, 
    profile: ChildProfile
): Promise<EnvironmentScan> => {
    const prompt = `
    Analyze this room for sensory issues for an autistic child.
    Noise Level: ${noiseLevel} dB.
    Output JSON: lightLevel, visualClutter, noiseLevel, colorAnalysis, overallRisk, recommendations.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
            { text: prompt }
        ],
        config: {
            responseMimeType: 'application/json',
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
                }
            }
        }
    });

    return parseJSON(response.text, { 
        lightLevel: 'good', 
        visualClutter: 'low', 
        noiseLevel, 
        colorAnalysis: "Unknown", 
        overallRisk: 'low', 
        recommendations: ["Check manual settings"] 
    });
};
