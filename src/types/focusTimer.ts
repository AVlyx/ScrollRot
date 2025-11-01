export interface FocusTimer {
  startTime: number;
  duration: number; // total duration of all sessions in minutes
}
export interface FocusTimerConfig {
  focusTime: number; // minutes
  pauseTime: number; // minutes
  numberOfFocusSessions: number;
}

export interface FocusSessionState {
  timer: FocusTimer | null;
  config: FocusTimerConfig;
}

export interface FocusSessionData {
  type: "focus" | "break";
  currentSession: number;
  totalSessions: number;
  sessionDuration: number;
  progress: number; // 0-100
  timeRemaining: number; // milliseconds
  isComplete: boolean;
}
