import type { AdSize } from "./types";

export const AD_SIZES: AdSize[] = [
  { id: "300x600", label: "Halfpage", width: 300, height: 600 },
  { id: "300x250", label: "Medium Rectangle", width: 300, height: 250 },
  { id: "728x90", label: "Leaderboard", width: 728, height: 90 },
  { id: "1080x1080", label: "Social Square", width: 1080, height: 1080 },
  { id: "160x600", label: "Wide Skyscraper", width: 160, height: 600 },
  { id: "320x50", label: "Mobile Banner", width: 320, height: 50 },
];

/** Default animation duration in seconds (used when not specified in manifest) */
export const DEFAULT_DURATION = 5;

/** Colors for timeline animation bars (by index) */
export const TIMELINE_COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
];
