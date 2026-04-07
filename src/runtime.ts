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

export const COLORS = {
  navy: "#16425b",
  sky: "#81c3d7",
  red: "#ed1c24",
  smoke: "#e7e7e7",
  mauve: "#d5c5c8",
  navyDark: "#0d2333",
  navyLight: "#1e5578",
  skyDark: "#5a9cb5",
  skyLight: "#aad8e8",
  redDark: "#b5141a",
  smokeDeep: "#c8c8c8",
  mauveLight: "#ede0e2",
  cream: "#e7e7e7",
  offWhite: "#ede0e2",
  kraft: "#d5c5c8",
  warmShadow: "#5a9cb5",
  darkText: "#16425b",
  teal: "#81c3d7",
  tealLight: "#aad8e8",
  tealDark: "#5a9cb5",
  darkBg: "#0d2333",
  shadowDark: "rgba(22,66,91,0.20)",
  shadowLight: "rgba(22,66,91,0.10)",
  shadowSky: "rgba(129,195,215,0.30)",
} as const;

export const SHADOWS = {
  card: "0px 4px 12px rgba(22,66,91,0.18)",
  light: "0px 2px 6px rgba(22,66,91,0.12)",
  sky: "0px 4px 16px rgba(129,195,215,0.28)",
  glow: "0 0 40px rgba(129,195,215,0.35)",
} as const;

export const SPRING = {
  default: { stiffness: 140, damping: 18 },
  snappy: { stiffness: 200, damping: 20 },
  soft: { stiffness: 80, damping: 20 },
  punch: { stiffness: 280, damping: 20, mass: 0.8 },
  slam: { stiffness: 400, damping: 14, mass: 0.6 },
  character: { stiffness: 120, damping: 18 },
} as const;
