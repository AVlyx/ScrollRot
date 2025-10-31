import type { Platform } from "./platform";

export interface BlockerConfig {
  enabled: boolean;
  autoPlayAfterBlock: boolean;
  blockDuration: number;
}

export const blockerConfigDefault: BlockerConfig = {
  enabled: true,
  autoPlayAfterBlock: true,
  blockDuration: 5000,
};

export type AllBlockerConfigs = Record<Platform, BlockerConfig>;
