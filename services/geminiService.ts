
import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis, ResearchResult, RewardItem } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const getSystemInstruction = (lang: string) => `
You are an expert pediatric occupational therapist specializing in autism. 
Your goal is to create visual schedules and content for children.
ALWAYS generate content in the following language: ${lang}.
Keep language simple, direct, and positive. Use emojis heavily.
`;

export const generateScheduleFromImage = async (
  imageBase64: string, 
  profile: ChildProfile,
  behaviorLogs: BehaviorLog[] = []
): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
  
  if (!process.env.API_KEY) {
    // Fallback mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
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
      }, 2000);
    });
  }

  // Create a summary of past issues to inform the generation
  const relevantLogs = behaviorLogs.slice(-15);
  const behavioralContext = relevantLogs.length > 0 
    ? `PAST BEHAVIORAL HISTORY: The child has recently experienced ${relevantLogs.map(l => l.behavior + ' during ' + (l.trigger || 'tasks')).join(', ')}. Please structure the schedule to avoid these triggers or add calming steps if needed.`
    : "PAST BEHAVIORAL HISTORY: No recent incidents logged.";

  const prompt = `
    Act as an expert pediatric occupational therapist using the "ScheduleSnap" methodology.
    Analyze the provided image to create a highly personalized visual schedule for ${profile.name}, age ${profile.age}.

    Child Profile:
    - Interests: ${profile.interests.join(', ')} (IMPORTANT: Use these to theme the encouragements!)
    - Sensory Profile: ${profile.sensoryProfile.soundSensitivity} sound sensitivity.
    - Output Language: ${profile.language || 'English'}.
    
    ${behavioralContext}

    TASK:
    1. IMAGE ANALYSIS: Deeply analyze the image. Identify the setting and objects present.
    2. MISSING ITEMS: Explicitly list important objects for this routine that are NOT visible in the photo (e.g., if it's a brushing routine but no toothpaste is visible).
    3. SEQUENCING: Create a logical sequence of 4-8 steps.
       - Consider the behavioral history. If there's a history of meltdowns with transitions, add "Check-in" or "Breathing" steps.
    4. STEP CONTENT:
       - Instruction: Clear, simple, action-oriented text.
       - Emoji: A specific visual for the step.
       - Encouragement Options: Generate 3 distinct encouragement phrases. They MUST be themed around the child's interests.
       - Sensory Tip: If a step involves sensory input, provide a brief tip.
    5. SOCIAL STORY: Write a short, motivating 2-sentence story explaining WHY we do this routine.
    6. CELEBRATION: A short, exciting, interest-themed phrase to say when the whole routine is done.
  `;

  // Use Thinking Mode if enabled in profile
  const thinkingConfig = profile.useThinkingMode 
    ? { thinkingConfig: { thinkingBudget: 2048 } } 
    : {};

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
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
            title: { type: Type.STRING, description: "Title of the routine (e.g. Bedtime Mission)" },
            type: { type: Type.STRING, enum: ['Morning', 'Bedtime', 'Meal', 'Play', 'General'] },
            socialStory: { type: Type.STRING, description: "Simple explanation of the routine's purpose" },
            completionCelebration: { type: Type.STRING, description: "Final celebratory message based on interests" },
            missingItems: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of objects needed for the routine but missing from the image"
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  emoji: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  encouragementOptions: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "3 interest-themed encouragement variations"
                  },
                  sensoryTip: { type: Type.STRING, description: "Optional sensory warning or tip" }
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
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateMicroSteps = async (
    instruction: string, 
    profile: ChildProfile
): Promise<string[]> => {
    if (!process.env.API_KEY) {
        return ["First part of task", "Middle part of task", "Final part of task"];
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break down the task "${instruction}" into 3 simple micro-steps for a ${profile.age} year old autistic child. Keep them extremely short. Language: ${profile.language || 'English'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        microSteps: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const text = response.text;
        if (!text) return [];
        return JSON.parse(text).microSteps;
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const generateEmotionQuiz = async (age: number, lang: string = 'English'): Promise<QuizQuestion> => {
    if (!process.env.API_KEY) {
        return {
            question: "How does someone feel when they drop their ice cream?",
            emoji: "🍦😢",
            options: ["Happy", "Sad", "Excited", "Sleepy"],
            correctAnswer: "Sad",
            hint: "Look at the tears!"
        };
    }

    // Force variety by picking a random emotion concept
    const emotions = ["happy", "sad", "angry", "surprised", "scared", "tired", "excited", "bored", "frustrated", "proud", "confused", "shy"];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    const contexts = ["friendship", "school", "home", "playtime", "animals", "weather", "food"];
    const randomContext = contexts[Math.floor(Math.random() * contexts.length)];

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a random emotion recognition quiz question for a ${age} year old autistic child.
            Target Emotion: "${randomEmotion}".
            Context: "${randomContext}".
            Language: ${lang}.
            
            Return:
            1. A question about a situation.
            2. An emoji representation of the situation/feeling.
            3. 4 multiple choice options.
            4. The correct answer.
            5. A hint.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        emoji: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctAnswer: { type: Type.STRING },
                        hint: { type: Type.STRING }
                    },
                    required: ['question', 'emoji', 'options', 'correctAnswer', 'hint']
                }
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("No quiz generated");
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const generateCopingStrategy = async (mood: string, profile: ChildProfile): Promise<string[]> => {
    if (!process.env.API_KEY) return ["Take 3 deep breaths", "Ask for a hug", "Squeeze a stress ball"];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `A ${profile.age} year old autistic child is feeling ${mood}. Suggest 3 simple, sensory-friendly coping strategies using emojis. Language: ${profile.language || 'English'}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        strategies: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const text = response.text;
        if(!text) return ["Breathe in and out 🌬️"];
        return JSON.parse(text).strategies;
    } catch (e) {
        return ["Count to ten 🔢", "Find a quiet spot 🤫", "Drink some water 💧"];
    }
};

export const generateSocialScenario = async (age: number, lang: string = 'English'): Promise<SocialScenario> => {
  if (!process.env.API_KEY) {
      return {
          title: "Sharing Toys",
          description: "Your friend wants to play with your favorite train.",
          emoji: "🚂",
          options: [
              { text: "Scream and hide it", isAppropriate: false, feedback: "That might scare your friend." },
              { text: "Say 'My turn first, then yours'", isAppropriate: true, feedback: "Great job using your words!" },
              { text: "Throw the train", isAppropriate: false, feedback: "Throwing is not safe." }
          ]
      };
  }

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Generate a simple social scenario for a ${age} year old autistic child to practice social skills. Include feedback for answers. Language: ${lang}.`,
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
      if (!text) throw new Error("No scenario generated");
      return JSON.parse(text);
  } catch (e) {
      console.error(e);
      throw e;
  }
};

export const analyzeBehaviorLogs = async (logs: BehaviorLog[], profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) {
        return {
            patterns: ["Meltdowns happen mostly in afternoons", "Transitions are a trigger"],
            triggers: ["Hunger", "Tiredness"],
            suggestions: ["Use visual timer before transitions", "Offer snack before afternoon play"],
            insight: "The child seems to struggle with regulation when energy is low."
        };
    }

    const logsSummary = logs.slice(-20).map(l => `${new Date(l.timestamp).toLocaleString()}: ${l.behavior} (${l.intensity}) triggered by ${l.trigger}`).join('\n');
    
    // Use Deep Thinking Mode if enabled in profile
    const thinkingConfig = profile.useThinkingMode 
      ? { thinkingConfig: { thinkingBudget: 10240 } } 
      : {};

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Perform a Functional Behavioral Assessment (FBA) simulation for a ${profile.age} year old autistic child based on these logs.
            
            Logs:
            ${logsSummary}
            
            Task:
            1. Identify the 'Function' of the behavior (Sensory, Escape, Attention, Tangible).
            2. Detect temporal patterns.
            3. Provide specific antecedant interventions.
            
            Language: ${profile.language || 'English'}.`,
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
        if (!text) throw new Error("No analysis generated");
        return JSON.parse(text);
    } catch (e) {
        console.error(e);
        throw e;
    }
};

export const analyzeBehaviorVideo = async (videoBase64: string, profile: ChildProfile): Promise<BehaviorAnalysis> => {
    if (!process.env.API_KEY) {
         return {
            patterns: ["Rapid repetitive movements observed", "Signs of sensory overload"],
            triggers: ["Loud auditory environment likely"],
            suggestions: ["Provide noise-canceling headphones", "Create a quiet retreat space"],
            insight: "The video indicates a sensory-seeking behavior turning into overload."
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'video/mp4', data: videoBase64 } },
                    { text: `Analyze this video of a ${profile.age} year old autistic child's behavior. Identify potential triggers, the function of the behavior, and calming strategies. Language: ${profile.language || 'English'}.` }
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
        if (!text) throw new Error("No analysis generated");
        return JSON.parse(text);
    } catch (e) {
        console.error("Video analysis failed:", e);
        throw e;
    }
};

