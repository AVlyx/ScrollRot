import React from "react";
import styles from "./PopupApp.module.css";
import { FocusTimerWidget } from "@/components/FocusTimer";
import { OpenSettingsButton } from "@/components";

const PopupApp: React.FC = () => {
  const email = "vawolyx@gmail.com";

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <FocusTimerWidget />
      </main>

      <footer className={styles.footer}>
        <div className={styles.settingsSection}>
          <OpenSettingsButton />
        </div>

        <div className={styles.banner}>
          <h2 className={styles.bannerTitle}>✨ Thank you for using ScrollRot!</h2>
          <p className={styles.bannerText}>
            I'd love to hear from you! If you have feature requests or feedback, please reach out to{" "}
            <a
              href={`mailto:${email}`}
              className={styles.emailLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              {email}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PopupApp;
