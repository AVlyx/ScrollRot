import React, { useEffect, useState } from "react";
import BlockerConfigurer from "./BlockerConfigurer";
import type { AllBlockerConfigs, BlockerConfig, Platform } from "../types";
import { getAllBlockerConfig, setAllBlockerConfig } from "../lib/storage";

const defaultConfig: BlockerConfig = {
  enabled: false,
  autoPlayAfterBlock: false,
  blockDuration: 5,
};

const BlockerConfigurers: React.FC = () => {
  const [configs, setConfigs] = useState<AllBlockerConfigs>({
    shorts: { ...defaultConfig },
    reels: { ...defaultConfig },
    tiktok: { ...defaultConfig },
  });

  // Load from storage
  useEffect(() => {
    const getConfig = async () => {
      const allconfig: AllBlockerConfigs | null = await getAllBlockerConfig();
      if (allconfig) {
        setConfigs(allconfig);
      }
    };
    getConfig();
  }, []);

  useEffect(() => {
    setAllBlockerConfig(configs);
  }, [configs]);

  const updateConfig = (platform: Platform, partial: Partial<BlockerConfig>) => {
    setConfigs((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], ...partial },
    }));
  };

  const platformLabels: Record<Platform, string> = {
    shorts: "YouTube Shorts",
    reels: "Instagram Reels",
    tiktok: "TikTok",
  };

  return (
    <div className="p-4 w-72 text-sm space-y-5">
      <h1 className="text-lg font-semibold text-center mb-2">Video Blocker Settings</h1>

      {/* Render all platforms */}
      {(Object.keys(configs) as Platform[]).map((platform) => (
        <div key={platform}>
          <h2 className="font-semibold mb-2 border-b pb-1 text-gray-700 capitalize">
            {platformLabels[platform]}
          </h2>
          <BlockerConfigurer
            config={configs[platform]}
            onChange={(partial) => updateConfig(platform, partial)}
          />
        </div>
      ))}

      <p className="text-xs text-gray-500 text-center pt-2">
        Settings auto-save for each platform.
      </p>
    </div>
  );
};

export default BlockerConfigurers;
