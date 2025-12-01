import React, { useEffect, useState } from "react";
import BlockerConfigurer from "./BlockerConfigurer";
import type { AllBlockerConfigs, BlockerConfig, Platform } from "@/types";
import { blockerConfigDefault, PLATFORMS } from "@/types";
import { getAllBlockerConfig, setAllBlockerConfig } from "@/lib/storage";
import styles from "./BlockerConfigurers.module.css";

const BlockerConfigurers: React.FC = () => {
  // Initialize with all platforms dynamically
  const [configs, setConfigs] = useState<AllBlockerConfigs>(
    () =>
      Object.fromEntries(
        Object.keys(PLATFORMS).map((platform) => [platform, { ...blockerConfigDefault }])
      ) as AllBlockerConfigs
  );

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

  const platformIcons: Record<Platform, string> = {
    shorts: "🎬",
    reels: "📸",
    tiktok: "🎵",
    facebook: "👥",
  };

  return (
    <div className={styles.container}>
      {(Object.keys(PLATFORMS) as Platform[]).map((platform, index) => (
        <div key={platform} className={styles.platformSection}>
          <div className={styles.platformHeader}>
            <h2 className={styles.platformTitle}>
              {platformIcons[platform] + PLATFORMS[platform]}
            </h2>
          </div>
          <div className={styles.platformContent}>
            <BlockerConfigurer
              config={configs[platform]}
              onChange={(partial) => updateConfig(platform, partial)}
            />
          </div>
          {index < Object.keys(PLATFORMS).length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  );
};

export default BlockerConfigurers;
