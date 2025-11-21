import React, { useEffect, useState } from "react";
import BlockerConfigurer from "./BlockerConfigurer";
import type { AllBlockerConfigs, BlockerConfig, Platform } from "@/types";
import { blockerConfigDefault } from "@/types";
import { getAllBlockerConfig, setAllBlockerConfig } from "@/lib/storage";
import styles from "./BlockerConfigurers.module.css";

const BlockerConfigurers: React.FC = () => {
  const [configs, setConfigs] = useState<AllBlockerConfigs>({
    shorts: { ...blockerConfigDefault },
    reels: { ...blockerConfigDefault },
    tiktok: { ...blockerConfigDefault },
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

  const platformIcons: Record<Platform, string> = {
    shorts: "🎬",
    reels: "📸",
    tiktok: "🎵",
  };

  return (
    <div className={styles.container}>
      {(Object.keys(configs) as Platform[]).map((platform, index) => (
        <div key={platform} className={styles.platformSection}>
          <div className={styles.platformHeader}>
            <h2 className={styles.platformTitle}>
              {platformIcons[platform] + platformLabels[platform]}
            </h2>
          </div>
          <div className={styles.platformContent}>
            <BlockerConfigurer
              config={configs[platform]}
              onChange={(partial) => updateConfig(platform, partial)}
            />
          </div>
          {index < Object.keys(configs).length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  );
};

export default BlockerConfigurers;
