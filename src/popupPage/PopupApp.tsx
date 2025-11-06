import React from "react";
import { OpenSettingsButton } from "@/components";
import styles from "./PopupApp.module.css";

const PopupApp: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.banner}>
        <h2 className={styles.bannerTitle}>✨ Thank you for using ScrollRot!</h2>
        <p className={styles.bannerMessage}>
          We'd love to hear from you! If you have feature requests or feedback, please reach out to{" "}
          <a
            href="mailto:scrollrot@gmail.com"
            className={styles.email}
            target="_blank"
            rel="noopener noreferrer"
          >
            scrollrot@gmail.com
          </a>
        </p>
      </div>

      <OpenSettingsButton />
    </div>
  );
};

export default PopupApp;
