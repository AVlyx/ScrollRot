import type { Platform } from "./platform";

export interface BlockerConfig {
  enabled: boolean;
  autoPlayAfterBlock: boolean;
  blockDuration: number;
  customDuration: boolean;
}

export const blockerConfigDefault: BlockerConfig = {
  enabled: true,
  autoPlayAfterBlock: true,
  blockDuration: 5,
  customDuration: false,
};

export type AllBlockerConfigs = Record<Platform, BlockerConfig>;
