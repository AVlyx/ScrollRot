import type { Platform } from "./Platform";

export interface BlockerConfig {
  enabled: boolean;
  autoPlayAfterBlock: boolean;
  blockDuration: number;
}

export type AllBlockerConfigs = Record<Platform, BlockerConfig>;
