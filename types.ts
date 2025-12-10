
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

// NEW: Speech Interpretation Types
export interface AACSymbol {
  label: string;
  emoji: string;
}

export interface SpeechAnalysis {
  rawTranscription: string;      // What was literally said/heard
  interpretedMeaning: string;    // What child likely means
  confidence: number;            // How sure AI is
  aacSymbols: AACSymbol[];       // Visual symbols for the message
  suggestedResponses: string[];  // How parent might respond
  emotionalTone: string;         // Happy, frustrated, urgent, etc.
}

export interface VoiceMessage {
  id: string;
  timestamp: number;
  audioBlob: Blob; 
  transcription?: string; // Keeping for backward compatibility
  analysis?: SpeechAnalysis; // Full AI analysis
  read: boolean; // Track if parent has viewed the message
}

export interface ParentMessage {
    id: string;
    content: string; // text
    type: 'text' | 'audio' | 'video';
    mediaBase64?: string; // For audio/video content
    scheduledTime?: string; // "14:00", if null sends immediately
    timestamp: number;
    isDelivered: boolean;
    isRead: boolean;
    childResponse?: string; // Emoji response like '❤️'
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

// NEW: Meltdown Prediction Types
export interface MeltdownPrediction {
  riskLevel: 'low' | 'medium' | 'high' | 'imminent';
  confidence: number;         // 0-100%
  timeEstimate: string;       // "within 30 minutes"
  
  riskFactors: {
    factor: string;           // "Time of day pattern"
    contribution: number;     // How much this affects risk (0-10)
    evidence: string;         // "3 of 5 meltdowns at this time"
  }[];

  preventionStrategies: {
    strategy: string;         // "Offer a snack"
    effectiveness: string;    // "Worked 4 of 5 times"
    urgency: 'now' | 'soon' | 'consider';
  }[];

  recommendedAction: 'monitor' | 'intervene' | 'calm_mode' | 'break';
}

// NEW: Agentic Optimization Types
export type OptimizationType = 'reorder' | 'add_break' | 'split_step' | 'combine_steps' | 'adjust_time' | 'add_warning' | 'remove_step';

export interface ScheduleOptimization {
  scheduleId: string;
  originalSchedule: Schedule;
  optimizedSchedule: Schedule;
  
  recommendations: {
    type: OptimizationType;
    description: string;       // "Move 'Get Dressed' before 'Brush Teeth'"
    reason: string;            // "Alex completes faster when dressed first"
    evidence: string;          // "3 of 5 faster completions had this order"
    confidence: number;        // 85%
  }[];

  predictedImprovement: {
    completionRate: string;    // "+15% likely"
    avgTime: string;           // "-5 minutes estimated"
    stressLevel: string;       // "Lower stress predicted"
  };
}

export interface BuilderFeedback {
    isValid: boolean;
    message: string;
    missingSteps?: string[];
    suggestedOrder?: string[];
}

// NEW: Magic Books Types
export interface StoryPage {
  text: string;
  emoji: string;
  color: string; // Tailwind bg class
}

export interface StoryBook {
  id: string;
  title: string;
  topic: string;
  coverEmoji: string;
  pages: StoryPage[];
  createdAt: number;
}

// NEW: Voice Companion Modes
export type ConversationMode = 'routine_guide' | 'encouragement' | 'calm_support' | 'learning' | 'play' | 'transition_prep';

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
  RESEARCH = 'research',
  KIDS_BUILDER = 'kids-builder',
  MAGIC_BOOKS = 'magic-books',
  PARENT_INBOX = 'parent-inbox' // New View
}

export interface AppState {
  view: ViewState;
  activeScheduleId: string | null;
  schedules: Schedule[];
  profile: ChildProfile;
  isAACOpen: boolean;
  isHighContrast: boolean;
  tokens: number;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  completionLogs: CompletionLog[]; 
  voiceMessages: VoiceMessage[];
  quizStats: QuizStats;
  meltdownRisk?: 'Low' | 'Medium' | 'High'; // Simple legacy flag, kept for backward compatibility
  caregiverPin?: string;
  customAACButtons: AACButton[]; 
  latestPrediction?: MeltdownPrediction | null;
  stories: StoryBook[];
  parentMessages: ParentMessage[]; // New state for parent messages
}
