import Conf from "conf";
import type { ColorPalette, QualityMode } from "../types";
import { DEFAULT_PALETTE_KEY, DEFAULT_VIDEO_STYLE_KEY, PALETTE_PRESETS } from "./presets";

export const CUSTOM_PALETTE_FIELDS = [
  "mainBackground",
  "primaryText",
  "accentColor",
  "emphasisColor",
  "surfaceColor",
  "secondaryColor",
] as const;

export type CustomPaletteField = (typeof CUSTOM_PALETTE_FIELDS)[number];

export interface StudioConfig {
  llmProvider: "gemini" | "openrouter";
  llmModel: string;
  defaultVideoType: "kinetic" | "motion" | "slides" | "animation" | "images" | "hybrid";
  defaultFormat: "reel" | "video" | "square";
  defaultDuration: number;
  defaultQuality: QualityMode;
  defaultVideoStyle: string;
  seriesName: string;
  autoOpenVideo: boolean;
  sarcasmDefault: boolean;
  includeMusicDefault: boolean;
  skipAudioDefault: boolean;
  colorPalette: string;
  customPalette: ColorPalette;
}

const defaultConfig: StudioConfig = {
  llmProvider: "gemini",
  llmModel: "gemini-2.5-pro",
  defaultVideoType: "kinetic",
  defaultFormat: "reel",
  defaultDuration: 30,
  defaultQuality: "production",
  defaultVideoStyle: DEFAULT_VIDEO_STYLE_KEY,
  seriesName: "Project Studio Shorts",
  autoOpenVideo: true,
  sarcasmDefault: true,
  includeMusicDefault: true,
  skipAudioDefault: false,
  colorPalette: DEFAULT_PALETTE_KEY,
  customPalette: { ...PALETTE_PRESETS.custom, name: "Custom Palette" },
};

export const config = new Conf<StudioConfig>({
  projectName: "project-studio-v2",
  defaults: defaultConfig,
});

export const updateConfig = (updates: Partial<StudioConfig>) => {
  for (const [key, value] of Object.entries(updates)) {
    config.set(key as keyof StudioConfig, value);
  }
};

export const isHexColor = (value: string) => /^#?[0-9a-fA-F]{6}$/.test(value.trim());

export const normalizeHexColor = (value: string) => {
  const trimmed = value.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

export const updateCustomPalette = (field: CustomPaletteField, value: string) => {
  const nextPalette: ColorPalette = {
    ...config.store.customPalette,
    name: "Custom Palette",
    [field]: normalizeHexColor(value),
  };

  updateConfig({
    colorPalette: "custom",
    customPalette: nextPalette,
  });
};
