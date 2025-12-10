
import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis, ResearchResult, RewardItem, AACButton, MoodEntry, CompletionLog, WeeklyReport, VideoAnalysisResult, MeltdownPrediction, SpeechAnalysis, ScheduleOptimization } from "../types";

// Initialize Gemini Client
// Use a dummy key if missing to prevent initialization errors, checking process.env.API_KEY before calls.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || 'dummy_key_for_init' });

const getSystemInstruction = (lang: string) => `
You are an expert pediatric occupational therapist specializing in autism. 
Your goal is to create visual schedules and content for children.
ALWAYS generate content in the following language: ${lang}.
Keep language simple, direct, and positive. Use emojis heavily.
`;

// --- MOCK DATA GENERATORS ---
const getMockSchedule = (): Omit<Schedule, 'id' | 'createdAt'> => ({
  title: "Morning Routine",
  type: "Morning",
  socialStory: "In the morning, we wake up and get ready. We do things in order so we feel happy and ready to play!",
  completionCelebration: "Mission Accomplished! You are a superstar!",
  missingItems: ["Toothbrush", "Towel"],
  steps: [
    { id: '1', emoji: "🛏️", instruction: "Wake up", encouragement: "Good morning sunshine!", sensoryTip: "Stretch under warm covers", completed: false },
    { id: '2', emoji: "🚽", instruction: "Use bathroom", encouragement: "Great job!", completed: false },
    { id: '3', emoji: "🦷", instruction: "Brush teeth", encouragement: "Sparkly smile!", sensoryTip: "Minty fresh tingle", completed: false },
    { id: '4', emoji: "👕", instruction: "Get dressed", encouragement: "Looking good!", completed: false },
  ]
});

const getMockOptimization = (schedule: Schedule): ScheduleOptimization => ({
    scheduleId: schedule.id,
    originalSchedule: schedule,
    optimizedSchedule: {
        ...schedule,
        steps: [
            schedule.steps[0],
            { id: 'new-break', emoji: '🧘', instruction: 'Take 3 Breaths', encouragement: 'Calm body', completed: false },
            schedule.steps[2],
            schedule.steps[1], // Swapped
            schedule.steps[3]
        ]
    },
    recommendations: [
        {
            type: 'add_break',
            description: "Added a 'Breathing Break' after Waking Up",
            reason: "Logs show anxiety spikes immediately after waking.",
            evidence: "2 meltdowns recorded at 7:05 AM this week.",
            confidence: 90
        },
        {
            type: 'reorder',
            description: "Moved 'Brush Teeth' before 'Use Bathroom'",
            reason: "Optimizing flow based on sensory preference.",
            evidence: "General best practice for this profile.",
            confidence: 75
        }
    ],
    predictedImprovement: {
        completionRate: "+20% Likely",
        avgTime: "-5 mins",
        stressLevel: "Significantly Lower"
    }
});

const getMockQuiz = (level: number = 1, avoid?: string): QuizQuestion => {
    const basicEmotions = [
        { name: "Happy", emoji: "😊", hint: "Look for the smile." },
        { name: "Sad", emoji: "😢", hint: "Look for the frown." },
        { name: "Angry", emoji: "😠", hint: "Look for the eyebrows." },
        { name: "Surprised", emoji: "😠", hint: "Look for the open mouth." },
        { name: "Silly", emoji: "🤪", hint: "Look for the tongue." }
    ];

    // Filter out the 'avoid' emotion if possible
    const available = basicEmotions.filter(e => e.name !== avoid);
    const target = available[Math.floor(Math.random() * available.length)];
    
    // Generate simple wrong options
    const others = basicEmotions.filter(e => e.name !== target.name).map(e => e.name);
    const wrongOptions = others.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [target.name, ...wrongOptions].sort(() => 0.5 - Math.random());

    if (level === 1) {
        return {
            question: `Which face looks ${target.name.toUpperCase()}?`,
            emoji: target.emoji,
            options: options,
            correctAnswer: target.name,
            hint: target.hint,
            explanation: `The face has specific features like a ${target.name === 'Happy' ? 'smile' : 'frown'} that show it is ${target.name}.`,
            visualType: 'face',
            difficultyLevel: level
        };
    } else {
        return {
            question: "You dropped your ice cream. How do you feel?",
            emoji: "🍦⬇️😢",
            options: ["Happy", "Sad", "Excited", "Sleepy"],
            correctAnswer: "Sad",
            hint: "Think about losing something yummy.",
            explanation: "When we lose something we like, we usually feel Sad.",
            visualType: 'scenario',
            difficultyLevel: level
        };
    }
};

