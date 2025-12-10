
import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis, ResearchResult, RewardItem } from "../types";

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

const getMockQuiz = (level: number = 1, avoid?: string): QuizQuestion => {
    const basicEmotions = [
        { name: "Happy", emoji: "😊", hint: "Look for the smile." },
        { name: "Sad", emoji: "😢", hint: "Look for the frown." },
        { name: "Angry", emoji: "😠", hint: "Look for the eyebrows." },
        { name: "Surprised", emoji: "😲", hint: "Look for the open mouth." },
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

export const optimizeSchedule = async (
  schedule: Schedule,
  logs: BehaviorLog[],
  profile: ChildProfile
): Promise<Schedule> => {
  if (!process.env.API_KEY) {
     return new Promise(resolve => setTimeout(() => resolve({
         ...schedule,
         title: schedule.title + " (Optimized)",
         steps: [
             { id: 'opt-1', emoji: '🧘', instruction: 'Calm breath', encouragement: 'Relax', completed: false },
             ...schedule.steps
         ]
     }), 1000));
  }

  const recentLogs = logs.slice(-15).map(l => `${l.behavior} (${l.intensity})`).join('\n');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: `Optimize schedule for ${profile.age}yo. Schedule: ${JSON.stringify(schedule)}. Logs: ${recentLogs}. Language: ${profile.language}.`,
      config: {
        thinkingConfig: { thinkingBudget: 8192 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             reasoning: { type: Type.STRING },
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
             }
          },
          required: ['reasoning', 'optimizedSchedule']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No optimization");
    const data = JSON.parse(text);

    return {
        ...schedule,
        socialStory: data.optimizedSchedule.socialStory,
        completionCelebration: data.optimizedSchedule.completionCelebration || schedule.completionCelebration,
        steps: data.optimizedSchedule.steps.map((s: any, i: number) => ({
            id: `opt-${Date.now()}-${i}`,
            emoji: s.emoji,
            instruction: s.instruction,
            encouragement: s.encouragement,
            completed: false
        }))
    };
  } catch (error) {
    console.warn("Optimization failed, returning original");
    return schedule;
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
                  { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
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
