import type { FocusTimer, FocusTimerConfig } from "@/types";

export async function getFocusTimer(): Promise<FocusTimer | null> {
  try {
    const result = await chrome.storage.local.get("focusTimer");
    const focusTimer = (result.focusTimer ?? null) as FocusTimer | null;
    if (!focusTimer) {
      return null;
    }
    console.log({ focusTimer });
    return focusTimer;
  } catch (err) {
    console.error("Failed to load focusTimer:", err);
    return null;
  }
}

export async function setFocusTimer(focusTimer: FocusTimer) {
  await chrome.storage.local.set({ focusTimer });
}

export async function clearFocusTimer() {
  await chrome.storage.local.remove("focusTimer");
}

export async function getFocusTimerConfig(): Promise<FocusTimerConfig> {
  try {
    const result = await chrome.storage.local.get("focusTimerConfig");
    const focusTimerConfig = (result.focusTimerConfig ?? null) as FocusTimerConfig;
    if (!focusTimerConfig) {
      return defaultFocusTimerConfig;
    }
    console.log({ focusTimerConfig });
    return focusTimerConfig;
  } catch (err) {
    console.error("Failed to load focusTimerConfig:", err);
    return defaultFocusTimerConfig;
  }
}

export async function setFocusTimerConfig(focusTimerConfig: FocusTimerConfig) {
  await chrome.storage.local.set({ focusTimerConfig });
}

export const defaultFocusTimerConfig: FocusTimerConfig = {
  focusTime: 25,
  pauseTime: 5,
  numberOfFocusSessions: 4,
};

export function focusTimerOnChangeListener(
  callback: (newvalue: FocusTimer) => void,
  onclear: () => void = () => {}
): () => void {
  const callbackGuard = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    console.log({ changes });
    if (areaName !== "local" || !changes.focusTimer) {
      return;
    }
    const { newValue } = changes.focusTimer as {
      newValue?: FocusTimer;
    };
    console.log({ newValue });
    if (!newValue) {
      onclear();
    } else {
      callback(newValue);
    }
  };

  chrome.storage.onChanged.addListener(callbackGuard);

  return () => chrome.storage.onChanged.removeListener(callbackGuard);
}
