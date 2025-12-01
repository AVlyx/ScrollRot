import React, { useEffect, useState } from "react";
import BlockerConfigurer from "./BlockerConfigurer";
import type { AllBlockerConfigs, BlockerConfig, Platform } from "@/types";
import { blockerConfigDefault, PLATFORMS } from "@/types";
import { getAllBlockerConfig, setAllBlockerConfig, getNumberWatchedShortVids } from "@/lib/storage";
import styles from "./BlockerConfigurers.module.css";

const BlockerConfigurers: React.FC = () => {
  // Initialize with all platforms dynamically
  const [configs, setConfigs] = useState<AllBlockerConfigs>(
    () =>
      Object.fromEntries(
        Object.keys(PLATFORMS).map((platform) => [platform, { ...blockerConfigDefault }])
      ) as AllBlockerConfigs
  );

  const [stats, setStats] = useState<Record<Platform, number>>({} as Record<Platform, number>);

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

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      const newStats: Record<Platform, number> = {} as Record<Platform, number>;
      for (const platform of Object.keys(PLATFORMS) as Platform[]) {
        newStats[platform] = await getNumberWatchedShortVids(platform);
      }
      setStats(newStats);
    };
    loadStats();
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
    snapchat: "👻",
  };

  return (
    <div className={styles.container}>
      {(Object.keys(PLATFORMS) as Platform[]).map((platform) => (
        <div key={platform} className={styles.platformSection}>
          <div className={styles.platformHeader}>
            <h2 className={styles.platformTitle}>
              {platformIcons[platform]} {PLATFORMS[platform]}
            </h2>
          </div>
          <div className={styles.platformContent}>
            <BlockerConfigurer
              config={configs[platform]}
              onChange={(partial) => updateConfig(platform, partial)}
            />
          </div>
        </div>
      ))}

      {/* Stats Card */}
      <div className={`${styles.platformSection} ${styles.statsCard}`}>
        <h2 className={styles.statsTitle}>📊 Videos Watched</h2>
        <div className={styles.statsGrid}>
          {(Object.keys(PLATFORMS) as Platform[]).map((platform) => (
            <div key={platform} className={styles.statItem}>
              <span className={styles.statPlatform}>
                <span>{platformIcons[platform]}</span>
                <span>{PLATFORMS[platform]}</span>
              </span>
              <span className={styles.statCount}>{stats[platform] || 0}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BlockerConfigurers;
