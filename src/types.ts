import { z } from "zod";

// ── Emotion constants for voice direction ──
export const VOICE_EMOTIONS = ["excited", "confident", "serious", "calm", "sarcastic"] as const;
export type VoiceEmotion = (typeof VOICE_EMOTIONS)[number];
export const SCENE_ENTRY_VARIANTS = [
  "slam-from-top",
  "slam-from-bottom",
  "slam-from-left",
  "slam-from-right",
  "zoom-in",
  "instant",
] as const;
export type SceneEntryVariant = (typeof SCENE_ENTRY_VARIANTS)[number];
export const SCENE_ROLES = [
  "opening",
  "answer",
  "graphic",
  "example",
  "comparison",
  "evidence",
  "punchline",
] as const;
export type SceneRole = (typeof SCENE_ROLES)[number];
export const OPENING_STYLES = ["question", "hook"] as const;
export type OpeningStyle = (typeof OPENING_STYLES)[number];
export const CAMERA_EASINGS = ["ease-in-out-cubic"] as const;
export type CameraEasing = (typeof CAMERA_EASINGS)[number];

export const EMOTION_SPEED_MAP: Record<VoiceEmotion, number> = {
  excited: 1.05,
  confident: 1.0,
  serious: 0.92,
  calm: 0.88,
  sarcastic: 0.95,
} as const;

export const PRODUCTION_VIDEO_TYPES = ["kinetic", "motion", "slides"] as const;
export const EXPERIMENTAL_VIDEO_TYPES = ["animation", "images", "hybrid"] as const;
export const VIDEO_TYPES = [...PRODUCTION_VIDEO_TYPES, ...EXPERIMENTAL_VIDEO_TYPES] as const;
export const VIDEO_FORMATS = ["reel", "video", "square"] as const;
export const CHARACTER_EXPRESSIONS = [
  "idle",
  "talking",
  "thinking",
  "surprised",
  "pointing",
  "laughing",
  "explaining",
  "shrug",
] as const;
export const VISUAL_ELEMENT_KINDS = [
  "card",
  "thread",
  "label",
  "icon",
  "lantern",
  "library",
  "arrow",
  "hero",
  "support",
  "annotation",
  "image",
] as const;
export const VISUAL_TYPES = ["diagram", "icon", "text-only", "image", "flow", "kinetic"] as const;
export const VISUAL_BACKGROUNDS = ["light", "dark", "navy"] as const;
export const GENERATION_MODES = ["production", "preview"] as const;
export const QUALITY_MODES = ["production", "balanced", "fast"] as const;
export const VIDEO_STATUSES = ["draft", "approved", "rendered"] as const;
export const RUN_STATUSES = ["succeeded", "failed", "blocked"] as const;
export const PROVIDERS = ["gemini", "openrouter"] as const;
export const ASSET_CATEGORIES = ["characters", "icons", "lottie", "music", "vfx"] as const;

export type ProductionVideoType = (typeof PRODUCTION_VIDEO_TYPES)[number];
export type ExperimentalVideoType = (typeof EXPERIMENTAL_VIDEO_TYPES)[number];
export type VideoType = (typeof VIDEO_TYPES)[number];
export type VideoFormat = (typeof VIDEO_FORMATS)[number];
export type CharacterExpression = (typeof CHARACTER_EXPRESSIONS)[number];
export type VisualElementKind = (typeof VISUAL_ELEMENT_KINDS)[number];
export type VisualType = (typeof VISUAL_TYPES)[number];
export type GenerationMode = (typeof GENERATION_MODES)[number];
export type QualityMode = (typeof QUALITY_MODES)[number];
export type VideoStatus = (typeof VIDEO_STATUSES)[number];
export type ProviderName = (typeof PROVIDERS)[number];
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const FORMAT_CONFIG = {
  reel: { width: 1080, height: 1920, fps: 30, safeTop: 150, safeBottom: 200, safeHorizontal: 60 },
  video: { width: 1920, height: 1080, fps: 30, safeTop: 80, safeBottom: 80, safeHorizontal: 80 },
  square: { width: 1080, height: 1080, fps: 30, safeTop: 80, safeBottom: 80, safeHorizontal: 80 },
} as const;

