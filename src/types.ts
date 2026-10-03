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

export type DisplayMode = 'calendar' | 'clock';

export interface AutoRefreshConfig {
  syncIntervalSeconds: number; // e.g. 15, 30, 60
  autoReloadMinutes: number;   // e.g. 0 (disabled), 10, 15, 30, 60
  realtimeEnabled: boolean;
}
