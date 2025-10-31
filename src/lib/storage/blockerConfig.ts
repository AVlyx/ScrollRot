import isEqual from "fast-deep-equal";
import {
  blockerConfigDefault,
  type AllBlockerConfigs,
  type BlockerConfig,
  type Platform,
} from "@/types";

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
    return blockerConfigDefault;
  }
  return allconfig[platform];
}

export async function setAllBlockerConfig(allConfig: AllBlockerConfigs) {
  await chrome.storage.local.set({ blockerConfigs: allConfig });
}

export function blockerConfigOnChange(
  platform: Platform,
  callback: (config: BlockerConfig) => void
): () => void {
  const callbackGuard = (
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ) => {
    if (areaName !== "local" || !changes.blockerConfigs) {
      return;
    }
    const { oldValue, newValue } = changes.blockerConfigs as {
      oldValue?: AllBlockerConfigs;
      newValue?: AllBlockerConfigs;
    };
    const newConfig = newValue?.[platform];
    if (!newConfig) {
      return;
    }
    if (!oldValue) {
      return callback(newConfig);
    }
    const oldConfig = oldValue[platform];
    if (isEqual(newConfig, oldConfig)) {
      return;
    }
    callback(newConfig);
  };

  chrome.storage.onChanged.addListener(callbackGuard);

  return () => chrome.storage.onChanged.removeListener(callbackGuard);
}
