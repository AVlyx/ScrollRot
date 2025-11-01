import React, { useEffect, useState } from "react";
import BlockerConfigurer from "./BlockerConfigurer";
import type { AllBlockerConfigs, BlockerConfig, Platform } from "@/types";
import { getAllBlockerConfig, setAllBlockerConfig } from "@/lib/storage";
import styles from "./BlockerConfigurers.module.css";

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
    <div className={styles.container}>
      <h1 className={styles.title}>Video Blocker Settings</h1>

      {/* Render all platforms */}
      {(Object.keys(configs) as Platform[]).map((platform) => (
        <div key={platform} className={styles.platformSection}>
          <h2 className={styles.platformTitle}>{platformLabels[platform]}</h2>
          <div className={styles.platformContent}>
            <BlockerConfigurer
              config={configs[platform]}
              onChange={(partial) => updateConfig(platform, partial)}
            />
          </div>
        </div>
      ))}

      <p className={styles.footer}>Settings auto-save for each platform.</p>
    </div>
  );
};

export default BlockerConfigurers;
