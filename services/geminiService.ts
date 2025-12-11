import { GoogleGenAI, Type } from "@google/genai";
import { 
    SocialScenario, AACButton, BehaviorLog, ChildProfile, BehaviorAnalysis, 
    Schedule, ScheduleOptimization, CompletionLog, WeeklyReport, 
    MeltdownPrediction, MoodEntry, QuizQuestion, 
    RewardItem, SpeechAnalysis, ResearchResult, VideoAnalysisResult, 
    ConversationMode, BuilderFeedback, StoryBook, TherapySessionAnalysis, 
    Lesson, LearningPath, EnvironmentScan 
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

// --- MOCK DATA FOR FALLBACKS ---

const getMockScenario = (): SocialScenario => ({
    title: "Sharing Toys",
    description: "Your friend wants to play with your train.",
    emoji: "🚂",
    options: [
        { text: "Say no and push them", isAppropriate: false, feedback: "Pushing hurts." },
        { text: "Take turns", isAppropriate: true, feedback: "Great sharing!" },
        { text: "Hide the train", isAppropriate: false, feedback: "Hiding isn't friendly." }
    ]
});

// --- API FUNCTIONS ---

export const generateSocialScenario = async (age: number, language: string): Promise<SocialScenario> => {
    if (!process.env.API_KEY) return getMockScenario();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate a social scenario for a ${age} year old child. Language: ${language}.
            Include a title, description, an emoji, and 3 options (one correct).
            For each option provide feedback.`,
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
                    }
                }
            }
        });
        return parseJSON(response.text, getMockScenario());
    } catch (e) { return getMockScenario(); }
};

export const generateAACSymbol = async (label: string, language: string): Promise<AACButton> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate an AAC button for "${label}". Language: ${language}. Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        label: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        voice: { type: Type.STRING },
                        color: { type: Type.STRING },
                        category: { type: Type.STRING, enum: ['Core', 'Needs', 'Feelings', 'Actions', 'Social', 'Scenes', 'Custom'] }
                    }
                }
            }
        });
        const data = parseJSON(response.text, { label, emoji: '❓', voice: label, color: 'bg-gray-500', category: 'Custom' });
        return { ...data, id: Date.now().toString() };
    } catch(e) {
        return { id: Date.now().toString(), label, emoji: '❓', voice: label, color: 'bg-gray-500', category: 'Custom' };
    }
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    const prompt = `Analyze these behavior logs for ${profile.name}, age ${profile.age}. 
    Logs: ${JSON.stringify(logs)}. 
    Identify patterns, triggers, and suggest strategies.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
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
        return parseJSON(response.text, { patterns: [], triggers: [], suggestions: [], insight: "Analysis unavailable" });
    } catch(e) {
         return { patterns: [], triggers: [], suggestions: [], insight: "Error analyzing logs." };
    }
};

export const analyzeBehaviorVideo = async (base64Video: string, profile: ChildProfile, mimeType: string): Promise<BehaviorAnalysis> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Video, mimeType: mimeType } },
                    { text: `Analyze this video of ${profile.name}. Describe behavior patterns, potential triggers, and suggestions.` }
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
                    }
                }
            }
        });
        return parseJSON(response.text, { patterns: [], triggers: [], suggestions: [], insight: "Video analysis unavailable" });
    } catch (e) {
        return { patterns: [], triggers: [], suggestions: [], insight: "Error processing video." };
    }
};

