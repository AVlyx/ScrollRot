export const PLATFORMS = {
  shorts: "YouTube Shorts",
  reels: "Instagram Reels",
  tiktok: "TikTok",
  facebook: "Facebook Reels",
  snapchat: "Snapchat Spotlight",
} as const;

export type Platform = keyof typeof PLATFORMS;

export const PLATFORM_ICONS: Record<Platform, string> = {
  shorts: "🎬",
  reels: "📸",
  tiktok: "🎵",
  facebook: "👥",
  snapchat: "👻",
};
