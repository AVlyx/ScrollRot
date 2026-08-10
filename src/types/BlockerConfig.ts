import type { Platform } from "./Platform";

export interface BlockerConfig {
  enabled: boolean;
  autoPlayAfterBlock: boolean;
  blockDuration: number;
  customDuration: boolean;
  grayscale: boolean;
  maxReelCount: number;
}

export const blockerConfigDefault: BlockerConfig = {
  enabled: true,
  autoPlayAfterBlock: true,
  blockDuration: 5,
  customDuration: false,
  grayscale: false,
  maxReelCount: 50,
};

export type AllBlockerConfigs = Record<Platform, BlockerConfig>;
