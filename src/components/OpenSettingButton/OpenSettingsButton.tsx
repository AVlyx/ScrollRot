import React from "react";
import styles from "./OpenSettingsButton.module.css";

const OpenSettingsButton: React.FC = () => {
  const handleClick = (): void => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <button onClick={handleClick} className={styles.button}>
      Open Settings
    </button>
  );
};

export default OpenSettingsButton;
