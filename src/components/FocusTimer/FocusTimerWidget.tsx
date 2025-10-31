import React, { useEffect, useState } from "react";
import { CircularTimer } from "./CircularTimer";
import type { FocusTimer } from "@/types";
import { clearFocusTimer, getFocusTimer, setFocusTimer } from "@/lib/storage/focusTimer";
import { activeTimer } from "@/utils";
import styles from "./FocusTimerWidget.module.css";

export const FocusTimerWidget: React.FC = () => {
  const timerDuration = 1;
  const [timer, setTimer] = useState<FocusTimer | null>(null);

  useEffect(() => {
    const loadCurrentimer = async () => {
      const pTimer = await getFocusTimer();
      setTimer(pTimer);
    };
    loadCurrentimer();
  });

  const handleStartTimer = () => {
    const pTimer: FocusTimer = { startTime: Date.now(), duration: timerDuration };
    setTimer(pTimer);
    setFocusTimer(pTimer);
  };

  const handleEndSession = () => {
    setTimer(null);
    clearFocusTimer();
  };
  
  //The lion does not care about code duplication
  const endTimer = () => {
    setTimer(null);
    clearFocusTimer();
  };

  if (timer && activeTimer(timer)) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <h1 className={styles.title}>Focus Session</h1>
          <p className={styles.subtitle}>Stay focused and productive</p>
        </div>
        
        <div className={styles.timerContainer}>
          <CircularTimer timer={timer} onComplete={endTimer} />
        </div>
        
        <div className={styles.buttonContainer}>
          <button className={`${styles.button} ${styles.endButton}`} onClick={handleEndSession}>
            End Session
          </button>
        </div>
      </div>
    );
  } else {
    return (
      <div className={styles.widget}>
        <div className={styles.emptyState}>
          <div className={styles.header}>
            <div className={styles.icon}>⏱️</div>
            <h1 className={styles.title}>Focus Timer</h1>
            <p className={styles.subtitle}>Start a focused work session</p>
          </div>
          
          <button className={`${styles.button} ${styles.startButton}`} onClick={handleStartTimer}>
            Start Timer
          </button>
        </div>
      </div>
    );
  }
};

export default FocusTimerWidget;