export const generateScheduleOptimization = async (
    schedule: Schedule, 
    behaviorLogs: BehaviorLog[], 
    completionLogs: CompletionLog[], 
    profile: ChildProfile
): Promise<ScheduleOptimization> => {
    const prompt = `Optimize this schedule for ${profile.name}.
    Current Schedule: ${JSON.stringify(schedule)}.
    Behavior Logs: ${JSON.stringify(behaviorLogs)}.
    Completion Logs: ${JSON.stringify(completionLogs)}.
    Return a ScheduleOptimization object with recommendations and a new optimized schedule.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Optimization failed");
    }
};

export const generateWeeklyReport = async (
    moodLogs: MoodEntry[],
    behaviorLogs: BehaviorLog[],
    completionLogs: CompletionLog[],
    profile: ChildProfile
): Promise<WeeklyReport> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate a weekly report for ${profile.name}. 
            Moods: ${JSON.stringify(moodLogs)}.
            Behaviors: ${JSON.stringify(behaviorLogs)}.
            Completions: ${JSON.stringify(completionLogs)}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
                        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
                        wins: { type: Type.ARRAY, items: { type: Type.STRING } },
                        suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    }
                }
            }
        });
        return parseJSON(response.text, null);
    } catch(e) {
        throw new Error("Report generation failed");
    }
};

export const generateMicroSteps = async (instruction: string, profile: ChildProfile): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break down the task "${instruction}" into 3-5 simple micro-steps for a child named ${profile.name}. Return a JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return parseJSON(response.text, []);
    } catch(e) {
        return ["Step 1", "Step 2", "Step 3"];
    }
};

export const generateScheduleFromImage = async (base64: string, mimeType: string, profile: ChildProfile, logs: BehaviorLog[]): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64, mimeType: mimeType } },
                    { text: `Create a visual schedule based on this image for ${profile.name}. Identify tasks. Return a Schedule object (without id/createdAt).` }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Schedule generation failed");
    }
};

export const predictMeltdownRisk = async (
    profile: ChildProfile, 
    behaviorLogs: BehaviorLog[], 
    moodLogs: MoodEntry[], 
    currentContext: string | undefined
): Promise<MeltdownPrediction | null> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Predict meltdown risk for ${profile.name}.
            Context: ${currentContext || 'Unknown'}.
            Recent Moods: ${JSON.stringify(moodLogs.slice(-5))}.
            Recent Behaviors: ${JSON.stringify(behaviorLogs.slice(-5))}.
            Return JSON matching MeltdownPrediction interface.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        return null;
    }
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest 3 simple coping strategies for a child named ${profile.name} who is feeling ${mood}. JSON array of strings.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        return parseJSON(response.text, ["Take deep breaths", "Count to ten", "Ask for a hug"]);
    } catch(e) {
        return ["Take deep breaths", "Count to ten", "Ask for a hug"];
    }
};

export const generateEmotionQuiz = async (
    age: number, 
    level: number, 
    language: string, 
    excludeTopic?: string, 
    visualType?: string
): Promise<QuizQuestion> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate a quiz question about emotions for a ${age} year old. Level ${level}. Language ${language}.
            Visual Type: ${visualType || 'emoji'}.
            Exclude topic: ${excludeTopic || 'none'}.
            Return JSON matching QuizQuestion interface.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Quiz generation failed");
    }
};

export const generateRewards = async (profile: ChildProfile, tokens: number): Promise<RewardItem[]> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Suggest rewards for ${profile.name} who likes ${profile.interests.join(',')}. User has ${tokens} tokens. Return JSON array of RewardItem.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, []);
    } catch (e) {
        return [];
    }
};

export const analyzeChildSpeech = async (audioBlob: Blob, profile: ChildProfile): Promise<SpeechAnalysis> => {
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read blob"));
            }
        };
        reader.readAsDataURL(audioBlob);
    });

    const base64Audio = await base64Promise;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            contents: {
                parts: [
                    { inlineData: { data: base64Audio, mimeType: audioBlob.type || 'audio/webm' } },
                    { text: `Analyze this speech from ${profile.name}. Return JSON matching SpeechAnalysis interface.` }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Speech analysis failed");
    }
};

export const searchAutismResources = async (query: string, language: string | undefined): Promise<ResearchResult> => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Answer this question about autism: "${query}". Language: ${language || 'English'}. Include sources.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });
        
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.filter(c => c.web?.uri)
            .map(c => ({ title: c.web?.title || 'Source', uri: c.web?.uri || '' })) || [];
            
        return {
            answer: response.text || "No answer found.",
            sources: sources
        };
    } catch (e) {
        return { answer: "Search unavailable.", sources: [] };
    }
};

export const analyzeRoutineFrame = async (base64Image: string, instruction: string, profile: ChildProfile): Promise<VideoAnalysisResult> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                    { text: `Is the child following the instruction: "${instruction}"? Return JSON matching VideoAnalysisResult.` }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, { isOnTask: false, taskProgress: 0, isStuck: false, feedback: "Keep going!", completed: false });
    } catch (e) {
        return { isOnTask: false, taskProgress: 0, isStuck: false, feedback: "Keep going!", completed: false };
    }
};

export const generateCompanionComment = async (
    profile: ChildProfile, 
    mode: ConversationMode, 
    context: any
): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a short, friendly companion comment for ${profile.name} (age ${profile.age}).
            Mode: ${mode}. Context: ${JSON.stringify(context)}.
            Keep it under 15 words. Encouraging tone.`,
        });
        return response.text?.trim() || "You are doing great!";
    } catch (e) {
        return "You are doing great!";
    }
};

export const validateBuilderRoutine = async (steps: string[], profile: ChildProfile): Promise<BuilderFeedback> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Validate this routine for a child: ${steps.join(', ')}. Return JSON matching BuilderFeedback.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, { isValid: true, message: "Looks good!" });
    } catch (e) {
        return { isValid: true, message: "Looks good!" };
    }
};

export const generateMagicStory = async (topic: string, concern: string, profile: ChildProfile): Promise<StoryBook> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Write a social story for ${profile.name} about ${topic}. Concern: ${concern}.
            Return JSON matching StoryBook interface with 4-6 pages.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        const story = parseJSON(response.text, null);
        return { ...story, id: Date.now().toString(), createdAt: Date.now() };
    } catch (e) {
        throw new Error("Story generation failed");
    }
};

export const analyzeTherapySession = async (
    base64Media: string, 
    mimeType: string, 
    profile: ChildProfile, 
    previousSummary?: string
): Promise<TherapySessionAnalysis> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                     { inlineData: { data: base64Media, mimeType: mimeType } },
                     { text: `Analyze this therapy session for ${profile.name}. Previous context: ${previousSummary || 'None'}. Return JSON matching TherapySessionAnalysis.` }
                ]
            },
            config: {
                 responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Analysis failed");
    }
};

export const generateLessonContent = async (lesson: Lesson, profile: ChildProfile): Promise<any> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate content for lesson "${lesson.title}" (${lesson.type}) for ${profile.name}. Return JSON content appropriate for the type.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, {});
    } catch (e) {
        return {};
    }
};

export const generateLearningPath = async (profile: ChildProfile, skillArea: string): Promise<LearningPath> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create a learning path for ${profile.name} in "${skillArea}". Level 1. Return JSON matching LearningPath.`,
            config: {
                responseMimeType: "application/json"
            }
        });
        const path = parseJSON(response.text, null);
        return { ...path, id: Date.now().toString(), skillArea, currentLevel: 1, progress: 0 };
    } catch (e) {
        throw new Error("Path generation failed");
    }
};

export const scanEnvironment = async (base64Image: string, noiseLevel: number, profile: ChildProfile): Promise<EnvironmentScan> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Image, mimeType: 'image/jpeg' } },
                    { text: `Scan this room environment for ${profile.name}. Noise level is ${noiseLevel}dB. Return JSON matching EnvironmentScan.` }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });
        return parseJSON(response.text, null);
    } catch (e) {
        throw new Error("Scan failed");
    }
};
