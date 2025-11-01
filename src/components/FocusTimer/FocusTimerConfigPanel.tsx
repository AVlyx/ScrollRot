import React, { useState, useEffect } from "react";
import type { FocusTimerConfig } from "@/types";
import {
  defaultFocusTimerConfig,
  getFocusTimerConfig,
  setFocusTimerConfig,
} from "@/lib/storage/focusTimer";
import styles from "./FocusTimerConfigPanel.module.css";

interface FocusTimerConfigPanelProps {
  onClose?: () => void;
}

export const FocusTimerConfigPanel: React.FC<FocusTimerConfigPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<FocusTimerConfig>(defaultFocusTimerConfig);

  useEffect(() => {
    const loadConfig = async () => {
      const savedConfig = await getFocusTimerConfig();
      if (savedConfig) {
        setConfig(savedConfig);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    await setFocusTimerConfig(config);
    onClose?.();
  };

  const handleChange = (field: keyof FocusTimerConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Timer Settings</h2>
      </div>

      <div className={styles.content}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="focusTime">
            Focus Time (minutes)
          </label>
          <input
            id="focusTime"
            type="number"
            min="1"
            max="120"
            value={config.focusTime}
            onChange={(e) => handleChange("focusTime", parseInt(e.target.value) || 1)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="pauseTime">
            Break Time (minutes)
          </label>
          <input
            id="pauseTime"
            type="number"
            min="1"
            max="60"
            value={config.pauseTime}
            onChange={(e) => handleChange("pauseTime", parseInt(e.target.value) || 1)}
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="numberOfFocusSessions">
            Number of Sessions
          </label>
          <input
            id="numberOfFocusSessions"
            type="number"
            min="1"
            max="10"
            value={config.numberOfFocusSessions}
            onChange={(e) => handleChange("numberOfFocusSessions", parseInt(e.target.value) || 1)}
            className={styles.input}
          />
        </div>

        <div className={styles.info}>
          <p className={styles.infoText}>
            Total time:{" "}
            {config.focusTime * config.numberOfFocusSessions +
              config.pauseTime * (config.numberOfFocusSessions - 1)}{" "}
            minutes
          </p>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={`${styles.button} ${styles.cancelButton}`} onClick={onClose}>
          Cancel
        </button>
        <button className={`${styles.button} ${styles.saveButton}`} onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
};
