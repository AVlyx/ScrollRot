import React from "react";
import styles from "./SessionProgress.module.css";

interface SessionProgressProps {
  type: "focus" | "break";
  currentSession: number;
  totalSessions: number;
  isComplete: boolean;
}

export const SessionProgress: React.FC<SessionProgressProps> = ({
  type,
  currentSession,
  totalSessions,
  isComplete,
}) => {
  currentSession = isComplete ? totalSessions : currentSession;
  return (
    <div className={styles.container}>
      <div className={styles.sessionInfo}>
        <span className={styles.sessionType}>{type === "focus" ? "🎯 Focus" : "☕ Break"}</span>
        <span className={styles.sessionCount}>
          Session {currentSession} of {totalSessions}
        </span>
      </div>

      <div className={styles.progressBar}>
        {Array.from({ length: totalSessions }).map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${
              index < currentSession - 1 || isComplete
                ? styles.completed
                : index === currentSession - 1
                ? styles.active
                : styles.upcoming
            }`}
          />
        ))}
      </div>
    </div>
  );
};
