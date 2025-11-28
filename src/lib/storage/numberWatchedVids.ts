import { type Platform } from "@/types";
import Browser from "webextension-polyfill";

interface WatchedData {
  count: number;
  lastResetDate: string; // ISO date string (YYYY-MM-DD)
}

function getResetDate(date: Date = new Date()): string {
  // If it's before 3am, consider it part of the previous day
  const resetDate = new Date(date);
  if (resetDate.getHours() < 3) {
    resetDate.setDate(resetDate.getDate() - 1);
  }
  // Return date in YYYY-MM-DD format
  return resetDate.toISOString().split("T")[0];
}

function shouldReset(lastResetDate: string | undefined): boolean {
  if (!lastResetDate) return true;

  const currentResetDate = getResetDate();
  return lastResetDate !== currentResetDate;
}

export async function setNumberWatchedShortVids(platform: Platform, watched: number) {
  const data: WatchedData = {
    count: watched,
    lastResetDate: getResetDate(),
  };
  await Browser.storage.local.set({ [`nwatched${platform}`]: data });
}

export async function getNumberWatchedShortVids(platform: Platform): Promise<number> {
  try {
    const result = await Browser.storage.local.get(`nwatched${platform}`);
    const data = result[`nwatched${platform}`] as WatchedData | null | undefined;

    // Handle new format
    if (data && typeof data === "object" && "count" in data) {
      // Check if we need to reset
      if (shouldReset(data.lastResetDate)) {
        await setNumberWatchedShortVids(platform, 0);
        return 0;
      }
      return data.count;
    }

    // No data exists yet
    return 0;
  } catch (err) {
    console.error("Failed to load configs:", err);
    return 0;
  }
}