const getMockScenario = (): SocialScenario => ({
    title: "Sharing Toys",
    description: "Your friend wants to play with your favorite train.",
    emoji: "🚂",
    options: [
        { text: "Scream and hide it", isAppropriate: false, feedback: "That might scare your friend." },
        { text: "Say 'My turn first, then yours'", isAppropriate: true, feedback: "Great job using your words!" },
        { text: "Throw the train", isAppropriate: false, feedback: "Throwing is not safe." }
    ]
});

const getMockAnalysis = (): BehaviorAnalysis => ({
    patterns: ["Meltdowns happen mostly in afternoons", "Transitions are a trigger"],
    triggers: ["Hunger", "Tiredness"],
    suggestions: ["Use visual timer before transitions", "Offer snack before afternoon play"],
    insight: "The child seems to struggle with regulation when energy is low."
});

const getMockRewards = (): RewardItem[] => [
    { id: '1', name: "Watch Cartoons", emoji: "📺", cost: 2 },
    { id: '2', name: "Play on Tablet", emoji: "📱", cost: 5 },
    { id: '3', name: "Special Snack", emoji: "🍪", cost: 8 },
    { id: '4', name: "New Toy", emoji: "🧸", cost: 15 },
];

export const generateScheduleFromImage = async (
  base64Data: string, 
  mimeType: string,
  profile: ChildProfile,
  behaviorLogs: BehaviorLog[] = []
): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
  
  if (!process.env.API_KEY) {
    return new Promise((resolve) => setTimeout(() => resolve(getMockSchedule()), 2000));
  }

  const relevantLogs = behaviorLogs.slice(-15);
  const behavioralContext = relevantLogs.length > 0 
    ? `PAST BEHAVIORAL HISTORY: The child has recently experienced ${relevantLogs.map(l => l.behavior + ' during ' + (l.trigger || 'tasks')).join(', ')}. Please structure the schedule to avoid these triggers or add calming steps if needed.`
    : "PAST BEHAVIORAL HISTORY: No recent incidents logged.";

  const isVideo = mimeType.startsWith('video');
  const mediaContext = isVideo 
    ? "VIDEO ANALYSIS: You are analyzing a video of a routine or environment. Watch the video to identify the sequence of actions or the setting layout."
    : "IMAGE ANALYSIS: Deeply analyze the image. Identify the setting and objects present.";

  const prompt = `
    Act as an expert pediatric occupational therapist using the "ScheduleSnap" methodology.
    Analyze the provided media to create a highly personalized visual schedule for ${profile.name}, age ${profile.age}.

    Child Profile:
    - Interests: ${profile.interests.join(', ')} (IMPORTANT: Use these to theme the encouragements!)
    - Sensory Profile: ${profile.sensoryProfile.soundSensitivity} sound sensitivity.
    - Output Language: ${profile.language || 'English'}.
    
    ${behavioralContext}

    TASK:
    1. ${mediaContext}
    2. MISSING ITEMS: Explicitly list important objects for this routine that are NOT visible (e.g., if it's a brushing routine but no toothpaste is visible).
    3. SEQUENCING: Create a logical sequence of 4-8 steps based on the visual evidence.
       - Consider the behavioral history. If there's a history of meltdowns with transitions, add "Check-in" or "Breathing" steps.
    4. STEP CONTENT:
       - Instruction: Clear, simple, action-oriented text.
       - Emoji: A specific visual for the step.
       - Encouragement Options: Generate 3 distinct encouragement phrases. They MUST be themed around the child's interests.
       - Sensory Tip: If a step involves sensory input, provide a brief tip.
    5. SOCIAL STORY: Write a short, motivating 2-sentence story explaining WHY we do this routine.
    6. CELEBRATION: A short, exciting, interest-themed phrase to say when the whole routine is done.
  `;

  const thinkingConfig = profile.useThinkingMode 
    ? { thinkingConfig: { thinkingBudget: 2048 } } 
    : {};

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        ...thinkingConfig,
        systemInstruction: getSystemInstruction(profile.language || 'English'),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            type: { type: Type.STRING, enum: ['Morning', 'Bedtime', 'Meal', 'Play', 'General'] },
            socialStory: { type: Type.STRING },
            completionCelebration: { type: Type.STRING },
            missingItems: { type: Type.ARRAY, items: { type: Type.STRING } },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emoji: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  encouragementOptions: { type: Type.ARRAY, items: { type: Type.STRING } },
                  sensoryTip: { type: Type.STRING }
                },
                required: ['emoji', 'instruction', 'encouragementOptions']
              }
            }
          },
          required: ['title', 'type', 'socialStory', 'steps', 'completionCelebration', 'missingItems']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text);
    
    const stepsWithIds = data.steps.map((step: any, index: number) => ({
      ...step,
      id: `step-${Date.now()}-${index}`,
      encouragement: step.encouragementOptions?.[0] || "Great job!",
      encouragementOptions: step.encouragementOptions || ["Good job!"],
      sensoryTip: step.sensoryTip,
      completed: false
    }));

    return {
      title: data.title,
      type: data.type,
      socialStory: data.socialStory,
      completionCelebration: data.completionCelebration || "You did it!",
      missingItems: data.missingItems || [],
      steps: stepsWithIds
    };

  } catch (error) {
    console.warn("Gemini API Error (Falling back to mock):", error);
    return getMockSchedule();
  }
};

