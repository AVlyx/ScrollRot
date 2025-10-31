import React, { useState, useEffect, useRef } from "react";
import { CircularProgress } from "./CircularProgress";
import type { FocusTimer } from "@/types";

interface CircularTimerProps {
  timer: FocusTimer;
  onComplete?: () => void;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({ timer, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const durationMs = timer.duration * 60 * 1000; // Convert minutes to milliseconds
  const endTime = timer.startTime + durationMs;

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTimeRemaining(0);
        setProgress(100);
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current);
        }
        onComplete?.();
      } else {
        setTimeRemaining(remaining);
        const elapsed = now - timer.startTime;
        const currentProgress = (elapsed / durationMs) * 100;
        setProgress(Math.min(currentProgress, 100));
      }
    };

    updateTimer();
    intervalRef.current = window.setInterval(updateTimer, 100);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [timer.startTime, durationMs, endTime, onComplete]);

  return (
    <CircularProgress
      progress={progress}
      timeRemaining={timeRemaining}
      size={180}
      strokeWidth={12}
    />
  );
};
