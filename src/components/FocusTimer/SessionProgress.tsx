import React from "react";
import type { FocusTimer } from "@/types";
import styles from "./SessionProgress.module.css";

interface SessionProgressProps {
  timer: FocusTimer;
}

export const SessionProgress: React.FC<SessionProgressProps> = ({ timer }) => {
  const { currentSession, totalSessions, type } = timer;

  return (
    <div className={styles.container}>
      <div className={styles.sessionInfo}>
        <span className={styles.sessionType}>
          {type === 'focus' ? '🎯 Focus' : '☕ Break'}
        </span>
        <span className={styles.sessionCount}>
          Session {currentSession} of {totalSessions}
        </span>
      </div>
      
      <div className={styles.progressBar}>
        {Array.from({ length: totalSessions }).map((_, index) => (
          <div
            key={index}
            className={`${styles.dot} ${
              index < currentSession ? styles.completed :
              index === currentSession - 1 ? styles.active :
              styles.upcoming
            }`}
          />
        ))}
      </div>
    </div>
  );
};