export const SAFE_POSITIONS = {
  center: { x: "50%", y: "45%", useCase: "Hero element, central concept." },
  upperCenter: { x: "50%", y: "28%", useCase: "Hook text, title, opener." },
  lowerCenter: { x: "50%", y: "65%", useCase: "Supporting text or follow-up beat." },
  leftThird: { x: "25%", y: "45%", useCase: "Left node for diagrams or motion." },
  rightThird: { x: "75%", y: "45%", useCase: "Right node, counterpoint, active state." },
  topLeft: { x: "25%", y: "28%", useCase: "Annotation, label, small explainer." },
  topRight: { x: "75%", y: "28%", useCase: "Counter label or contrast callout." },
  bottomLeft: { x: "25%", y: "65%", useCase: "Secondary card or visual support." },
  bottomRight: { x: "75%", y: "65%", useCase: "Secondary card or character-adjacent item." },
} as const;

export type SafePositionName = keyof typeof SAFE_POSITIONS;

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

const nonEmptyString = z.string().trim().min(1);
const percentageOrCoordinate = z.string().trim().min(1);
const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Expected hex color like #16425B");

export const PositionSchema = z.object({
  x: percentageOrCoordinate,
  y: percentageOrCoordinate,
});

export const CameraPoseSchema = z.object({
  x: percentageOrCoordinate,
  y: percentageOrCoordinate,
  scale: z.number().min(0.6).max(1.8),
});

export const CameraMoveSchema = z.object({
  from: CameraPoseSchema,
  to: CameraPoseSchema,
  easing: z.enum(CAMERA_EASINGS).default("ease-in-out-cubic"),
});

// ── Word-level timestamp from STT ──
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  frame: z.number().int().nonnegative().optional(),
  endFrame: z.number().int().nonnegative().optional(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

// ── Voice direction per scene ──
export const VoiceDirectionSchema = z.object({
  emotion: z.enum(VOICE_EMOTIONS).default("confident"),
  speed: z.number().min(0.5).max(2.0).default(1.0),
  pauseBeforeMs: z.number().nonnegative().default(0),
  pauseAfterMs: z.number().nonnegative().default(0),
  emphasis: z.array(z.string()).default([]),
});

export type VoiceDirection = z.infer<typeof VoiceDirectionSchema>;

export const ColorPaletteSchema = z.object({
  name: nonEmptyString,
  mainBackground: hexColor,
  primaryText: hexColor,
  accentColor: hexColor,
  emphasisColor: hexColor,
  surfaceColor: hexColor,
  secondaryColor: hexColor,
});

export type ColorPalette = z.infer<typeof ColorPaletteSchema>;

export const VisualElementSchema = z.object({
  id: nonEmptyString,
  kind: z.enum(VISUAL_ELEMENT_KINDS),
  label: z.string().trim().optional(),
  position: PositionSchema,
  anchor: z.enum(["top-left", "top-center", "top-right", "center-left", "center-center", "center-right", "bottom-left", "bottom-center", "bottom-right"]).optional(),
  scale: z.number().optional(),
  rotate: z.number().optional(),
  zIndex: z.number().int().optional(),
  entryFrame: z.number().int().nonnegative(),
  // v3: word-triggered timing (sync engine resolves to entryFrame)
  triggersOnWord: z.string().nullable().optional(),
  entryDelayMs: z.number().nonnegative().optional(),
  opacity: z.number().min(0).max(1).optional(),
  isTeal: z.boolean().optional(),
  isRed: z.boolean().optional(),
});

export const VisualConfigSchema = z.object({
  type: z.enum(VISUAL_TYPES),
  elements: z.array(VisualElementSchema).min(1),
  background: z.enum(VISUAL_BACKGROUNDS).optional(),
});

export const TealElementConfigSchema = z.object({
  kind: z.enum(["thread", "glow", "border", "text", "line"] as const),
  appearsAtFrame: z.number().int().nonnegative(),
});

export const CharacterSceneConfigSchema = z.object({
  expression: z.enum(CHARACTER_EXPRESSIONS),
  position: z.enum(["left", "center", "right"] as const),
  entryFrame: z.number().int().nonnegative().optional(),
});

export const SFXCueSchema = z.object({
  id: nonEmptyString,
  file: nonEmptyString,
  frame: z.number().int().nonnegative(),
  volume: z.number().min(0).max(1).optional(),
  durationFrames: z.number().int().positive().optional(),
  // v3: word-triggered SFX timing
  triggersOnWord: z.string().nullable().optional(),
});

export const SceneConfigSchema = z.object({
  id: nonEmptyString,
  startSecond: z.number().nonnegative(),
  endSecond: z.number().positive(),
  role: z.enum(SCENE_ROLES).default("answer"),
  openingStyle: z.enum(OPENING_STYLES).optional(),
  cameraSectionId: z.string().trim().optional(),
  cameraMove: CameraMoveSchema.optional(),
  narration: nonEmptyString,
  voiceId: z.string().optional(),
  emotion: z.string().optional(),
  speed: z.number().default(1),
  audioFile: z.string().optional(),
  // v3: voice direction and word timestamps
  voiceDirection: VoiceDirectionSchema.optional(),
  wordTimestamps: z.array(WordTimestampSchema).default([]),
  audioDurationSeconds: z.number().nonnegative().default(0),
  entryVariant: z.enum(SCENE_ENTRY_VARIANTS).optional(),
  visual: VisualConfigSchema,
  character: CharacterSceneConfigSchema.optional(),
  tealElement: TealElementConfigSchema.optional(),
  sfxCues: z.array(SFXCueSchema).optional(),
});

export const BackgroundMusicSchema = z.object({
  file: nonEmptyString,
  baseVolume: z.number().min(0).max(1),
  duckedVolume: z.number().min(0).max(1),
  loop: z.boolean().default(true),
});

export const OperatorOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  skipAudio: z.boolean().default(false),
  autoApprove: z.boolean().default(true),
  includeMusic: z.boolean().default(true),
});

