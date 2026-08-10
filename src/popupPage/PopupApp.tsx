import React from "react";
import styles from "./PopupApp.module.css";
import { FocusTimerWidget } from "@/components/FocusTimer";
import { OpenSettingsButton, WatchedStatsWidget } from "@/components";

const PopupApp: React.FC = () => {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <FocusTimerWidget />
      </main>

      <footer className={styles.footer}>
        <div className={styles.settingsSection}>
          <OpenSettingsButton />
        </div>

        <div className={styles.stats}>
          <WatchedStatsWidget />
        </div>
      </footer>
    </div>
  );
};

export default PopupApp;
