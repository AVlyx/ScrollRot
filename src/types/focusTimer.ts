export interface FocusTimer {
  startTime: number;
  duration: number; // minutes
  type: "focus" | "break";
  currentSession: number;
  totalSessions: number;
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
