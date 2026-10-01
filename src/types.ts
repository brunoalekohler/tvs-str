export interface EventItem {
  id: string;
  title: string;
  location: string;
  employees: string[];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category?: string;
  color?: string;
  createdAt?: string;
}

export interface ShiftDefinition {
  id: string;
  name: string;
  startTime: string; // "05:00", "13:30", "22:00"
  greeting: string;
  safetyMessage: string;
}

export interface CompanyConfig {
  name: string;
  subtitle: string;
  logoUrl?: string;
  department: string;
}

export type DisplayMode = 'calendar' | 'video' | 'clock';

export interface CycleConfig {
  agendaMinutes: number; // 5 min
  agendaSeconds: number; // 0 sec
  videoMinutes: number;  // 1 min
  videoSeconds: number;  // 6 sec
  videoUrl: string;      // '/video.mp4'
  videoName: string;     // 'video.mp4'
  videoFit: 'contain' | 'cover';
  videoMuted: boolean;
}

export interface AutoRefreshConfig {
  syncIntervalSeconds: number; // e.g. 15, 30, 60
  autoReloadMinutes: number;   // e.g. 0 (disabled), 10, 15, 30, 60
  realtimeEnabled: boolean;
}
