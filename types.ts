export interface WorkoutLog {
  date: string;
  weight: number;
  reps: number;
  rpe: number;
  notes: string;
}

export interface ExerciseMetrics {
  monthly_volume_change: string;
  estimated_1rm_change: string;
  fatigue_index: number;
  last_session_summary: string;
}

export enum Sender {
  USER = 'USER',
  BIOME = 'BIOME',
  SYSTEM = 'SYSTEM' // For tool usage logs
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  isThinking?: boolean;
  toolCall?: {
    name: string;
    args: any;
    result?: any;
  };
}

export interface AppState {
  messages: Message[];
  isProcessing: boolean;
}