export const generateMicroSteps = async (
    instruction: string, 
    profile: ChildProfile
): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Start", "Do it", "Finish"];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break down "${instruction}" into 3 micro-steps for a ${profile.age}yo child. Language: ${profile.language || 'English'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { microSteps: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
            }
        });
        const text = response.text;
        if (!text) return ["Start", "Do it", "Finish"];
        return JSON.parse(text).microSteps;
    } catch (e) {
        return ["Start", "Do it", "Finish"];
    }
};

export const generateEmotionQuiz = async (age: number, level: number = 1, lang: string = 'English', avoidTopic?: string): Promise<QuizQuestion> => {
    if (!process.env.API_KEY) return getMockQuiz(level, avoidTopic);

    let prompt = `Generate a RANDOM emotion quiz for ${age}yo child. Level: ${level}. Language: ${lang}.`;
    
    if (avoidTopic) {
        prompt += ` STRICTLY EXCLUDE the emotion or answer: "${avoidTopic}". Please choose a DIFFERENT emotion to ensure variety.`;
    }

    if (level === 1) {
        prompt += ` Focus on identifying basic emotions (Happy, Sad, Angry, Scared, Surprised, Silly, Tired, Excited). 
        Visual Type: 'face'. 
        The question should be "Which face shows [Emotion]?" or "How does this face feel?". 
        Emoji should be a single large face.`;
    } else if (level === 2) {
        prompt += ` Focus on simple cause-and-effect. 
        Visual Type: 'scenario'.
        The question should describe a simple event (e.g., "You dropped your ice cream", "You got a present").
        Emoji should be a sequence (e.g., "🍦⬇️").
        Emotions: Happy, Sad, Angry, Scared, Excited, Tired, Bored.`;
    } else {
        prompt += ` Focus on complex social situations.
        Visual Type: 'scenario'.
        The question should be a short social story (e.g., "Your friend didn't say hi to you").
        Emotions: Frustrated, Disappointed, Proud, Jealous, Overwhelmed, Confused.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
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
                        explanation: { type: Type.STRING, description: "Educational feedback explaining WHY it is this emotion, citing facial cues or situation." },
                        visualType: { type: Type.STRING, enum: ['face', 'scenario'] }
                    },
                    required: ['question', 'emoji', 'options', 'correctAnswer', 'hint', 'explanation', 'visualType']
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No quiz");
        const data = JSON.parse(text);
        return { ...data, difficultyLevel: level };
    } catch (e) {
        console.warn("Quiz generation failed, using mock");
        return getMockQuiz(level, avoidTopic);
    }
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Take 3 deep breaths", "Ask for a hug", "Squeeze a stress ball"];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Child feeling ${mood}. 3 sensory strategies. Language: ${profile.language || 'English'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { strategies: { type: Type.ARRAY, items: { type: Type.STRING } } }
                }
            }
        });
        const text = response.text;
        if(!text) throw new Error("No text");
        return JSON.parse(text).strategies;
    } catch (e) {
        return ["Take 3 deep breaths", "Ask for a hug", "Drink water"];
    }
};

export const generateSocialScenario = async (age: number, lang: string = 'English'): Promise<SocialScenario> => {
  if (!process.env.API_KEY) return getMockScenario();

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Social scenario for ${age}yo. Language: ${lang}.`,
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
                              },
                              required: ['text', 'isAppropriate', 'feedback']
                          }
                      }
                  },
                  required: ['title', 'description', 'emoji', 'options']
              }
          }
      });
      
      const text = response.text;
      if (!text) throw new Error("No scenario");
      return JSON.parse(text);
  } catch (e) {
      console.warn("Scenario generation failed, using mock");
      return getMockScenario();
    }
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();

    const logsSummary = logs.slice(-20).map(l => `${new Date(l.timestamp).toLocaleString()}: ${l.behavior} (${l.intensity})`).join('\n');
    const thinkingConfig = profile.useThinkingMode ? { thinkingConfig: { thinkingBudget: 10240 } } : {};

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `FBA analysis for ${profile.age}yo. Logs: ${logsSummary}. Language: ${profile.language}.`,
            config: {
                ...thinkingConfig,
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

        const text = response.text;
        if (!text) throw new Error("No analysis");
        return JSON.parse(text);
    } catch (e) {
        console.warn("Analysis failed, using mock");
        return getMockAnalysis();
    }
};