export const GenerationRequestSchema = z.object({
  topic: nonEmptyString,
  takeaway: z.string().trim().optional(),
  type: z.enum(VIDEO_TYPES),
  format: z.enum(VIDEO_FORMATS),
  durationSeconds: z.number().int().positive(),
  sarcasm: z.boolean(),
  mode: z.enum(GENERATION_MODES).default("production"),
  quality: z.enum(QUALITY_MODES).default("production"),
  operator: OperatorOptionsSchema.default({}),
  videoStyle: z.string().trim().optional(),
  paletteKey: z.string().trim().optional(),
  customPalette: ColorPaletteSchema.optional(),
});

export const NarrationDraftBlockSchema = z.object({
  id: nonEmptyString,
  roleHint: z.enum(SCENE_ROLES).optional(),
  text: nonEmptyString,
  keyTerms: z.array(nonEmptyString).default([]),
  visualHint: z.string().trim().optional(),
});

export const NarrationDraftSectionSchema = z.object({
  id: nonEmptyString,
  title: nonEmptyString,
  purpose: nonEmptyString,
  blocks: z.array(NarrationDraftBlockSchema).min(1),
});

export const NarrationDraftSchema = z.object({
  version: z.literal(1),
  slug: nonEmptyString,
  topic: nonEmptyString,
  type: z.enum(VIDEO_TYPES),
  durationSeconds: z.number().positive(),
  openingStyle: z.enum(OPENING_STYLES),
  thesis: nonEmptyString,
  narrativeSections: z.array(NarrationDraftSectionSchema).min(1),
  productionNotes: z.array(nonEmptyString).default([]),
});

export const GenerationPlanSceneSchema = z.object({
  id: nonEmptyString,
  objective: nonEmptyString,
  narration: nonEmptyString,
  visualType: z.enum(VISUAL_TYPES),
  startSecond: z.number().nonnegative(),
  endSecond: z.number().positive(),
  keyTerms: z.array(nonEmptyString).default([]),
  accentKeyword: z.string().trim().optional(),
  visualIntent: nonEmptyString,
  assetNeeds: z.array(nonEmptyString).default([]),
});

