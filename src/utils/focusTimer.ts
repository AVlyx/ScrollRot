import type { FocusTimer } from "@/types";

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

/**
 * Calculates the percentage of time elapsed for a FocusTimer
 */
export function calculateProgress(timer: FocusTimer, currentTime: number = Date.now()): number {
  console.log(timer.startTime);
  const start = timer.startTime;
  const durationMs = timer.duration * 60 * 1000; // Convert minutes to milliseconds
  const end = start + durationMs;

  if (currentTime <= start) {
    return 0;
  }

  if (currentTime >= end) {
    return 100;
  }

  const elapsed = currentTime - start;

  return (elapsed / durationMs) * 100;
}

export function activeTimer(timer: FocusTimer, currentTime: number = Date.now()): boolean {
  return calculateProgress(timer, currentTime) < 100;
}
