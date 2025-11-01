import React from "react";
import styles from "./CircularProgress.module.css";
import { formatTime } from "@/utils";

interface CircularProgressProps {
  progress: number;
  timeRemaining: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  isComplete?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  timeRemaining,
  size = 160,
  strokeWidth = 8,
  color = "#3b82f6",
  backgroundColor = "#e5e7eb",
  isComplete = false,
}) => {
  if (isComplete) {
    progress = 100;
  }
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={styles.container}>
      <svg width={size} height={size} className={styles.svg}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          className={styles.backgroundCircle}
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={isComplete ? "#10b981" : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={styles.progressCircle}
        />
      </svg>

      {/* Center content */}
      <div className={styles.centerContent}>
        <div className={styles.centerText}>
          {isComplete ? (
            <div className={styles.completeIcon}>✓</div>
          ) : (
            <div className={styles.percentage}>{formatTime(timeRemaining)}</div>
          )}
        </div>
      </div>
    </div>
  );
};
