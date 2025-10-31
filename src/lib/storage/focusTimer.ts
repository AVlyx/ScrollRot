import type { FocusTimer } from "@/types/focusTimer";

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
  chrome.storage.local.remove("focusTimer");
}