export const analyzeBehaviorVideo = async (videoBase64: string, profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) return getMockAnalysis();

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'video/mp4', data: videoBase64 } },
                    { text: `Analyze behavior video. ${profile.age}yo child. Language: ${profile.language}.` }
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

        const text = response.text;
        if (!text) throw new Error("No analysis");
        return JSON.parse(text);
    } catch (e) {
        console.warn("Video analysis failed, using mock");
        return getMockAnalysis();
    }
};

export const searchAutismResources = async (query: string, lang: string = 'English'): Promise<ResearchResult> => {
  if (!process.env.API_KEY) {
      return {
          answer: "Autism (ASD) is a developmental condition impacting social skills and communication.",
          sources: [{ title: "Autism Speaks", uri: "https://www.autismspeaks.org" }]
      };
  }

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Answer for parent about autism: ${query}. Language: ${lang}.`,
          config: { tools: [{ googleSearch: {} }] }
      });
      
      const text = response.text || "Information currently unavailable.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks.map((c: any) => c.web).filter((w: any) => w).map((w: any) => ({ title: w.title, uri: w.uri }));

      return { answer: text, sources };
  } catch (e) {
      console.warn("Search failed, using fallback");
      return {
          answer: "We could not reach the search service at this time. Please try again later.",
          sources: []
      };
  }
};

export const generateRewards = async (profile: ChildProfile, tokens: number): Promise<RewardItem[]> => {
    if (!process.env.API_KEY) return getMockRewards();

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `6 rewards for ${profile.age}yo autistic child. Interests: ${profile.interests}. Tokens: ${tokens}. Language: ${profile.language}. JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rewards: { 
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    emoji: { type: Type.STRING },
                                    cost: { type: Type.NUMBER }
                                },
                                required: ['name', 'emoji', 'cost']
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No rewards");
        const data = JSON.parse(text);
        return data.rewards.map((r: any, i: number) => ({ ...r, id: `rew-${Date.now()}-${i}` }));

    } catch (e) {
        return getMockRewards();
    }
};