export const GenerationPlanSchema = z.object({
  version: z.literal(2),
  slug: nonEmptyString,
  request: GenerationRequestSchema,
  creativeDirection: z.object({
    hook: nonEmptyString,
    toneSummary: nonEmptyString,
    notes: z.array(nonEmptyString).default([]),
  }),
  scenes: z.array(GenerationPlanSceneSchema).min(1),
});

export const AssetFileSchema = z.object({
  id: nonEmptyString,
  category: z.enum(ASSET_CATEGORIES),
  relativePath: nonEmptyString,
  label: nonEmptyString,
  exists: z.boolean(),
  sizeBytes: z.number().int().nonnegative().optional(),
  metadataPath: z.string().trim().optional(),
});

export const AssetRequirementSchema = z.object({
  relativePath: nonEmptyString,
  required: z.boolean(),
  reason: nonEmptyString,
});

export const AssetManifestSchema = z.object({
  version: z.literal(2),
  generatedAt: nonEmptyString,
  categories: z.object({
    characters: z.array(AssetFileSchema),
    icons: z.array(AssetFileSchema),
    lottie: z.array(AssetFileSchema),
    music: z.array(AssetFileSchema),
    vfx: z.array(AssetFileSchema),
  }),
  requiredByType: z.object({
    kinetic: z.array(AssetRequirementSchema),
    motion: z.array(AssetRequirementSchema),
    slides: z.array(AssetRequirementSchema),
  }),
  summary: z.object({
    totalFiles: z.number().int().nonnegative(),
    missingProductionRequirements: z.number().int().nonnegative(),
  }),
});

export const RendererCapabilitiesManifestSchema = z.object({
  version: z.literal(2),
  productionTypes: z.array(z.enum(PRODUCTION_VIDEO_TYPES)).min(1),
  experimentalTypes: z.array(z.enum(EXPERIMENTAL_VIDEO_TYPES)),
  visualElementKinds: z.array(z.enum(VISUAL_ELEMENT_KINDS)).min(1),
  visualTypes: z.array(z.enum(VISUAL_TYPES)).min(1),
  safePositions: z.array(
    z.object({
      name: nonEmptyString,
      x: nonEmptyString,
      y: nonEmptyString,
      useCase: nonEmptyString,
    }),
  ),
  supportedTransitions: z.record(z.array(nonEmptyString)),
  syncEngine: z
    .object({
      version: z.number(),
      features: z.array(z.string()),
    })
    .optional(),
  limitations: z.array(nonEmptyString),
});

export const RulesDigestSchema = z.object({
  version: z.literal(2),
  files: z.array(
    z.object({
      path: nonEmptyString,
      title: nonEmptyString,
      excerpt: nonEmptyString,
    }),
  ),
});

export const RuntimeMediaSchema = z.object({
  narrationFile: z.string().trim().optional(),
  sceneNarrationFiles: z.record(z.string().trim()).optional(),
  backgroundMusicFile: z.string().trim().optional(),
});

export const RunStepSchema = z.object({
  name: nonEmptyString,
  status: z.enum(["pending", "running", "succeeded", "failed", "skipped"] as const),
  message: z.string().trim().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});

export const RunReportSchema = z.object({
  version: z.literal(2),
  slug: nonEmptyString,
  mode: z.enum(GENERATION_MODES),
  status: z.enum(RUN_STATUSES),
  startedAt: nonEmptyString,
  finishedAt: z.string().trim().optional(),
  outputDir: z.string().trim().optional(),
  issues: z.array(nonEmptyString).default([]),
  steps: z.array(RunStepSchema),
});

