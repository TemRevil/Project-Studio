import type { ColorPalette, VideoType } from "../types";

export const PALETTE_PRESETS: Record<string, ColorPalette> = {
  "navy-sky": {
    name: "Navy & Sky (Default)",
    mainBackground: "#16425b",
    primaryText: "#e7e7e7",
    accentColor: "#81c3d7",
    emphasisColor: "#ed1c24",
    surfaceColor: "#e7e7e7",
    secondaryColor: "#d5c5c8",
  },
  "dark-gold": {
    name: "Dark & Gold",
    mainBackground: "#1a1a2e",
    primaryText: "#eaeaea",
    accentColor: "#f0c040",
    emphasisColor: "#e05252",
    surfaceColor: "#f0f0f0",
    secondaryColor: "#c8b89a",
  },
  "forest-cream": {
    name: "Forest & Cream",
    mainBackground: "#1e3a2f",
    primaryText: "#f5f0e8",
    accentColor: "#7ec8a0",
    emphasisColor: "#e05252",
    surfaceColor: "#f5f0e8",
    secondaryColor: "#c8b89a",
  },
  "mono-red": {
    name: "Monochrome & Red",
    mainBackground: "#111111",
    primaryText: "#f0f0f0",
    accentColor: "#ff4444",
    emphasisColor: "#ff8800",
    surfaceColor: "#f0f0f0",
    secondaryColor: "#888888",
  },
  custom: {
    name: "Custom...",
    mainBackground: "#16425b",
    primaryText: "#e7e7e7",
    accentColor: "#81c3d7",
    emphasisColor: "#ed1c24",
    surfaceColor: "#e7e7e7",
    secondaryColor: "#d5c5c8",
  },
};

export const DEFAULT_PALETTE_KEY = "navy-sky";

export const resolveColorPalette = (paletteKey?: string, customPalette?: ColorPalette): ColorPalette => {
  if (paletteKey === "custom" && customPalette) {
    return customPalette;
  }

  return PALETTE_PRESETS[paletteKey ?? DEFAULT_PALETTE_KEY] ?? PALETTE_PRESETS[DEFAULT_PALETTE_KEY];
};

export interface VideoStyle {
  name: string;
  description: string;
  defaultType: VideoType;
  defaultSarcasm: boolean;
  toneHint: string;
  pacingHint: string;
}

export const VIDEO_STYLES: Record<string, VideoStyle> = {
  "kinetic-fast": {
    name: "Kinetic Fast (Default)",
    description: "Bold text, hard cuts, Instagram-native pacing",
    defaultType: "kinetic",
    defaultSarcasm: true,
    toneHint: "Fast, punchy, confident. Short sentences. Hard cuts. No fluff.",
    pacingHint: "3 scenes max for 30s. Each scene is ONE idea. No scene longer than 10 words narration.",
  },
  explainer: {
    name: "Explainer",
    description: "Clear, structured, educational",
    defaultType: "slides",
    defaultSarcasm: false,
    toneHint: "Clear, structured, patient. Build understanding step by step.",
    pacingHint: "Allow scenes to breathe. Each scene can be 12-15 seconds for 30s total.",
  },
  "system-diagram": {
    name: "System Diagram",
    description: "Flow-based, technical, architecture-focused",
    defaultType: "motion",
    defaultSarcasm: false,
    toneHint: "Technical, precise, visual-first. Let the diagram do the work.",
    pacingHint: "Scenes are beats of the flow. Build the diagram progressively.",
  },
  story: {
    name: "Story / Narrative",
    description: "Problem → conflict → resolution arc",
    defaultType: "kinetic",
    defaultSarcasm: true,
    toneHint: "Narrative arc. Start with a problem, end with an insight. Story structure.",
    pacingHint: "Act 1 (hook+problem): 40%. Act 2 (mechanism): 35%. Act 3 (payoff): 25%.",
  },
};

export const DEFAULT_VIDEO_STYLE_KEY = "kinetic-fast";

export const resolveVideoStyle = (styleKey?: string): VideoStyle => {
  return VIDEO_STYLES[styleKey ?? DEFAULT_VIDEO_STYLE_KEY] ?? VIDEO_STYLES[DEFAULT_VIDEO_STYLE_KEY];
};