// Deprecated in favor of generateScheduleOptimization
export const optimizeSchedule = async (
  schedule: Schedule,
  logs: BehaviorLog[],
  profile: ChildProfile
): Promise<Schedule> => {
  const result = await generateScheduleOptimization(schedule, logs, [], profile);
  return result.optimizedSchedule;
};

// NEW: Agentic Optimization Service
export const generateScheduleOptimization = async (
    schedule: Schedule,
    behaviorLogs: BehaviorLog[],
    completionLogs: CompletionLog[],
    profile: ChildProfile
): Promise<ScheduleOptimization> => {
    if (!process.env.API_KEY) {
        return new Promise(resolve => setTimeout(() => resolve(getMockOptimization(schedule)), 1500));
    }

    const context = {
        schedule: schedule,
        profile: { age: profile.age, sensory: profile.sensoryProfile },
        logs: behaviorLogs.slice(-10).map(l => `${l.behavior} at ${new Date(l.timestamp).toLocaleTimeString()}`),
        completions: completionLogs.slice(-10).length
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `
                Act as an AI Behavior Analyst Agent. Analyze this schedule and the provided logs.
                Your goal is to optimize the schedule to reduce friction (meltdowns) and improve completion rates.
                
                Context: ${JSON.stringify(context)}
                
                Task:
                1. Identify friction points.
                2. Hypothesize 2-3 specific improvements (Reordering, Adding Breaks, Adjusting steps).
                3. Create a NEW optimized schedule structure.
                4. Provide specific reasoning and evidence for each change.
                
                Language: ${profile.language || 'English'}.
            `,
            config: {
                thinkingConfig: { thinkingBudget: 8192 },
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        optimizedSchedule: {
                            type: Type.OBJECT,
                            properties: {
                                steps: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            emoji: { type: Type.STRING },
                                            instruction: { type: Type.STRING },
                                            encouragement: { type: Type.STRING }
                                        },
                                        required: ['emoji', 'instruction', 'encouragement']
                                    }
                                },
                                socialStory: { type: Type.STRING },
                                completionCelebration: { type: Type.STRING }
                            },
                            required: ['steps', 'socialStory']
                        },
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    type: { type: Type.STRING, enum: ['reorder', 'add_break', 'split_step', 'combine_steps', 'adjust_time', 'add_warning', 'remove_step'] },
                                    description: { type: Type.STRING },
                                    reason: { type: Type.STRING },
                                    evidence: { type: Type.STRING },
                                    confidence: { type: Type.NUMBER }
                                },
                                required: ['type', 'description', 'reason', 'evidence', 'confidence']
                            }
                        },
                        predictedImprovement: {
                            type: Type.OBJECT,
                            properties: {
                                completionRate: { type: Type.STRING },
                                avgTime: { type: Type.STRING },
                                stressLevel: { type: Type.STRING }
                            },
                            required: ['completionRate', 'avgTime', 'stressLevel']
                        }
                    },
                    required: ['optimizedSchedule', 'recommendations', 'predictedImprovement']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No optimization response");
        const data = JSON.parse(text);

        const newSteps = data.optimizedSchedule.steps.map((s: any, i: number) => ({
            id: `opt-${Date.now()}-${i}`,
            emoji: s.emoji,
            instruction: s.instruction,
            encouragement: s.encouragement,
            encouragementOptions: [s.encouragement],
            completed: false
        }));

        return {
            scheduleId: schedule.id,
            originalSchedule: schedule,
            optimizedSchedule: {
                ...schedule,
                socialStory: data.optimizedSchedule.socialStory || schedule.socialStory,
                completionCelebration: data.optimizedSchedule.completionCelebration || schedule.completionCelebration,
                steps: newSteps
            },
            recommendations: data.recommendations,
            predictedImprovement: data.predictedImprovement
        };

    } catch (e) {
        console.warn("Optimization Failed", e);
        return getMockOptimization(schedule);
    }
};

export const transcribeAudio = async (audioBlob: Blob, language: string = 'English'): Promise<string> => {
  if (!process.env.API_KEY) {
      return new Promise(resolve => setTimeout(() => resolve("Simulated transcription."), 1000));
  }

  try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
      });
      const base64Audio = await base64Promise;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
              parts: [
                  { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } }, // Ensure recorder uses correct mime
                  { text: `Transcribe audio. Language: ${language}.` }
              ]
          }
      });
      
      return response.text || "";
  } catch (e) {
      console.warn("Transcription failed");
      return "Transcription unavailable.";
  }
};

