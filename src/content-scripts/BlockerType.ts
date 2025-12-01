import type { Blocker as InstaBlocker } from "./instagram/blocker";
import type { Blocker as YoutubeBlocker } from "./youtube/blocker";
import type { Blocker as TikTokBlocker } from "./tiktok/blocker";
import type { Blocker as FacebookBlocker } from "./facebook/blocker";
import type { Blocker as SnapChatBlocker } from "./snapchat/blocker";

export type BlockerType =
  | InstaBlocker
  | YoutubeBlocker
  | TikTokBlocker
  | FacebookBlocker
  | SnapChatBlocker;
