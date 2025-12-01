import React from "react";
import { BlockerConfigurers } from "@/components";
import styles from "./OptionsApp.module.css";

const OptionsApp: React.FC = () => {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Short-Form Video Blocker</h1>
            <p className={styles.subtitle}>
              Take control of your viewing experience by customizing block settings for each
              platform
            </p>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.card}>
            <BlockerConfigurers />
          </div>
        </main>
        {/* 
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Configure your preferences above. Changes are saved automatically.
          </p>
        </footer> */}
      </div>
    </div>
  );
};

export default OptionsApp;
