import { type Platform } from "@/types";

export async function setNumberWatchedShortVids(platform: Platform, watched: number) {
  await chrome.storage.local.set({ [`nwatched${platform}`]: watched });
}

export async function getNumberWatchedShortVids(platform: Platform): Promise<number> {
  try {
    const data = await chrome.storage.local.get(`nwatched${platform}`);
    const result = (data[`nwatched${platform}`] ?? null) as number | null;
    if (result == null) {
      return 0;
    }
    return result;
  } catch (err) {
    console.error("Failed to load configs:", err);
    return 0;
  }
}
