import { DEFAULT_PALETTE_KEY, resolveColorPalette } from "./studio/presets";

export type VideoType = "animation" | "motion" | "slides" | "kinetic" | "images" | "hybrid";
export type VideoFormat = "reel" | "video" | "square";
export type CharacterExpression =
  | "idle"
  | "talking"
  | "thinking"
  | "surprised"
  | "pointing"
  | "laughing"
  | "explaining"
  | "shrug";
export type VisualElementKind =
  | "card"
  | "thread"
  | "label"
  | "icon"
  | "lantern"
  | "library"
  | "arrow"
  | "hero"
  | "support"
  | "annotation"
  | "image";
export type VisualType = "diagram" | "icon" | "text-only" | "image" | "flow" | "kinetic";
export type GenerationMode = "production" | "preview";
export type QualityMode = "production" | "balanced" | "fast";
export type VideoStatus = "draft" | "approved" | "rendered";

export interface Position {
  x: string;
  y: string;
}

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
  frame?: number;
  endFrame?: number;
}

export interface VoiceDirection {
  emotion: "excited" | "confident" | "serious" | "calm" | "sarcastic";
  speed: number;
  pauseBeforeMs: number;
  pauseAfterMs: number;
  emphasis: string[];
}

export interface ColorPalette {
  name: string;
  mainBackground: string;
  primaryText: string;
  accentColor: string;
  emphasisColor: string;
  surfaceColor: string;
  secondaryColor: string;
}

export type SceneEntryVariant =
  | "slam-from-top"
  | "slam-from-bottom"
  | "slam-from-left"
  | "slam-from-right"
  | "zoom-in"
  | "instant";

export interface VisualElement {
  id: string;
  kind: VisualElementKind;
  label?: string;
  position: Position;
  anchor?: "top-left" | "top-center" | "top-right" | "center-left" | "center-center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
  scale?: number;
  rotate?: number;
  zIndex?: number;
  entryFrame: number;
  triggersOnWord?: string | null;
  entryDelayMs?: number;
  opacity?: number;
  isTeal?: boolean;
  isRed?: boolean;
}

export interface VisualConfig {
  type: VisualType;
  elements: VisualElement[];
  background?: "light" | "dark" | "navy";
}

export interface TealElementConfig {
  kind: "thread" | "glow" | "border" | "text" | "line";
  appearsAtFrame: number;
}

export interface CharacterSceneConfig {
  expression: CharacterExpression;
  position: "left" | "center" | "right";
  entryFrame?: number;
}

export interface SFXCue {
  id: string;
  file: string;
  frame: number;
  volume?: number;
  durationFrames?: number;
  triggersOnWord?: string | null;
}

export interface SceneConfig {
  id: string;
  startSecond: number;
  endSecond: number;
  narration: string;
  voiceId?: string;
  emotion?: string;
  speed: number;
  audioFile?: string;
  voiceDirection?: VoiceDirection;
  wordTimestamps: WordTimestamp[];
  audioDurationSeconds: number;
  entryVariant?: SceneEntryVariant;
  visual: VisualConfig;
  character?: CharacterSceneConfig;
  tealElement?: TealElementConfig;
  sfxCues?: SFXCue[];
}

export interface BackgroundMusicConfig {
  file: string;
  baseVolume: number;
  duckedVolume: number;
  loop: boolean;
}

export interface RuntimeMedia {
  narrationFile?: string;
  sceneNarrationFiles?: Record<string, string>;
  backgroundMusicFile?: string;
}

export interface VideoScript {
  version: 2 | 3;
  status: VideoStatus;
  topic: string;
  slug: string;
  type: VideoType;
  format: VideoFormat;
  durationSeconds: number;
  sarcasm: boolean;
  mode: GenerationMode;
  quality: QualityMode;
  videoStyle?: string;
  paletteKey?: string;
  customPalette?: ColorPalette;
  scenes: SceneConfig[];
  audioFile?: string;
  audioDurationFrames?: number;
  backgroundMusic?: BackgroundMusicConfig;
  runMetadata?: {
    generatedAt: string;
    provider?: string;
    repaired: boolean;
  };
}

export const FORMAT_CONFIG = {
  reel: { width: 1080, height: 1920, fps: 30, safeTop: 150, safeBottom: 200, safeHorizontal: 60 },
  video: { width: 1920, height: 1080, fps: 30, safeTop: 80, safeBottom: 80, safeHorizontal: 80 },
  square: { width: 1080, height: 1080, fps: 30, safeTop: 80, safeBottom: 80, safeHorizontal: 80 },
} as const;