export const searchAutismResources = async (query: string, lang: string = 'English'): Promise<ResearchResult> => {
  if (!process.env.API_KEY) {
      return {
          answer: "Autism, or autism spectrum disorder (ASD), refers to a broad range of conditions characterized by challenges with social skills, repetitive behaviors, speech and nonverbal communication.",
          sources: [{ title: "Autism Speaks", uri: "https://www.autismspeaks.org" }]
      };
  }

  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Answer this question about autism for a parent. Language: ${lang}. Query: ${query}`,
          config: {
              tools: [{ googleSearch: {} }]
          }
      });
      
      const text = response.text || "I couldn't find information on that.";
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = chunks
        .map((chunk: any) => chunk.web)
        .filter((web: any) => web)
        .map((web: any) => ({ title: web.title, uri: web.uri }));

      return { answer: text, sources };
  } catch (e) {
      console.error(e);
      throw e;
  }
};

export const generateRewards = async (profile: ChildProfile, tokens: number): Promise<RewardItem[]> => {
    if (!process.env.API_KEY) {
        return [
            { id: '1', name: `Watch ${profile.interests[0] || 'Cartoons'}`, emoji: "📺", cost: 2 },
            { id: '2', name: "Play on Tablet", emoji: "📱", cost: 5 },
            { id: '3', name: "Special Snack", emoji: "🍪", cost: 8 },
            { id: '4', name: "New Toy", emoji: "🧸", cost: 15 },
        ];
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate 6 personalized rewards for a ${profile.age} year old autistic child who loves: ${profile.interests.join(', ')}. 
            Language: ${profile.language || 'English'}.
            Current Tokens: ${tokens}.
            Create a variety of low cost (2-5) and high cost (10-20) rewards.
            Returns JSON array of rewards.`,
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
        if (!text) return [];
        const data = JSON.parse(text);
        return data.rewards.map((r: any, i: number) => ({ ...r, id: `rew-${Date.now()}-${i}` }));

    } catch (e) {
        console.error("Reward generation failed:", e);
        return [];
    }
};