export const generateAACSymbol = async (label: string, language: string): Promise<AACButton> => {
    if (!process.env.API_KEY) {
        return {
            id: `cust-${Date.now()}`,
            label: label,
            emoji: '✨',
            voice: label,
            color: 'bg-pink-500',
            category: 'Custom'
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create an AAC symbol for "${label}". Language: ${language}. Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        emoji: { type: Type.STRING },
                        voice: { type: Type.STRING, description: "Full sentence to speak" },
                        color: { type: Type.STRING, description: "Tailwind background color class (e.g. bg-blue-500, bg-red-500, bg-green-500, bg-yellow-500)" }
                    },
                    required: ['emoji', 'voice', 'color']
                }
            }
        });
        
        const data = JSON.parse(response.text || "{}");
        return {
            id: `cust-${Date.now()}`,
            label: label,
            emoji: data.emoji || '❓',
            voice: data.voice || label,
            color: data.color || 'bg-blue-500',
            category: 'Custom'
        };
    } catch (e) {
        return {
            id: `cust-${Date.now()}`,
            label: label,
            emoji: '✨',
            voice: label,
            color: 'bg-pink-500',
            category: 'Custom'
        };
    }
};

export const generateWeeklyReport = async (
  moodLogs: MoodEntry[],
  behaviorLogs: BehaviorLog[],
  completionLogs: CompletionLog[],
  profile: ChildProfile
): Promise<WeeklyReport> => {
    if (!process.env.API_KEY) {
        return {
            summary: "This week showed steady progress. The child seems happier in the mornings.",
            improvements: ["Morning routine completion up 20%", "Fewer meltdowns reported"],
            concerns: ["Sleep schedule seems irregular"],
            wins: ["Completed 'Bedtime' routine 3 times"]
        };
    }

    const dataContext = {
        moods: moodLogs.slice(-20),
        behaviors: behaviorLogs.slice(-20),
        completions: completionLogs.slice(-20),
        profileName: profile.name,
        age: profile.age
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate weekly progress report. Context: ${JSON.stringify(dataContext)}. Language: ${profile.language || 'English'}.`,
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
                    required: ['summary', 'improvements', 'concerns', 'wins']
                }
            }
        });
        const text = response.text;
        if (!text) throw new Error("No report");
        return JSON.parse(text);
    } catch (e) {
        return {
            summary: "Report generation currently unavailable.",
            improvements: [],
            concerns: [],
            wins: []
        };
    }
};

export const analyzeRoutineFrame = async (
    frameBase64: string,
    instruction: string,
    profile: ChildProfile
): Promise<VideoAnalysisResult> => {
    if (!process.env.API_KEY) {
        // Mock Response
        return {
            isOnTask: true,
            taskProgress: 50,
            isStuck: false,
            feedback: "I see you! Keep going!",
            completed: false
        };
    }

    const prompt = `
        Analyze this image of ${profile.name} (age ${profile.age}) performing a routine.
        Task: "${instruction}".
        
        Is the child performing the task? What is the estimated progress (0-100)?
        Are they stuck or distracted?
        
        Provide a short, 1-sentence encouraging feedback string spoken directly to the child (e.g., "Great brushing!", "Don't forget the top teeth!").
        Language: ${profile.language || 'English'}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: frameBase64 } },
                    { text: prompt }
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
                    required: ['isOnTask', 'taskProgress', 'isStuck', 'feedback', 'completed']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No response");
        return JSON.parse(text);
    } catch (e) {
        console.warn("Video Analysis Failed", e);
        return {
            isOnTask: true,
            taskProgress: 0,
            isStuck: false,
            feedback: "Keep going!",
            completed: false
        };
    }
};

