import isEqual from "fast-deep-equal";
import {
  blockerConfigDefault,
  PLATFORMS,
  type AllBlockerConfigs,
  type BlockerConfig,
  type Platform,
} from "@/types";
import Browser from "webextension-polyfill";

export async function getAllBlockerConfig(): Promise<AllBlockerConfigs | null> {
  try {
    const result = await Browser.storage.local.get("blockerConfigs");
    const blockerConfigsPartial = (result.blockerConfigs ??
      null) as Partial<AllBlockerConfigs> | null;

    if (!blockerConfigsPartial) {
      return null;
    }

    const allPlatforms = Object.keys(PLATFORMS) as Platform[];
    const fullConfig = Object.fromEntries(
      allPlatforms.map((platform) => [
        platform,
        { ...blockerConfigDefault, ...(blockerConfigsPartial[platform] ?? {}) },
      ])
    ) as AllBlockerConfigs;

    return fullConfig;
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
  await Browser.storage.local.set({ blockerConfigs: allConfig });
}

export function blockerConfigOnChangeListener(
  platform: Platform,
  callback: (config: BlockerConfig) => void
): () => void {
  const callbackGuard = (
    changes: { [key: string]: Browser.Storage.StorageChange },
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

  Browser.storage.onChanged.addListener(callbackGuard);

  return () => Browser.storage.onChanged.removeListener(callbackGuard);
}