/**
 * Agentic capability: Autonomously improves a schedule based on logs and profile.
 * Uses High Thinking Budget to reason about friction points.
 */
export const optimizeSchedule = async (
  schedule: Schedule,
  logs: BehaviorLog[],
  profile: ChildProfile
): Promise<Schedule> => {
  if (!process.env.API_KEY) {
     return new Promise(resolve => setTimeout(() => resolve({
         ...schedule,
         title: schedule.title + " (Agent Improved)",
         socialStory: schedule.socialStory + " Now with calm breaths.",
         steps: [
             { id: 'opt-1', emoji: '🧘', instruction: 'Take a calm breath', encouragement: 'Ready for next step', completed: false },
             ...schedule.steps
         ]
     }), 2000));
  }

  const recentLogs = logs.slice(-15).map(l => 
    `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.behavior} (${l.intensity}) - Trigger: ${l.trigger || 'Unknown'}`
  ).join('\n');

  const prompt = `
    You are an autonomous AI agent specializing in pediatric occupational therapy.
    Your goal is to OPTIMIZE a visual schedule for a ${profile.age}-year-old autistic child to reduce maladaptive behaviors and improve independence.

    Current Schedule:
    ${JSON.stringify(schedule.steps.map(s => `${s.emoji} ${s.instruction}`))}

    Child Profile:
    Interests: ${profile.interests.join(', ')}
    Sensory Needs: ${JSON.stringify(profile.sensoryProfile)}
    Output Language: ${profile.language || 'English'}

    Recent Behavioral Issues (use this context to find friction points):
    ${recentLogs || "No specific recent logs, please optimize for general engagement and sensory regulation based on profile."}

    TASK:
    1. Analyze potential friction points in the routine.
    2. Suggest improvements (e.g., inserting sensory breaks, breaking down complex steps, reordering, changing encouragements to interest-based ones).
    3. Return the COMPLETE updated schedule JSON.

    Use "Thinking Mode" to deeply analyze the function of behavior before generating the schedule.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 8192 }, // Deep Agentic Thought
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             reasoning: { type: Type.STRING, description: "Agent's chain of thought explaining why changes were made" },
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
    if (!text) throw new Error("No optimization generated");
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
    console.error("Optimization failed:", error);
    throw error;
  }
};

export const transcribeAudio = async (audioBlob: Blob, language: string = 'English'): Promise<string> => {
  if (!process.env.API_KEY) {
      return new Promise(resolve => setTimeout(() => resolve("Simulated transcription: I want apple juice please."), 1000));
  }

  try {
      // Convert Blob to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
              const result = reader.result as string;
              // Remove data url prefix (e.g. "data:audio/webm;base64,")
              const base64 = result.split(',')[1];
              resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
      });
      
      const base64Audio = await base64Promise;

      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
              parts: [
                  { inlineData: { mimeType: audioBlob.type || 'audio/webm', data: base64Audio } },
                  { text: `Please transcribe the spoken audio accurately in the following language: ${language}. If there is no distinct speech, describe the audio (e.g. [Crying], [Laughter], [Background Noise]).` }
              ]
          }
      });
      
      return response.text || "";
  } catch (e) {
      console.error("Transcription error:", e);
      return "Transcription unavailable.";
  }
};
