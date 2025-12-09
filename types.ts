
export interface ScheduleStep {
  id: string;
  emoji: string;
  instruction: string;
  encouragement: string;
  completed: boolean;
}

export interface Schedule {
  id: string;
  title: string;
  type: 'Morning' | 'Bedtime' | 'Meal' | 'Play' | 'General';
  steps: ScheduleStep[];
  createdAt: number;
}

export interface ChildProfile {
  name: string;
  age: number;
  interests: string[];
  sensoryProfile: {
    soundSensitivity: 'low' | 'medium' | 'high';
  };
}

export interface MoodEntry {
  id: string;
  timestamp: number;
  mood: 'Happy' | 'Okay' | 'Sad' | 'Angry' | 'Tired' | 'Scared';
  note?: string;
}

export interface BehaviorLog {
  id: string;
  timestamp: number;
  behavior: string;
  intensity: 'Mild' | 'Moderate' | 'Severe';
  trigger?: string;
}

export interface QuizQuestion {
  question: string;
  emoji: string;
  options: string[];
  correctAnswer: string;
  hint: string;
}

export interface SocialScenario {
  title: string;
  description: string;
  emoji: string;
  options: {
    text: string;
    isAppropriate: boolean;
    feedback: string;
  }[];
}

export interface BehaviorAnalysis {
  patterns: string[];
  triggers: string[];
  suggestions: string[];
  insight: string;
}

export interface AppState {
  view: 'home' | 'camera' | 'schedule-runner' | 'dashboard' | 'calm' | 'preview' | 'mood' | 'quiz' | 'store' | 'coach' | 'social';
  activeScheduleId: string | null;
  schedules: Schedule[];
  profile: ChildProfile;
  isAACOpen: boolean;
  tokens: number;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
}

export enum ViewState {
  HOME = 'home',
  CAMERA = 'camera',
  PREVIEW = 'preview',
  RUNNER = 'schedule-runner',
  DASHBOARD = 'dashboard',
  CALM = 'calm',
  MOOD = 'mood',
  QUIZ = 'quiz',
  STORE = 'store',
  COACH = 'coach',
  SOCIAL = 'social'
}
