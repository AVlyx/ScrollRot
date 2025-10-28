import type { AllBlockerConfigs, BlockerConfig, Platform } from "../types";

export async function getAllBlockerConfig(): Promise<AllBlockerConfigs | null> {
  try {
    const result = await chrome.storage.local.get("blockerConfigs");
    const blockerConfigs = (result.blockerConfigs ?? null) as AllBlockerConfigs | null;
    if (!blockerConfigs) {
      return null;
    }
    return blockerConfigs;
  } catch (err) {
    console.error("Failed to load configs:", err);
    return null;
  }
}

export async function getBlockerConfig(platform: Platform): Promise<BlockerConfig> {
  const allconfig: AllBlockerConfigs | null = await getAllBlockerConfig();
  if (!allconfig) {
    return {
      enabled: true,
      autoPlayAfterBlock: true,
      blockDuration: 5000,
    };
  }
  return allconfig[platform];
}

export async function setAllBlockerConfig(allConfig: AllBlockerConfigs) {
  await chrome.storage.local.set({ blockerConfigs: allConfig });
}
