import React from "react";
import styles from "./OpenSettingsButton.module.css";
import Browser from "webextension-polyfill";

const OpenSettingsButton: React.FC = () => {
  const handleClick = (): void => {
    Browser.runtime.openOptionsPage();
  };

  return (
    <button onClick={handleClick} className={styles.button}>
      Open Settings
    </button>
  );
};

export default OpenSettingsButton;
