import React from "react";
import type { BlockerConfig } from "@/types";
import styles from "./BlockerConfigurer.module.css";

interface Props {
  config: BlockerConfig;
  onChange: (partial: Partial<BlockerConfig>) => void;
}

const PRESET_DURATIONS = [2, 3, 5, 8, 13, 21, 34];

const BlockerConfigurer: React.FC<Props> = ({ config, onChange }) => {
  const handleDropdownChange = (value: string) => {
    if (value === "other") {
      onChange({ customDuration: true });
    } else {
      onChange({
        customDuration: false,
        blockDuration: Number(value),
      });
    }
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <span>Enabled</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={config.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
      </label>

      <label className={styles.label}>
        <span>Auto-play after block</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={config.autoPlayAfterBlock}
          onChange={(e) => onChange({ autoPlayAfterBlock: e.target.checked })}
        />
      </label>

      <label className={styles.label}>
        <span>Grayscale videos</span>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={config.grayscale}
          onChange={(e) => onChange({ grayscale: e.target.checked })}
        />
      </label>

      <div className={styles.fieldGroup}>
        <label htmlFor="blockDuration" className={styles.fieldLabel}>
          Block duration (seconds)
        </label>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            id="blockDuration"
            className={styles.input}
            value={config.customDuration ? "other" : config.blockDuration}
            onChange={(e) => handleDropdownChange(e.target.value)}
          >
            {PRESET_DURATIONS.map((duration) => (
              <option key={duration} value={duration}>
                {duration}
              </option>
            ))}
            <option value="other">other</option>
          </select>

          {config.customDuration && (
            <input
              type="number"
              min={1}
              className={styles.input}
              value={config.blockDuration}
              onChange={(e) => onChange({ blockDuration: Number(e.target.value) })}
              placeholder="Custom"
            />
          )}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="maxReelCount" className={styles.fieldLabel}>
          Max videos per session
        </label>
        <input
          id="maxReelCount"
          type="number"
          min={1}
          className={styles.input}
          value={config.maxReelCount}
          onChange={(e) => onChange({ maxReelCount: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};

export default BlockerConfigurer;
