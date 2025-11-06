import React from "react";
import { BlockerConfigurers } from "@/components";
import styles from "./PopupApp.module.css";

const PopupApp: React.FC = () => {
  const email = "vawolyx@gmail.com";
  return (
    <div className={styles.container}>
      <BlockerConfigurers />
      <div className={styles.banner}>
        <h2 className={styles.bannerTitle}>✨ Thank you for using ScrollRot!</h2>
        <p className={styles.bannerMessage}>
          I'd love to hear from you! If you have feature requests or feedback, please reach out to{" "}
          <a
            href={`mailto:${email}`}
            className={styles.email}
            target="_blank"
            rel="noopener noreferrer"
          >
            {email}
          </a>
        </p>
      </div>
    </div>
  );
};

export default PopupApp;