export const VideoScriptSchema = z
  .object({
    version: z.union([z.literal(2), z.literal(3)]),
    status: z.enum(VIDEO_STATUSES),
    topic: nonEmptyString,
    slug: nonEmptyString.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    type: z.enum(VIDEO_TYPES),
    format: z.enum(VIDEO_FORMATS),
    durationSeconds: z.number().positive(),
    sarcasm: z.boolean(),
    mode: z.enum(GENERATION_MODES),
    quality: z.enum(QUALITY_MODES),
    videoStyle: z.string().trim().optional(),
    paletteKey: z.string().trim().optional(),
    customPalette: ColorPaletteSchema.optional(),
    scenes: z.array(SceneConfigSchema).min(1),
    audioFile: z.string().trim().optional(),
    audioDurationFrames: z.number().int().positive().optional(),
    backgroundMusic: BackgroundMusicSchema.optional(),
    runMetadata: z
      .object({
        generatedAt: nonEmptyString,
        provider: z.string().trim().optional(),
        repaired: z.boolean().default(false),
      })
      .optional(),
  })
  .superRefine((script, ctx) => {
    let lastEnd = 0;
    let previousRedElement = 0;

    script.scenes.forEach((scene, index) => {
      if (scene.endSecond <= scene.startSecond) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene ${scene.id} must end after it starts.`,
          path: ["scenes", index, "endSecond"],
        });
      }

      if (index > 0 && scene.startSecond < lastEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Scene ${scene.id} overlaps the previous scene.`,
          path: ["scenes", index, "startSecond"],
        });
      }

      const redCount = scene.visual.elements.filter((element) => element.isRed).length;
      previousRedElement += redCount;
      lastEnd = scene.endSecond;
    });

    if (previousRedElement > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one red emphasis element is allowed per video.",
        path: ["scenes"],
      });
    }
  });

export type Position = z.infer<typeof PositionSchema>;
export type CameraPose = z.infer<typeof CameraPoseSchema>;
export type CameraMove = z.infer<typeof CameraMoveSchema>;
export type VisualElement = z.infer<typeof VisualElementSchema>;
export type VisualConfig = z.infer<typeof VisualConfigSchema>;
export type TealElementConfig = z.infer<typeof TealElementConfigSchema>;
export type CharacterSceneConfig = z.infer<typeof CharacterSceneConfigSchema>;
export type SFXCue = z.infer<typeof SFXCueSchema>;
export type SceneConfig = z.infer<typeof SceneConfigSchema>;
export type BackgroundMusicConfig = z.infer<typeof BackgroundMusicSchema>;
export type OperatorOptions = z.infer<typeof OperatorOptionsSchema>;
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;
export type NarrationDraftBlock = z.infer<typeof NarrationDraftBlockSchema>;
export type NarrationDraftSection = z.infer<typeof NarrationDraftSectionSchema>;
export type NarrationDraft = z.infer<typeof NarrationDraftSchema>;
export type GenerationPlanScene = z.infer<typeof GenerationPlanSceneSchema>;
export type GenerationPlan = z.infer<typeof GenerationPlanSchema>;
export type AssetFile = z.infer<typeof AssetFileSchema>;
export type AssetRequirement = z.infer<typeof AssetRequirementSchema>;
export type AssetManifest = z.infer<typeof AssetManifestSchema>;
export type RendererCapabilitiesManifest = z.infer<typeof RendererCapabilitiesManifestSchema>;
export type RulesDigest = z.infer<typeof RulesDigestSchema>;
export type RuntimeMedia = z.infer<typeof RuntimeMediaSchema>;
export type RunStep = z.infer<typeof RunStepSchema>;
export type RunReport = z.infer<typeof RunReportSchema>;
export type VideoScript = z.infer<typeof VideoScriptSchema>;

export const DEFAULT_GENERATION_REQUEST: GenerationRequest = {
  topic: "RAG Explained",
  type: "kinetic",
  format: "reel",
  durationSeconds: 30,
  sarcasm: true,
  mode: "production",
  quality: "production",
  videoStyle: undefined,
  paletteKey: undefined,
  customPalette: undefined,
  operator: {
    dryRun: false,
    skipAudio: false,
    autoApprove: true,
    includeMusic: true,
  },
};

export const isProductionVideoType = (type: VideoType): type is ProductionVideoType => {
  return (PRODUCTION_VIDEO_TYPES as readonly string[]).includes(type);
};