export const predictMeltdownRisk = async (
    profile: ChildProfile,
    behaviorLogs: BehaviorLog[],
    moodLogs: MoodEntry[],
    activeScheduleTitle?: string
): Promise<MeltdownPrediction> => {
    if (!process.env.API_KEY) {
        // Mock low risk if no API
        return {
            riskLevel: 'low',
            confidence: 90,
            timeEstimate: "N/A",
            riskFactors: [],
            preventionStrategies: [],
            recommendedAction: 'monitor'
        };
    }

    const context = {
        time: new Date().toLocaleTimeString(),
        day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        recentBehaviors: behaviorLogs.slice(-10),
        recentMoods: moodLogs.slice(-10),
        activeSchedule: activeScheduleTitle || "None",
        profile: {
            sensory: profile.sensoryProfile,
            interests: profile.interests
        }
    };

    const prompt = `
        You are a child behavior analyst. Based on the provided context, predict the current risk of a meltdown for ${profile.name}.
        Context: ${JSON.stringify(context)}
        
        Analyze patterns in time of day, recent moods, and historical triggers.
        If risk is elevated, suggest specific, actionable prevention strategies based on the child's profile.
        Language: ${profile.language || 'English'}.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
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
                                },
                                required: ['factor', 'contribution', 'evidence']
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
                                },
                                required: ['strategy', 'effectiveness', 'urgency']
                            }
                        },
                        recommendedAction: { type: Type.STRING, enum: ['monitor', 'intervene', 'calm_mode', 'break'] }
                    },
                    required: ['riskLevel', 'confidence', 'timeEstimate', 'riskFactors', 'preventionStrategies', 'recommendedAction']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No prediction");
        return JSON.parse(text);
    } catch (e) {
        console.warn("Prediction failed", e);
        return {
            riskLevel: 'low',
            confidence: 0,
            timeEstimate: "",
            riskFactors: [],
            preventionStrategies: [],
            recommendedAction: 'monitor'
        };
    }
};

export const analyzeChildSpeech = async (
    audioBlob: Blob,
    profile: ChildProfile
): Promise<SpeechAnalysis> => {
    if (!process.env.API_KEY) {
        // Mock Data
        return new Promise(resolve => setTimeout(() => resolve({
            rawTranscription: "wa... wa... pease",
            interpretedMeaning: "I want water please",
            confidence: 85,
            aacSymbols: [
                { label: "Water", emoji: "💧" },
                { label: "Drink", emoji: "🥤" },
                { label: "Please", emoji: "🙏" }
            ],
            suggestedResponses: ["Here is some water.", "Do you want your cup?"],
            emotionalTone: "Calm"
        }), 1500));
    }

    try {
        // Convert Blob to Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(audioBlob);
        });
        const base64Audio = await base64Promise;

        const prompt = `
            You are an expert speech therapist analyzing audio from a ${profile.age} year old child with autism.
            The child may have limited verbal communication, unclear speech, or use echolalia.
            
            Analyze the audio:
            1. Transcribe what was literally heard (even if broken).
            2. Interpret the INTENT (what do they actually want/mean?).
            3. Suggest 1-3 AAC symbols (emoji + label) that represent this message.
            4. Detect emotional tone.
            5. Suggest 2 short responses for the caregiver.
            
            Language: ${profile.language || 'English'}.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'audio/webm', data: base64Audio } }, // Ensure recorder uses correct mime
                    { text: prompt }
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
                                properties: {
                                    label: { type: Type.STRING },
                                    emoji: { type: Type.STRING }
                                },
                                required: ['label', 'emoji']
                            }
                        },
                        suggestedResponses: { type: Type.ARRAY, items: { type: Type.STRING } },
                        emotionalTone: { type: Type.STRING }
                    },
                    required: ['rawTranscription', 'interpretedMeaning', 'confidence', 'aacSymbols', 'suggestedResponses', 'emotionalTone']
                }
            }
        });

        const text = response.text;
        if (!text) throw new Error("No speech analysis");
        return JSON.parse(text);

    } catch (e) {
        console.warn("Speech Analysis Failed", e);
        return {
            rawTranscription: "Audio processing failed",
            interpretedMeaning: "Could not interpret speech",
            confidence: 0,
            aacSymbols: [{ label: "Error", emoji: "⚠️" }],
            suggestedResponses: [],
            emotionalTone: "Unknown"
        };
    }
};
