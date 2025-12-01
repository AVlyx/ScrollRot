export const PLATFORMS = {
  shorts: "YouTube Shorts",
  reels: "Instagram Reels",
  tiktok: "TikTok",
  facebook: "Facebook Reels",
  snapchat: "Snapchat Spotlight",
} as const;

export type Platform = keyof typeof PLATFORMS;