export const SAFE_POSITIONS = {
  center: { x: "50%", y: "45%" },
  upperCenter: { x: "50%", y: "28%" },
  lowerCenter: { x: "50%", y: "65%" },
  leftThird: { x: "25%", y: "45%" },
  rightThird: { x: "75%", y: "45%" },
  topLeft: { x: "25%", y: "28%" },
  topRight: { x: "75%", y: "28%" },
  bottomLeft: { x: "25%", y: "65%" },
  bottomRight: { x: "75%", y: "65%" },
} as const;

const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;

  const parsed = Number.parseInt(value, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
};

const mixHex = (base: string, target: string, amount: number) => {
  const start = hexToRgb(base);
  const end = hexToRgb(target);

  return `#${[start.r, start.g, start.b]
    .map((channel, index) => {
      const targetChannel = [end.r, end.g, end.b][index];
      return clampChannel(channel + (targetChannel - channel) * amount).toString(16).padStart(2, "0");
    })
    .join("")}`;
};

export const toRgba = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

export const buildRuntimeColors = (
  paletteKey: string = DEFAULT_PALETTE_KEY,
  customPalette?: ColorPalette,
) => {
  const palette = resolveColorPalette(paletteKey, customPalette);

  return {
    navy: palette.mainBackground,
    sky: palette.accentColor,
    red: palette.emphasisColor,
    smoke: palette.primaryText,
    mauve: palette.secondaryColor,
    navyDark: mixHex(palette.mainBackground, "#000000", 0.35),
    navyLight: mixHex(palette.mainBackground, "#ffffff", 0.18),
    skyDark: mixHex(palette.accentColor, "#000000", 0.22),
    skyLight: mixHex(palette.accentColor, "#ffffff", 0.28),
    redDark: mixHex(palette.emphasisColor, "#000000", 0.24),
    smokeDeep: mixHex(palette.primaryText, "#000000", 0.12),
    mauveLight: mixHex(palette.surfaceColor, "#ffffff", 0.08),
    cream: palette.surfaceColor,
    offWhite: mixHex(palette.surfaceColor, "#ffffff", 0.08),
    kraft: palette.secondaryColor,
    warmShadow: toRgba(palette.mainBackground, 0.18),
    darkText: mixHex(palette.mainBackground, "#000000", 0.08),
    teal: palette.accentColor,
    tealLight: mixHex(palette.accentColor, "#ffffff", 0.28),
    tealDark: mixHex(palette.accentColor, "#000000", 0.22),
    darkBg: mixHex(palette.mainBackground, "#000000", 0.42),
    shadowDark: toRgba(palette.mainBackground, 0.20),
    shadowLight: toRgba(palette.mainBackground, 0.10),
    shadowSky: toRgba(palette.accentColor, 0.30),
  } as const;
};

export const buildRuntimeShadows = (colors = buildRuntimeColors()) => ({
  card: `0px 4px 12px ${toRgba(colors.navy, 0.18)}`,
  light: `0px 2px 6px ${toRgba(colors.navy, 0.12)}`,
  sky: `0px 4px 16px ${toRgba(colors.sky, 0.28)}`,
  glow: `0 0 40px ${toRgba(colors.sky, 0.35)}`,
}) as const;

export const getActivePalette = (paletteKey?: string, customPalette?: ColorPalette) =>
  buildRuntimeColors(paletteKey ?? DEFAULT_PALETTE_KEY, customPalette);
export const getActiveShadows = (paletteKey?: string, customPalette?: ColorPalette) =>
  buildRuntimeShadows(getActivePalette(paletteKey, customPalette));

export const COLORS = getActivePalette();
export const SHADOWS = buildRuntimeShadows(COLORS);
export type RuntimeColors = ReturnType<typeof buildRuntimeColors>;
export type RuntimeShadows = ReturnType<typeof buildRuntimeShadows>;

export const SPRING = {
  default: { stiffness: 140, damping: 18 },
  snappy: { stiffness: 200, damping: 20 },
  soft: { stiffness: 80, damping: 20 },
  punch: { stiffness: 280, damping: 20, mass: 0.8 },
  slam: { stiffness: 400, damping: 14, mass: 0.6 },
  character: { stiffness: 120, damping: 18 },
} as const;
