import React, { useEffect, useState } from "react";
import { CircularTimer } from "./CircularTimer";
import { SessionProgress } from "./SessionProgress";
import { FocusTimerConfigPanel } from "./FocusTimerConfigPanel";
import type { FocusTimer, FocusTimerConfig } from "@/types";
import {
  clearFocusTimer,
  getFocusTimer,
  setFocusTimer,
  getFocusTimerConfig,
  defaultFocusTimerConfig,
} from "@/lib/storage/focusTimer";
import { activeTimer } from "@/utils";
import styles from "./FocusTimerWidget.module.css";

export const FocusTimerWidget: React.FC = () => {
  const [timer, setTimer] = useState<FocusTimer | null>(null);
  const [config, setConfig] = useState<FocusTimerConfig>(defaultFocusTimerConfig);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [savedTimer, savedConfig] = await Promise.all([getFocusTimer(), getFocusTimerConfig()]);

      if (savedTimer) {
        setTimer(savedTimer);
      }

      if (savedConfig) {
        setConfig(savedConfig);
      }
    };
    loadData();
  }, []);

  const handleStartTimer = async () => {
    // Reload config in case it changed
    const latestConfig = (await getFocusTimerConfig()) || config;

    const newTimer: FocusTimer = {
      startTime: Date.now(),
      duration: latestConfig.focusTime,
      type: "focus",
      currentSession: 1,
      totalSessions: latestConfig.numberOfFocusSessions,
    };

    setTimer(newTimer);
    await setFocusTimer(newTimer);
  };

  const handleTimerComplete = async () => {
    if (!timer) return;

    const latestConfig = (await getFocusTimerConfig()) || config;

    // If we just finished a focus session
    if (timer.type === "focus") {
      // Start a break (unless it was the last session)
      if (timer.currentSession < timer.totalSessions) {
        const breakTimer: FocusTimer = {
          startTime: Date.now(),
          duration: latestConfig.pauseTime,
          type: "break",
          currentSession: timer.currentSession,
          totalSessions: timer.totalSessions,
        };
        setTimer(breakTimer);
        await setFocusTimer(breakTimer);
      } else {
        // All sessions complete
        handleEndSession();
      }
    } else {
      // If we just finished a break, start the next focus session
      const nextSession = timer.currentSession + 1;
      const focusTimer: FocusTimer = {
        startTime: Date.now(),
        duration: latestConfig.focusTime,
        type: "focus",
        currentSession: nextSession,
        totalSessions: timer.totalSessions,
      };
      setTimer(focusTimer);
      await setFocusTimer(focusTimer);
    }
  };

  const handleEndSession = async () => {
    setTimer(null);
    await clearFocusTimer();
  };

  const handleConfigClose = async () => {
    setShowConfig(false);
    // Reload config after closing
    const savedConfig = await getFocusTimerConfig();
    if (savedConfig) {
      setConfig(savedConfig);
    }
  };

  if (showConfig) {
    return <FocusTimerConfigPanel onClose={handleConfigClose} />;
  }

  if (timer && activeTimer(timer)) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <h1 className={styles.title}>Focus Session</h1>
          <p className={styles.subtitle}>Stay focused and productive</p>
        </div>

        <SessionProgress timer={timer} />

        <div className={styles.timerContainer}>
          <CircularTimer timer={timer} onComplete={handleTimerComplete} />
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
            <p className={styles.subtitle}>
              {config.numberOfFocusSessions} × {config.focusTime}min focus, {config.pauseTime}min
              breaks
            </p>
          </div>

          <div className={styles.buttonGroup}>
            <button className={`${styles.button} ${styles.startButton}`} onClick={handleStartTimer}>
              Start Timer
            </button>
            <button
              className={`${styles.button} ${styles.configButton}`}
              onClick={() => setShowConfig(true)}
              aria-label="Configure timer settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default FocusTimerWidget;
