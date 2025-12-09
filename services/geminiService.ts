
import { GoogleGenAI, Type } from "@google/genai";
import { Schedule, ChildProfile, QuizQuestion, SocialScenario, BehaviorLog, BehaviorAnalysis } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

const SYSTEM_INSTRUCTION = `
You are an expert pediatric occupational therapist specializing in autism. 
Your goal is to create visual schedules for children based on images of their environment or objects.
Keep language simple, direct, and positive. Use emojis heavily.
`;

export const generateScheduleFromImage = async (
  imageBase64: string, 
  profile: ChildProfile
): Promise<Omit<Schedule, 'id' | 'createdAt'>> => {
  
  if (!process.env.API_KEY) {
    // Fallback mock data
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          title: "Morning Routine",
          type: "Morning",
          steps: [
            { id: '1', emoji: "🛏️", instruction: "Wake up", encouragement: "Good morning sunshine!", completed: false },
            { id: '2', emoji: "🚽", instruction: "Use bathroom", encouragement: "Great job!", completed: false },
            { id: '3', emoji: "🦷", instruction: "Brush teeth", encouragement: "Sparkly smile!", completed: false },
            { id: '4', emoji: "👕", instruction: "Get dressed", encouragement: "Looking good!", completed: false },
          ]
        });
      }, 2000);
    });
  }

  const prompt = `
    Analyze this image and create a structured visual schedule for a ${profile.age}-year-old child named ${profile.name}.
    The child likes: ${profile.interests.join(', ')}.
    
    Determine the most likely routine type (Morning, Bedtime, Meal, Play, or General).
    Create 4-6 distinct steps based on the objects visible or implied by the context.
    For each step, provide a clear emoji, a simple instruction (max 5 words), and a short, specific encouragement related to their interests if possible.
  `;

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
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Title of the routine (e.g., Morning Time)" },
            type: { type: Type.STRING, enum: ['Morning', 'Bedtime', 'Meal', 'Play', 'General'] },
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
            }
          },
          required: ['title', 'type', 'steps']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const data = JSON.parse(text);
    
    // Add IDs and completed state to steps
    const stepsWithIds = data.steps.map((step: any, index: number) => ({
      ...step,
      id: `step-${Date.now()}-${index}`,
      completed: false
    }));

    return {
      title: data.title,
      type: data.type,
      steps: stepsWithIds
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateEmotionQuiz = async (age: number): Promise<QuizQuestion> => {
    if (!process.env.API_KEY) {
        return {
            question: "How does someone feel when they drop their ice cream?",
            emoji: "🍦😢",
            options: ["Happy", "Sad", "Excited", "Sleepy"],
            correctAnswer: "Sad",
            hint: "Look at the tears!"
        };
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Generate a simple emotion recognition quiz question for a ${age} year old autistic child.`,
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
            contents: `A ${profile.age} year old autistic child is feeling ${mood}. Suggest 3 simple, sensory-friendly coping strategies using emojis.`,
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

export const generateSocialScenario = async (age: number): Promise<SocialScenario> => {
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
          contents: `Generate a simple social scenario for a ${age} year old autistic child to practice social skills. Include feedback for answers.`,
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

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze these behavior logs for a ${profile.age} year old autistic child. Identify patterns and suggestions.\n\nLogs:\n${logsSummary}`,
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
        console.error(e);
        throw e;
    }
};
