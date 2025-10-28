import React from "react";
import type { BlockerConfig } from "../types";

interface Props {
  config: BlockerConfig;
  onChange: (partial: Partial<BlockerConfig>) => void;
}

const BlockerConfigurer: React.FC<Props> = ({ config, onChange }) => {
  return (
    <div className="space-y-3">
      <label className="flex items-center justify-between">
        <span>Enabled</span>
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
        />
      </label>

      <label className="flex items-center justify-between">
        <span>Auto-play after block</span>
        <input
          type="checkbox"
          checked={config.autoPlayAfterBlock}
          onChange={(e) => onChange({ autoPlayAfterBlock: e.target.checked })}
        />
      </label>

      <div className="flex flex-col">
        <label htmlFor="blockDuration">Block duration (seconds)</label>
        <input
          id="blockDuration"
          type="number"
          min={1}
          className="border rounded px-2 py-1 mt-1"
          value={config.blockDuration}
          onChange={(e) => onChange({ blockDuration: Number(e.target.value) })}
        />
      </div>
    </div>
  );
};

export default BlockerConfigurer;
