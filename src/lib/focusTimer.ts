import type { FocusSessionData, FocusTimer, FocusTimerConfig } from "@/types";
import { getFocusTimer, getFocusTimerConfig } from "./storage/focusTimer";

/**
 * Formats milliseconds into a human-readable time string (HH:MM:SS or MM:SS)
 */
export function formatTime(milliseconds: number): string {
  if (milliseconds <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number): string => num.toString().padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(minutes)}:${pad(seconds)}`;
}

export function getFocusDataFromConfig(
  focusTimer: FocusTimer,
  focusTimerConfig: FocusTimerConfig
): FocusSessionData {
  const now = Date.now();
  const timeElapsed = now - focusTimer.startTime;

  const focusMs = focusTimerConfig.focusTime * 60 * 1000;
  const breakMs = focusTimerConfig.pauseTime * 60 * 1000;
  const breakAndFocusMs = focusMs + breakMs;

  const currentSession = Math.floor(timeElapsed / breakAndFocusMs) + 1;
  const currSessionElapsed = timeElapsed % breakAndFocusMs;

  const type: "focus" | "break" = currSessionElapsed < focusMs ? "focus" : "break";
  const currSessionTypeElapsed =
    currSessionElapsed < focusMs ? currSessionElapsed : currSessionElapsed - focusMs;

  const sessionDuration = currSessionElapsed < focusMs ? focusMs : breakMs;
  const progress = (currSessionTypeElapsed * 100) / sessionDuration;
  const timeRemaining = sessionDuration - currSessionTypeElapsed;
  const totalSessions = focusTimerConfig.numberOfFocusSessions;
  const isComplete = timeElapsed >= breakAndFocusMs * totalSessions - breakMs;
  return {
    type,
    currentSession,
    totalSessions,
    sessionDuration,
    progress,
    timeRemaining,
    isComplete,
  };
}

export async function getFocusData(): Promise<FocusSessionData | null> {
  const focusTimer = await getFocusTimer();
  const focusTimerConfig = await getFocusTimerConfig();
  if (!focusTimer) {
    return null;
  }
  if (!focusTimerConfig) {
    console.log("[ScrollRot] Did not find focusTimerConfig");
    return null;
  }
  return getFocusDataFromConfig(focusTimer, focusTimerConfig);
}
