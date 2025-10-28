import React from "react";

const OpenSettingsButton: React.FC = () => {
  const handleClick = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <button
      onClick={handleClick}
      className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 rounded-lg shadow-sm transition w-full"
    >
      Open Settings
    </button>
  );
};

export default OpenSettingsButton;
