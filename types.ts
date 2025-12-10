
export interface ScheduleStep {
  id: string;
  emoji: string;
  instruction: string;
  encouragement: string;
  encouragementOptions?: string[]; // New: Variations
  sensoryTip?: string; // New: Sensory warning/tip
  completed: boolean;
  subSteps?: { id: string; text: string; completed: boolean }[];
}

export interface Schedule {
  id: string;
  title: string;
  type: 'Morning' | 'Bedtime' | 'Meal' | 'Play' | 'General';
  steps: ScheduleStep[];
  socialStory: string;
  completionCelebration?: string; // New: Interest-themed completion message
  missingItems?: string[]; // New: Objects needed but not found in image
  scheduledTime?: string; // New: "08:00", "19:30"
  createdAt: number;
}

export interface ChildProfile {
  name: string;
  age: number;
  interests: string[];
  language: string;
  sensoryProfile: {
    soundSensitivity: 'low' | 'medium' | 'high';
  };
  audioPreferences?: {
    speechRate: number; // 0.5 to 1.5
    pitch: number;      // 0.5 to 1.5
  };
  useThinkingMode?: boolean; // New: Enable deep reasoning
  defaultCameraOn?: boolean; // New: Default to AI Vision mode
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

// New: Track routine completions for analytics
export interface CompletionLog {
  id: string;
  scheduleId: string;
  scheduleTitle: string;
  timestamp: number;
}

export interface QuizQuestion {
  question: string;
  emoji: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string; // New: Educational feedback
  visualType: 'face' | 'scenario'; // New: Determines layout
  difficultyLevel: number;
}

export interface QuizStats {
  level: number;
  xp: number;
  totalAnswered: number;
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

export interface WeeklyReport {
  summary: string;
  improvements: string[];
  concerns: string[];
  wins: string[];
}

export interface VoiceMessage {
  id: string;
  timestamp: number;
  audioBlob: Blob; 
  transcription?: string;
  read: boolean; // Track if parent has viewed the message
}

export interface ResearchResult {
  answer: string;
  sources: { title: string; uri: string }[];
}

export interface RewardItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
}

// New AAC Types
export type AACCategoryType = 'Core' | 'Needs' | 'Feelings' | 'Actions' | 'Social' | 'Scenes' | 'Custom';

export interface AACButton {
  id: string;
  label: string;
  emoji: string;
  voice: string;
  color: string;
  category: AACCategoryType;
}

export interface VisualScene {
  id: string;
  name: string;
  emoji: string;
  vocabulary: AACButton[];
}

export interface VideoAnalysisResult {
  isOnTask: boolean;
  taskProgress: number; // 0-100
  isStuck: boolean;
  feedback: string;
  completed: boolean;
}

export interface AppState {
  view: 'home' | 'camera' | 'schedule-runner' | 'dashboard' | 'calm' | 'preview' | 'mood' | 'quiz' | 'store' | 'coach' | 'social' | 'voice-recorder' | 'timer' | 'research';
  activeScheduleId: string | null;
  schedules: Schedule[];
  profile: ChildProfile;
  isAACOpen: boolean;
  isHighContrast: boolean;
  tokens: number;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  completionLogs: CompletionLog[]; // New: For analytics
  voiceMessages: VoiceMessage[];
  quizStats: QuizStats;
  meltdownRisk?: 'Low' | 'Medium' | 'High';
  caregiverPin?: string;
  customAACButtons: AACButton[]; // New: Persist custom buttons
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
  SOCIAL = 'social',
  VOICE_RECORDER = 'voice-recorder',
  TIMER = 'timer',
  RESEARCH = 'research'
}
