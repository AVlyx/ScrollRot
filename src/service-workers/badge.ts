import { getFocusDataFromConfig } from "@/lib/focusTimer";
import { focusTimerOnChangeListener, getFocusTimerConfig } from "@/lib/storage/focusTimer";
import type { FocusTimer, FocusTimerConfig } from "@/types";
const breakArrIcons = ["🍵", "☕", "⚽", "🌻", "☀️"];
const workIcons = ["📖", "🧾", "💻", "✒️", "📚", "📈"];

var iconChangeTimeOut: number | null = null;

function rdSelectIn(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const handleFocusSessionTypeChange = (focusTimer: FocusTimer, config: FocusTimerConfig) => {
  const timerData = getFocusDataFromConfig(focusTimer, config);
  if (timerData.isComplete) {
    return;
  }
  if (timerData.type == "break") {
    const text = rdSelectIn(breakArrIcons);
    chrome.action.setBadgeText({ text });
  } else if (timerData.type == "focus") {
    const text = rdSelectIn(workIcons);
    chrome.action.setBadgeText({ text });
  } else {
    console.log("[ScrollRot] Someone cooked here");
  }

  iconChangeTimeOut = setTimeout(
    () => handleFocusSessionTypeChange(focusTimer, config),
    timerData.sessionDuration + 100
  );
};

const newTimerLaunched = async (newValue: FocusTimer) => {
  const config = await getFocusTimerConfig();
  handleFocusSessionTypeChange(newValue, config);
};

focusTimerOnChangeListener(newTimerLaunched, () => {
  if (iconChangeTimeOut !== null) {
    clearTimeout(iconChangeTimeOut);
    iconChangeTimeOut = null;
  }
  chrome.action.setBadgeText({ text: "" });
});
