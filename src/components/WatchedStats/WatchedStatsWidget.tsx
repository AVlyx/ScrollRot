import React, { useEffect, useState } from "react";
import type { AllBlockerConfigs, Platform } from "@/types";
import { blockerConfigDefault, PLATFORMS, PLATFORM_ICONS } from "@/types";
import {
  getAllBlockerConfig,
  getNumberWatchedShortVids,
  watchedVidsOnChangeListener,
} from "@/lib/storage";
import styles from "./WatchedStatsWidget.module.css";

const platforms = Object.keys(PLATFORMS) as Platform[];

function fillClass(ratio: number): string {
  if (ratio >= 1) {
    return styles.reached;
  }
  if (ratio >= 0.7) {
    return styles.warning;
  }
  return styles.ok;
}

export const WatchedStatsWidget: React.FC = () => {
  const [configs, setConfigs] = useState<AllBlockerConfigs>(
    () =>
      Object.fromEntries(
        platforms.map((platform) => [platform, { ...blockerConfigDefault }])
      ) as AllBlockerConfigs
  );

  const [counts, setCounts] = useState<Record<Platform, number>>(
    () => Object.fromEntries(platforms.map((platform) => [platform, 0])) as Record<Platform, number>
  );

  useEffect(() => {
    const loadStats = async () => {
      const [allConfig, watched] = await Promise.all([
        getAllBlockerConfig(),
        Promise.all(platforms.map((platform) => getNumberWatchedShortVids(platform))),
      ]);

      if (allConfig) {
        setConfigs(allConfig);
      }

      setCounts(
        Object.fromEntries(
          platforms.map((platform, index) => [platform, watched[index]])
        ) as Record<Platform, number>
      );
    };
    loadStats();
  }, []);

  // Keep the counters live while the popup is open
  useEffect(
    () =>
      watchedVidsOnChangeListener((platform, count) => {
        setCounts((prev) => ({ ...prev, [platform]: count }));
      }),
    []
  );

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <h2 className={styles.title}>📊 Watched today</h2>
        <span className={styles.hint}>resets at 3 AM</span>
      </div>

      <div className={styles.list}>
        {platforms.map((platform) => {
          const config = configs[platform];
          const count = counts[platform];
          const max = config.maxReelCount;
          const ratio = max > 0 ? Math.min(count / max, 1) : 0;

          return (
            <div key={platform} className={`${styles.row} ${config.enabled ? "" : styles.disabled}`}>
              <div className={styles.rowHeader}>
                <span className={styles.platform}>
                  <span className={styles.icon}>{PLATFORM_ICONS[platform]}</span>
                  <span className={styles.name}>{PLATFORMS[platform]}</span>
                </span>
                {config.enabled ? (
                  <span className={styles.count}>
                    <strong>{count}</strong>
                    <span className={styles.max}>/ {max}</span>
                  </span>
                ) : (
                  <span className={styles.off}>off</span>
                )}
              </div>

              <div className={styles.track}>
                <div
                  className={`${styles.fill} ${fillClass(ratio)}`}
                  style={{ width: `${(config.enabled ? ratio : 0) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WatchedStatsWidget;
