import React from "react";
import { CircularProgress } from "./CircularProgress";

interface CircularTimerProps {
  progress: number;
  timeRemaining: number;
  isComplete?: boolean;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
  progress,
  timeRemaining,
  isComplete = false,
}) => {
  return (
    <CircularProgress
      progress={progress}
      timeRemaining={timeRemaining}
      isComplete={isComplete}
      size={160}
      strokeWidth={8}
    />
  );
};
