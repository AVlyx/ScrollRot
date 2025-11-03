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
import { getFocusDataFromConfig } from "@/lib/focusTimer";
import styles from "./FocusTimerWidget.module.css";

export const FocusTimerWidget: React.FC = () => {
  const [timer, setTimer] = useState<FocusTimer | null>(null);
  const [config, setConfig] = useState<FocusTimerConfig>(defaultFocusTimerConfig);
  const [showConfig, setShowConfig] = useState(false);
  const [sessionData, setSessionData] = useState<ReturnType<typeof getFocusDataFromConfig> | null>(
    null
  );

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

  // Recalculate session data periodically when timer is active
  useEffect(() => {
    if (!timer) {
      setSessionData(null);
      return;
    }

    const updateSessionData = () => {};

    updateSessionData();
    const interval = window.setInterval(() => {
      const data = getFocusDataFromConfig(timer, config);
      setSessionData(data);
      if (data.isComplete) {
        window.clearInterval(interval);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
    };
  }, [timer, config]);

  const handleStartTimer = async () => {
    // Reload config in case it changed
    const latestConfig = (await getFocusTimerConfig()) || config;

    // Calculate total duration of all sessions
    const totalDuration =
      latestConfig.focusTime * latestConfig.numberOfFocusSessions +
      latestConfig.pauseTime * (latestConfig.numberOfFocusSessions - 1);

    const newTimer: FocusTimer = {
      startTime: Date.now(),
      duration: totalDuration,
    };

    setTimer(newTimer);
    await setFocusTimer(newTimer);
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

  if (timer && sessionData) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <h1 className={styles.title}>Focus Session</h1>
          <p className={styles.subtitle}>Stay focused and productive</p>
        </div>

        <SessionProgress
          type={sessionData.type}
          currentSession={sessionData.currentSession}
          totalSessions={sessionData.totalSessions}
          isComplete={sessionData.isComplete}
        />

        <div className={styles.timerContainer}>
          <CircularTimer
            progress={sessionData.progress}
            timeRemaining={sessionData.timeRemaining}
            isComplete={sessionData.isComplete}
          />
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
