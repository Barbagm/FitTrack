export type UserRole = 'user' | 'admin';

export interface UserCustomization {
  nameColor: string;
  nameStyle: 'matte' | 'neon';
  hasGlow: boolean;
  frame: string;
  phrase: string;
  phraseColor?: string;
  phraseExpiresAt?: string;
  frameExpiresAt?: string;
}

export interface User {
  username: string;
  email: string;
  password?: string;
  role: UserRole;
  active: boolean;
  blocked: boolean;
  usageTime: number; // in minutes
  profilePhoto?: string;
  trophies: number;
  streak: number;
  lastActiveDate?: string;
  totalActivities: number;
  totalDistance: number;
  totalTime: number;
  runCount: number;
  walkCount: number;
  weeklyStats: {
    '3km': number;
    '5km': number;
    '10km': number;
  };
  lastWeeklyReset?: string;
  completedEvents: string[];
  inventory: string[];
  activeBoosters: {
    type: 'xp-2x';
    expiresAt: string;
  }[];
  customization: UserCustomization;
  createdAt: string;
}

export type TrainingType = 'Corrida' | 'Caminhada' | 'Muay Thai' | 'Boxe' | 'Jiu Jitsu' | 'Bicicleta (Academia)' | 'Pedal na Rua';

export interface Training {
  id: string;
  username: string;
  type: TrainingType;
  duration: number; // in seconds
  distance: number; // in km
  pace: number; // min/km
  calories: number;
  date: string;
}

export interface Announcement {
  id: string;
  message: string;
  duration: number; // in hours
  createdAt: string;
  expiresAt: string;
}

export interface FitnessEvent {
  id: string;
  name: string;
  type: 'Corrida' | 'Caminhada';
  distance: number;
  trophies: number;
  useCheckpoints: boolean;
  checkpointInterval?: number; // in meters
  checkpointTrophies?: number;
  rewardFrame?: string;
  rewardPhrase?: string;
  rewardPhraseColor?: string;
  rewardDuration?: number; // in days, null for permanent
  active: boolean;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  trainings: Training[];
  announcements: Announcement[];
  events: FitnessEvent[];
  syncActive: boolean;
  notifications: AppNotification[];
  weeklyWinners: {
    '3km': string | null;
    '5km': string | null;
    '10km': string | null;
    weekId: string;
  };
}

export interface AppNotification {
  id: string;
  message: string;
  type: 'trophy' | 'bonus' | 'info';
  amount?: number;
  createdAt: string;
}
