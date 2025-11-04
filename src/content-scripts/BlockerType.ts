import type { Blocker as InstaBlocker } from "./instagram/blocker";
import type { Blocker as YoutubeBlocker } from "./youtube/blocker";
import type { Blocker as TikTokBlocker } from "./tiktok/blocker";

export type BlockerType = InstaBlocker | YoutubeBlocker | TikTokBlocker;
