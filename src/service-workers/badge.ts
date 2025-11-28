import { getFocusDataFromConfig } from "@/lib/focusTimer";
import {
  focusTimerOnChangeListener,
  getFocusTimer,
  getFocusTimerConfig,
} from "@/lib/storage/focusTimer";
import type { FocusTimer, FocusTimerConfig } from "@/types";
import Browser from "webextension-polyfill";
const breakIcons = ["🍵", "☕", "⚽", "🌻", "☀️"];
const focusIcons = ["📖", "🚀", "💻", "✒️", "📚"];

const badgeAlarm = "BadgeAlarm";

function rdSelectIn(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setBreakBadge() {
  const text = rdSelectIn(breakIcons);
  const color = "orange";
  Browser.action.setBadgeBackgroundColor({ color });
  Browser.action.setBadgeText({ text });
}

function setFocusBadge() {
  const text = rdSelectIn(focusIcons);
  const color = "#2c7ebdff";
  Browser.action.setBadgeBackgroundColor({ color });
  Browser.action.setBadgeText({ text });
}

function clearBadge() {
  const text = "";
  Browser.action.setBadgeText({ text });
}

const handleFocusSessionTypeChange = (focusTimer: FocusTimer, config: FocusTimerConfig) => {
  const timerData = getFocusDataFromConfig(focusTimer, config);
  if (timerData.isComplete) {
    return;
  }
  if (timerData.type == "break") {
    setBreakBadge();
  } else if (timerData.type == "focus") {
    setFocusBadge();
    console.log("focus badge set");
  } else {
    console.log("[ScrollRot] Someone cooked here");
  }

  const when = Date.now() + timerData.timeRemaining + 100;
  console.log(timerData.timeRemaining + 100);
  Browser.alarms.create(badgeAlarm, { when });
};

const newTimerLaunched = async (newValue: FocusTimer) => {
  const config = await getFocusTimerConfig();
  handleFocusSessionTypeChange(newValue, config);
};

focusTimerOnChangeListener(newTimerLaunched, () => {
  Browser.alarms.clear(badgeAlarm);
  clearBadge();
});

Browser.alarms.onAlarm.addListener((alarm) => {
  const callback = async () => {
    if (alarm.name !== badgeAlarm) {
      return;
    }
    const focusTimer: FocusTimer | null = await getFocusTimer();
    if (focusTimer == null) {
      clearBadge();
      return;
    }
    const config = await getFocusTimerConfig();
    handleFocusSessionTypeChange(focusTimer, config);
  };
  callback();
});

Browser.runtime.onStartup.addListener(async () => {
  const callback = async () => {
    const focusTimer: FocusTimer | null = await getFocusTimer();
    if (focusTimer == null) {
      clearBadge();
      return;
    }
    const config = await getFocusTimerConfig();
    handleFocusSessionTypeChange(focusTimer, config);
  };
  callback();
});
