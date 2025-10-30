import React from "react";
import type { BlockerConfig } from "@/types";
import styles from "./BlockerConfigurer.module.css";

interface Props {
  config: BlockerConfig;
  onChange: (partial: Partial<BlockerConfig>) => void;
}

const BlockerConfigurer: React.FC<Props> = ({ config, onChange }) => {
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

      <div className={styles.fieldGroup}>
        <label htmlFor="blockDuration" className={styles.fieldLabel}>
          Block duration (seconds)
        </label>
        <input
          id="blockDuration"
          type="number"
          min={1}
          className={styles.input}
          value={config.blockDuration}
          onChange={(e) => onChange({ blockDuration: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};

export default BlockerConfigurer;
