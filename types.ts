
export interface ScheduleStep {
  id: string;
  emoji: string;
  instruction: string;
  encouragement: string;
  encouragementOptions?: string[]; 
  sensoryTip?: string; 
  completed: boolean;
  subSteps?: { id: string; text: string; completed: boolean }[];
  imageUrl?: string; // New: Custom photo for the step (Base64)
}

export interface Schedule {
  id: string;
  title: string;
  type: 'Morning' | 'Bedtime' | 'Meal' | 'Play' | 'General';
  steps: ScheduleStep[];
  socialStory: string;
  completionCelebration?: string; 
  missingItems?: string[]; 
  scheduledTime?: string; 
  createdAt: number;
}

export interface ChildProfile {
  id: string; // New: Unique ID for profile switching
  name: string;
  age: number;
  interests: string[];
  language: string;
  sensoryProfile: {
    soundSensitivity: 'low' | 'medium' | 'high';
  };
  audioPreferences?: {
    speechRate: number; 
    pitch: number;      
    voiceId?: string; // New: 'Kore', 'Puck', 'Fenrir', etc.
  };
  useThinkingMode?: boolean; 
  defaultCameraOn?: boolean; 
  showVisualTimer?: boolean; 
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
  explanation: {
      text: string;
      facialFeatures?: string;
      bodyLanguage?: string;
      whyItLooksThisWay?: string;
  };
  visualType: 'face' | 'scenario' | 'emoji' | 'cartoon' | 'photo';
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
  suggestions: string[];
}

export interface AACSymbol {
  label: string;
  emoji: string;
}

export interface SpeechAnalysis {
  rawTranscription: string;      
  interpretedMeaning: string;    
  confidence: number;            
  aacSymbols: AACSymbol[];       
  suggestedResponses: string[];  
  emotionalTone: string;         
}

export interface VoiceMessage {
  id: string;
  timestamp: number;
  audioBlob: Blob; 
  transcription?: string; 
  analysis?: SpeechAnalysis; 
  read: boolean; 
}

export interface ParentMessage {
    id: string;
    content: string; 
    type: 'text' | 'audio' | 'video';
    mediaBase64?: string; 
    mimeType?: string; 
    scheduledTime?: string; 
    timestamp: number;
    isDelivered: boolean;
    isRead: boolean;
    childResponse?: string; 
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
  taskProgress: number; 
  isStuck: boolean;
  feedback: string;
  completed: boolean;
}

export interface MeltdownPrediction {
  riskLevel: 'low' | 'medium' | 'high' | 'imminent';
  confidence: number;         
  timeEstimate: string;       
  
  riskFactors: {
    factor: string;           
    contribution: number;     
    evidence: string;         
  }[];

  preventionStrategies: {
    strategy: string;         
    effectiveness: string;    
    urgency: 'now' | 'soon' | 'consider';
  }[];

  recommendedAction: 'monitor' | 'intervene' | 'calm_mode' | 'break';
}

export type OptimizationType = 'reorder' | 'add_break' | 'split_step' | 'combine_steps' | 'adjust_time' | 'add_warning' | 'remove_step';

export interface ScheduleOptimization {
  scheduleId: string;
  originalSchedule: Schedule;
  optimizedSchedule: Schedule;
  
  recommendations: {
    type: OptimizationType;
    description: string;       
    reason: string;            
    evidence: string;         
    confidence: number;        
    impact: 'high' | 'medium' | 'low'; 
  }[];

  predictedImprovement: {
    completionRate: string;    
    avgTime: string;           
    stressLevel: string;       
  };
}

export interface BuilderFeedback {
    isValid: boolean;
    message: string;
    missingSteps?: string[];
    suggestedOrder?: string[];
}

export interface StoryPage {
  text: string;
  emoji: string;
  color: string; 
}

export interface StoryBook {
  id: string;
  title: string;
  topic: string;
  coverEmoji: string;
  pages: StoryPage[];
  createdAt: number;
}

export interface TherapySessionAnalysis {
  duration: number; 
  summary: string;

  techniquesObserved: {
    technique: string;      
    effectiveness: string;  
    timestamp: string;      
  }[];

  breakthroughMoments: {
    description: string;    
    significance: string;   
    timestamp: string;
  }[];

  challengingMoments: {
    description: string;
    suggestedApproach: string;
    timestamp: string;
  }[];

  homePractice: {
    activity: string;       
    duration: string;       
    tips: string[];
  }[];

  progressComparedToLastSession: string;
}

export interface TherapySession {
  id: string;
  timestamp: number;
  type: 'Audio' | 'Video';
  analysis: TherapySessionAnalysis;
  therapistName?: string;
  notes?: string;
}

export type LessonType = 'video' | 'quiz' | 'practice' | 'story';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: LessonType;
  estimatedTime: string; 
  isCompleted: boolean;
  isLocked: boolean;
  emoji: string;
  content?: any; 
}

export interface LearningPath {
  id: string;
  skillArea: string; 
  currentLevel: number; 
  lessons: Lesson[];
  progress: number; 
  colorTheme: string; 
}

export interface EnvironmentScan {
  lightLevel: 'too bright' | 'good' | 'too dim';
  lightSuggestion?: string;

  visualClutter: 'high' | 'medium' | 'low';
  clutterSuggestion?: string;

  noiseLevel: number; 
  noiseSuggestion?: string;

  colorAnalysis: string;
  overallRisk: 'low' | 'medium' | 'high';
  recommendations: string[];
}

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
  PARENT_INBOX = 'parent-inbox',
  THERAPY = 'therapy',
  LEARNING = 'learning',
  SCANNER = 'scanner',
  OPTIMIZER = 'optimizer'
}

export interface AppState {
  view: ViewState;
  activeScheduleId: string | null;
  schedules: Schedule[];
  profile: ChildProfile;
  profiles: ChildProfile[]; // New: List of all profiles
  isAACOpen: boolean;
  isHighContrast: boolean;
  tokens: number;
  moodLogs: MoodEntry[];
  behaviorLogs: BehaviorLog[];
  completionLogs: CompletionLog[]; 
  voiceMessages: VoiceMessage[];
  quizStats: QuizStats;
  meltdownRisk?: 'Low' | 'Medium' | 'High'; 
  caregiverPin?: string;
  customAACButtons: AACButton[]; 
  latestPrediction?: MeltdownPrediction | null;
  stories: StoryBook[];
  parentMessages: ParentMessage[];
  therapySessions: TherapySession[];
  learningPaths: LearningPath[];
}
