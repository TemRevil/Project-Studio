import type { z } from "zod";
import {
  FORMAT_CONFIG,
  GenerationPlanSchema,
  GenerationRequestSchema,
  PRODUCTION_VIDEO_TYPES,
  SAFE_POSITIONS,
  VideoScriptSchema,
  type AssetManifest,
  type BackgroundMusicConfig,
  type GenerationPlan,
  type GenerationRequest,
  type GenerationPlanScene,
  type RendererCapabilitiesManifest,
  type RulesDigest,
  type SceneConfig,
  type VideoScript,
  type VideoType,
  type SceneEntryVariant,
} from "../types";
import { buildRendererCapabilitiesManifest } from "./capabilities";
import { buildAssetManifest, buildFallbackAssetList, buildStudioNotes, findAssetByRelativePath, listMissingProductionRequirements, pickBackgroundMusic } from "./assets";
import { buildRulesDigest } from "./rules";
import { loadEnv, loadStudioConfig, type ProjectEnv, type StudioConfig } from "./env";
import { PreflightFailure, UnsupportedCapabilityFailure } from "./errors";
import { buildPlanPrompt, buildScriptPrompt } from "./prompts";
import { generateStructuredOutput } from "./providers";
import { slugify } from "./storage";
import { DEFAULT_PALETTE_KEY, DEFAULT_VIDEO_STYLE_KEY } from "../studio/presets";

export interface ProjectContext {
  env: ProjectEnv;
  config: StudioConfig;
  assetManifest: AssetManifest;
  assetInventoryNotes: string;
  capabilities: RendererCapabilitiesManifest;
}

export interface DraftPackage {
  request: GenerationRequest;
  project: ProjectContext;
  rules: RulesDigest;
  plan: GenerationPlan;
  script: VideoScript;
  providerUsed: string;
  repaired: boolean;
  warnings: string[];
}

const isProductionType = (type: VideoType) => (PRODUCTION_VIDEO_TYPES as readonly string[]).includes(type);

const buildContext = (projectRoot: string): ProjectContext => {
  const env = loadEnv();
  const config = loadStudioConfig(projectRoot, env);
  const assetManifest = buildAssetManifest(projectRoot);
  let assetInventoryNotes = buildFallbackAssetList(assetManifest);

  try {
    assetInventoryNotes = buildStudioNotes(projectRoot, assetManifest);
  } catch {
    assetInventoryNotes = buildFallbackAssetList(assetManifest);
  }

  const capabilities = buildRendererCapabilitiesManifest();

  return {
    env,
    config,
    assetManifest,
    assetInventoryNotes,
    capabilities,
  };
};

export const createRequest = (input: Partial<GenerationRequest>, projectRoot: string): GenerationRequest => {
  const context = buildContext(projectRoot);
  return GenerationRequestSchema.parse({
    topic: input.topic ?? "RAG Explained",
    takeaway: input.takeaway,
    type: input.type ?? context.config.defaults.type,
    format: input.format ?? context.config.defaults.format,
    durationSeconds: input.durationSeconds ?? context.config.defaults.durationSeconds,
    sarcasm: input.sarcasm ?? true,
    mode: input.mode ?? "production",
    quality: input.quality ?? context.config.defaults.quality,
    videoStyle: input.videoStyle ?? DEFAULT_VIDEO_STYLE_KEY,
    paletteKey: input.paletteKey ?? DEFAULT_PALETTE_KEY,
    customPalette: input.customPalette,
    operator: {
      includeMusic: input.operator?.includeMusic ?? context.config.defaults.includeMusic,
      dryRun: input.operator?.dryRun ?? false,
      skipAudio: input.operator?.skipAudio ?? false,
      autoApprove: input.operator?.autoApprove ?? true,
    },
  });
};

const splitNarration = (value: string) => {
  const words = value.split(/\s+/).filter(Boolean);
  const hero = words.slice(0, Math.min(3, words.length)).join(" ");
  const support = words.slice(Math.min(3, words.length)).join(" ");
  return { hero, support };
};

const sceneCountForDuration = (durationSeconds: number) => {
  if (durationSeconds <= 30) {
    return 3;
  }

  if (durationSeconds <= 60) {
    return 5;
  }

  return 7;
};

const buildFallbackNarrations = (request: GenerationRequest) => {
  const topic = request.topic.trim();
  const whatIsMatch = /^what(?:'s| is)\s+(.+)$/i.exec(topic);
  const subject = whatIsMatch?.[1]?.trim() ?? topic;

  const subjectSpecific = [
    `Most people think ${subject} is a minor upgrade. It is usually a repair for something foundational that kept failing quietly. The interesting part is where the old system breaks first.`,
    `The previous approach looks fine in a demo, then falls apart in production. Rare cases expose the missing detail, and users blame the model instead of the pipeline behind it.`,
    `${subject} changes the step where the error first appears. Instead of cleaning up a bad answer later, it feeds the system better context or better math before the answer forms.`,
    `That matters because small errors compound fast. One weak assumption becomes a wrong retrieval, then a wrong response, then a confident explanation no one can trust.`,
    `The result feels like intelligence, but the real win is reliability. ${subject} makes the system less dramatic by making each step more grounded and deliberate.`,
    `Teams adopt ${subject} when they need repeatability, not novelty. It turns a clever prototype into something operators can predict, measure, and defend in production.`,
    `${subject} is not magic added at the end. It is the design choice that stops the wrong answer from becoming inevitable.`,
  ];

  if (whatIsMatch) {
    return subjectSpecific;
  }

  return [
    `${topic} looks abstract until you see the failure it prevents. The old system keeps one hidden weakness, and that weakness shows up exactly when the stakes get real.`,
    `Most teams notice the symptom first. Outputs drift, latency spikes, or edge cases go weird. The harder part is noticing which step in the pipeline introduced that instability.`,
    `${topic} fixes the mechanism, not just the presentation. It changes the way information gets processed before the final answer, which is why the output starts feeling more trustworthy.`,
    `That design choice matters because errors do not stay local. One bad approximation contaminates the next step, then the next, until the user sees a confident result built on the wrong premise.`,
    `Once ${topic} is in place, the system behaves less like a magic trick and more like infrastructure. Inputs, timing, and evidence start lining up instead of fighting each other.`,
    `That is why experienced teams care about ${topic}. It is not only about smarter output. It is about predictable behavior under pressure.`,
    `${topic} does not make complexity disappear. It forces the important part of the system into the open, where it can finally be controlled.`,
  ];
};

const countWords = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

const verifyNarrationWordCount = (script: VideoScript, targetDurationSeconds: number) => {
  const totalWords = script.scenes.reduce((sum, scene) => sum + countWords(scene.narration), 0);
  const wordsPerSecond = 2.4;
  const expectedDuration = totalWords / wordsPerSecond;
  const deficit = targetDurationSeconds - expectedDuration;

  return {
    totalWords,
    expectedDuration,
    deficit,
    isSufficient: expectedDuration >= targetDurationSeconds * 0.85,
  };
};

const getDefaultKineticEntryVariant = (sceneIndex: number): SceneEntryVariant => {
  if (sceneIndex === 0) {
    return "slam-from-bottom";
  }

  const variants: SceneEntryVariant[] = [
    "slam-from-left",
    "slam-from-right",
    "slam-from-top",
    "slam-from-bottom",
  ];

  return variants[sceneIndex % variants.length];
};

const createLocalPlan = (request: GenerationRequest): GenerationPlan => {
  const slug = slugify(request.topic);
  const sceneCount = sceneCountForDuration(request.durationSeconds);
  const sceneDuration = Number((request.durationSeconds / sceneCount).toFixed(2));
  const baseNarrations = buildFallbackNarrations(request);

  const scenes: GenerationPlanScene[] = Array.from({ length: sceneCount }, (_, index) => {
    const startSecond = Number((index * sceneDuration).toFixed(2));
    const endSecond = index === sceneCount - 1 ? request.durationSeconds : Number(((index + 1) * sceneDuration).toFixed(2));
    const narration = baseNarrations[index] ?? baseNarrations[baseNarrations.length - 1];
    return {
      id: `scene-${index + 1}`,
      objective: `Explain beat ${index + 1} of ${request.topic}.`,
      narration,
      visualType: request.type === "kinetic" ? "kinetic" : request.type === "motion" ? "flow" : "text-only",
      startSecond,
      endSecond,
      keyTerms: narration
        .replace(/[^\w\s-]/g, "")
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .slice(0, 4),
      accentKeyword: narration.split(/\s+/)[0],
      visualIntent: `Professional ${request.type} beat with one clear concept and one accent moment.`,
      assetNeeds: [],
    };
  });

  return GenerationPlanSchema.parse({
    version: 2,
    slug,
    request,
    creativeDirection: {
      hook: scenes[0]?.narration ?? request.topic,
      toneSummary: request.sarcasm ? "Dry, direct, slightly amused." : "Direct, clean, calm.",
      notes: [
        "Dry-run plans stay inside supported renderer capabilities.",
        "The operator can replace this with a provider-backed draft later.",
      ],
    },
    scenes,
  });
};

const buildKineticScene = (scene: GenerationPlanScene, index: number, totalScenes: number): SceneConfig => {
  const fps = FORMAT_CONFIG.reel.fps;
  const sceneFrames = Math.round((scene.endSecond - scene.startSecond) * fps);
  const { hero, support } = splitNarration(scene.narration);
  const finalScene = index === totalScenes - 1;

  // Extract trigger word from narration
  const heroWords = (hero || scene.narration).split(/\s+/).filter(Boolean);
  const heroTrigger = heroWords[0] || null;
  const supportWords = (support || "").split(/\s+/).filter(Boolean);
  const supportTrigger = supportWords.length > 0 ? supportWords[supportWords.length - 1] : null;

  return {
    id: scene.id,
    startSecond: scene.startSecond,
    endSecond: scene.endSecond,
    narration: scene.narration,
    voiceId: index % 2 === 0 ? "Stella" : "Benjamin",
    emotion: index % 2 === 0 ? "confident" : "excited",
    speed: finalScene ? 0.95 : 1.0,
    voiceDirection: {
      emotion: finalScene ? "sarcastic" : (index % 2 === 0 ? "confident" : "excited"),
      speed: finalScene ? 0.95 : 1.0,
      pauseBeforeMs: 0,
      pauseAfterMs: finalScene ? 300 : 200,
      emphasis: scene.accentKeyword ? [scene.accentKeyword] : [],
    },
    wordTimestamps: [],
    audioDurationSeconds: 0,
    entryVariant: getDefaultKineticEntryVariant(index),
    visual: {
      type: "kinetic",
      background: "dark",
      elements: [
        {
          id: `${scene.id}-hero`,
          kind: "hero",
          label: hero || scene.narration,
          position: SAFE_POSITIONS.center,
          entryFrame: 0,
          triggersOnWord: heroTrigger,
          scale: 1.1,
          rotate: index % 2 === 0 ? -2 : 2,
          zIndex: 5,
          isTeal: !finalScene,
          isRed: finalScene,
        },
        {
          id: `${scene.id}-support`,
          kind: "support",
          label: support || "Keep the pipeline honest.",
          position: SAFE_POSITIONS.lowerCenter,
          entryFrame: Math.min(12, Math.max(6, Math.round(sceneFrames * 0.18))),
          triggersOnWord: supportTrigger,
          scale: 0.9,
          zIndex: 4,
        },
        {
          id: `${scene.id}-bg-icon`,
          kind: "icon",
          label: "lottie/wired/wired-lineal-19-magnifier-zoom-search-hover-spin.json",
          position: SAFE_POSITIONS.center,
          anchor: "center-center",
          scale: 1.5,
          rotate: 15,
          zIndex: 1,
          entryFrame: 0,
          triggersOnWord: null,
          opacity: 0.20,
        }
      ],
    },
    tealElement: finalScene ? undefined : { kind: "line", appearsAtFrame: Math.min(18, Math.round(sceneFrames * 0.3)) },
  };
};

const buildMotionScene = (scene: GenerationPlanScene): SceneConfig => {
  const fps = FORMAT_CONFIG.reel.fps;
  const sceneFrames = Math.round((scene.endSecond - scene.startSecond) * fps);
  const [first, second, third] = scene.keyTerms.length > 0 ? scene.keyTerms : ["input", "system", "output"];

  return {
    id: scene.id,
    startSecond: scene.startSecond,
    endSecond: scene.endSecond,
    narration: scene.narration,
    voiceId: "Marlowe",
    emotion: "serious",
    speed: 0.92,
    voiceDirection: {
      emotion: "serious",
      speed: 0.92,
      pauseBeforeMs: 0,
      pauseAfterMs: 200,
      emphasis: scene.accentKeyword ? [scene.accentKeyword] : [],
    },
    wordTimestamps: [],
    audioDurationSeconds: 0,
    visual: {
      type: "flow",
      background: "light",
      elements: [
        {
          id: `${scene.id}-left`,
          kind: "label",
          label: first,
          position: SAFE_POSITIONS.leftThird,
          anchor: "center-left",
          scale: 1.2,
          rotate: -5,
          zIndex: 3,
          entryFrame: 0,
          triggersOnWord: first,
        },
        {
          id: `${scene.id}-thread`,
          kind: "thread",
          label: "flow",
          position: SAFE_POSITIONS.center,
          zIndex: 2,
          entryFrame: Math.min(10, Math.round(sceneFrames * 0.15)),
          triggersOnWord: null,
          isTeal: true,
        },
        {
          id: `${scene.id}-center`,
          kind: "card",
          label: second,
          position: SAFE_POSITIONS.center,
          scale: 1.4,
          zIndex: 5,
          entryFrame: Math.min(14, Math.round(sceneFrames * 0.22)),
          triggersOnWord: second,
          isTeal: true,
        },
        {
          id: `${scene.id}-right`,
          kind: "label",
          label: third ?? "result",
          position: SAFE_POSITIONS.rightThird,
          anchor: "center-right",
          scale: 1.2,
          rotate: 5,
          zIndex: 3,
          entryFrame: Math.min(22, Math.round(sceneFrames * 0.34)),
          triggersOnWord: third ?? null,
        },
      ],
    },
    tealElement: { kind: "thread", appearsAtFrame: Math.min(12, Math.round(sceneFrames * 0.2)) },
  };
};

const buildSlidesScene = (scene: GenerationPlanScene): SceneConfig => {
  const fps = FORMAT_CONFIG.reel.fps;
  const sceneFrames = Math.round((scene.endSecond - scene.startSecond) * fps);
  const points = scene.keyTerms.length > 0 ? scene.keyTerms.slice(0, 3) : ["Clear input", "Validated output", "Reliable render"];

  return {
    id: scene.id,
    startSecond: scene.startSecond,
    endSecond: scene.endSecond,
    narration: scene.narration,
    speed: 0.90,
    voiceDirection: {
      emotion: "calm",
      speed: 0.90,
      pauseBeforeMs: 0,
      pauseAfterMs: 200,
      emphasis: [],
    },
    wordTimestamps: [],
    audioDurationSeconds: 0,
    visual: {
      type: "text-only",
      background: "light",
      elements: [
        {
          id: `${scene.id}-title`,
          kind: "label",
          label: scene.objective.replace(/\.$/, ""),
          position: SAFE_POSITIONS.upperCenter,
          entryFrame: 0,
          triggersOnWord: null,
        },
        ...points.map((point, index) => ({
          id: `${scene.id}-point-${index + 1}`,
          kind: "card" as const,
          label: point,
          position: { x: "50%", y: `${42 + index * 13}%` },
          entryFrame: Math.min(sceneFrames - 6, 10 + index * 12),
          triggersOnWord: point.split(/\s+/)[0] || null,
          isTeal: index === 0,
        })),
      ],
    },
  };
};

const createLocalScript = (request: GenerationRequest, plan: GenerationPlan): VideoScript => {
  const totalScenes = plan.scenes.length;
  const scenes = plan.scenes.map((scene, index) => {
    switch (request.type) {
      case "kinetic":
        return buildKineticScene(scene, index, totalScenes);
      case "motion":
        return buildMotionScene(scene);
      case "slides":
      default:
        return buildSlidesScene(scene);
    }
  });

  return VideoScriptSchema.parse({
    version: 3,
    status: "draft",
    topic: request.topic,
    slug: plan.slug,
    type: request.type,
    format: request.format,
    durationSeconds: request.durationSeconds,
    sarcasm: request.sarcasm,
    mode: request.mode,
    quality: request.quality,
    videoStyle: request.videoStyle,
    paletteKey: request.paletteKey,
    customPalette: request.customPalette,
    scenes,
    runMetadata: {
      generatedAt: new Date().toISOString(),
      provider: "local-template",
      repaired: false,
    },
  });
};

const buildSceneCue = (type: VideoType, scene: SceneConfig, manifest: AssetManifest, index: number) => {
  const cues: NonNullable<SceneConfig["sfxCues"]> = [];
  const addCue = (file: string, frame: number, volume: number, durationFrames: number) => {
    if (findAssetByRelativePath(manifest, file)) {
      cues.push({
        id: `${scene.id}-${pathSafeId(file)}-${frame}`,
        file,
        frame,
        volume,
        durationFrames,
      });
    }
  };

  switch (type) {
    case "kinetic":
      addCue("vfx/click.mp3", 0, 0.15, 10);
      break;
    case "motion":
      addCue("vfx/whoosh_soft.mp3", 0, 0.18, 22);
      if (scene.tealElement) {
        addCue("vfx/pop_gentle.mp3", scene.tealElement.appearsAtFrame, 0.14, 16);
      }
      break;
    case "slides":
      addCue("vfx/paper_rustle.mp3", 2, 0.16, 24);
      scene.visual.elements
        .filter((element) => element.kind === "card")
        .forEach((element, elementIndex) => addCue("vfx/pop_gentle.mp3", element.entryFrame, 0.12 + elementIndex * 0.01, 16));
      break;
    default:
      break;
  }

  return cues.length > 0 ? cues : undefined;
};

const pathSafeId = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();

const sanitizeAssetPath = (file: string): string => {
  if (file.includes(":")) {
    return file.substring(file.indexOf(":") + 1);
  }
  return file;
};

const buildBackgroundMusic = (request: GenerationRequest, manifest: AssetManifest): BackgroundMusicConfig | undefined => {
  if (!request.operator.includeMusic) {
    return undefined;
  }

  const music = pickBackgroundMusic(manifest);
  if (!music) {
    return undefined;
  }

  return {
    file: music.relativePath,
    baseVolume: request.quality === "production" ? 0.1 : 0.14,
    duckedVolume: request.quality === "production" ? 0.055 : 0.08,
    loop: true,
  };
};

const reconcileSceneTiming = (script: VideoScript): VideoScript => {
  const fps = FORMAT_CONFIG[script.format].fps;
  const lastEnd = script.scenes[script.scenes.length - 1]?.endSecond ?? script.durationSeconds;
  const scale = lastEnd > 0 ? script.durationSeconds / lastEnd : 1;
  let cursor = 0;

  const scenes = script.scenes.map((scene, index) => {
    const oldDuration = Math.max(0.25, scene.endSecond - scene.startSecond);
    const scaledDuration = index === script.scenes.length - 1
      ? script.durationSeconds - cursor
      : Number((oldDuration * scale).toFixed(3));

    const nextStart = Number(cursor.toFixed(3));
    const nextEnd = Number((cursor + scaledDuration).toFixed(3));
    const oldFrames = Math.max(1, Math.round(oldDuration * fps));
    const newFrames = Math.max(1, Math.round((nextEnd - nextStart) * fps));
    const frameScale = newFrames / oldFrames;

    cursor = nextEnd;

    return {
      ...scene,
      startSecond: nextStart,
      endSecond: nextEnd,
      visual: {
        ...scene.visual,
        elements: scene.visual.elements.map((element) => ({
          ...element,
          entryFrame: Math.max(0, Math.min(newFrames - 1, Math.round(element.entryFrame * frameScale))),
        })),
      },
      tealElement: scene.tealElement
        ? {
            ...scene.tealElement,
            appearsAtFrame: Math.max(0, Math.min(newFrames - 1, Math.round(scene.tealElement.appearsAtFrame * frameScale))),
          }
        : undefined,
      sfxCues: scene.sfxCues?.map((cue) => ({
        ...cue,
        frame: Math.max(0, Math.min(newFrames - 1, Math.round(cue.frame * frameScale))),
        durationFrames: cue.durationFrames ? Math.max(1, Math.round(cue.durationFrames * frameScale)) : cue.durationFrames,
      })),
    };
  });

  return VideoScriptSchema.parse({
    ...script,
    scenes,
  });
};

const enrichScript = (request: GenerationRequest, manifest: AssetManifest, rawScript: VideoScript, provider: string, repaired: boolean) => {
  const scenes = rawScript.scenes.map((scene, index) => ({
    ...scene,
    sfxCues: (scene.sfxCues && scene.sfxCues.length > 0
      ? scene.sfxCues.map((cue) => ({ ...cue, file: sanitizeAssetPath(cue.file) }))
      : buildSceneCue(request.type, scene, manifest, index)),
  }));

  return reconcileSceneTiming(
    VideoScriptSchema.parse({
      ...rawScript,
      version: 3,
      status: "draft",
      topic: request.topic,
      slug: rawScript.slug || slugify(request.topic),
      type: request.type,
      format: request.format,
      durationSeconds: request.durationSeconds,
      sarcasm: request.sarcasm,
      mode: request.mode,
      quality: request.quality,
      videoStyle: request.videoStyle,
      paletteKey: request.paletteKey,
      customPalette: request.customPalette,
      backgroundMusic: buildBackgroundMusic(request, manifest),
      runMetadata: {
        generatedAt: new Date().toISOString(),
        provider,
        repaired,
      },
      scenes,
    }),
  );
};

const generatePlanWithProvider = async (
  request: GenerationRequest,
  project: ProjectContext,
  rules: RulesDigest,
) => {
  const prompt = buildPlanPrompt({
    request,
    capabilities: project.capabilities,
    assets: project.assetManifest,
    rules,
    activeAssetInventory: project.assetInventoryNotes,
  });

  return generateStructuredOutput({
    env: project.env,
    config: project.config,
    purpose: "generation-plan",
    prompt,
    schema: GenerationPlanSchema,
  });
};

const generateScriptWithProvider = async (
  request: GenerationRequest,
  plan: GenerationPlan,
  project: ProjectContext,
  rules: RulesDigest,
) => {
  const prompt = buildScriptPrompt({
    request,
    plan,
    capabilities: project.capabilities,
    assets: project.assetManifest,
    rules,
    activeAssetInventory: project.assetInventoryNotes,
  });

  return generateStructuredOutput({
    env: project.env,
    config: project.config,
    purpose: "video-script",
    prompt,
    schema: VideoScriptSchema,
  });
};

export const buildDraftPackage = async (projectRoot: string, unsafeRequest: GenerationRequest | Partial<GenerationRequest>): Promise<DraftPackage> => {
  const request = GenerationRequestSchema.parse(
    "topic" in unsafeRequest ? unsafeRequest : createRequest(unsafeRequest, projectRoot),
  );
  const project = buildContext(projectRoot);
  const warnings: string[] = [];

  if (request.mode === "production" && !isProductionType(request.type)) {
    throw new UnsupportedCapabilityFailure(
      `Production mode supports ${PRODUCTION_VIDEO_TYPES.join(", ")} only. ${request.type} is still experimental.`,
    );
  }

  const missingAssets = listMissingProductionRequirements(project.assetManifest, request);
  if (request.mode === "production" && missingAssets.length > 0) {
    throw new PreflightFailure("Required assets are missing for this production video type.", missingAssets);
  }

  const rules = buildRulesDigest(projectRoot, request);

  if (request.operator.dryRun) {
    const plan = createLocalPlan(request);
    const script = enrichScript(request, project.assetManifest, createLocalScript(request, plan), "local-template", false);
    const wordCheck = verifyNarrationWordCount(script, request.durationSeconds);
    if (!wordCheck.isSufficient) {
      warnings.push(
        `Narration word count (${wordCheck.totalWords} words ~= ${wordCheck.expectedDuration.toFixed(1)}s) is below target (${request.durationSeconds}s). Consider regenerating or adding narration manually.`,
      );
    }
    return {
      request,
      project,
      rules,
      plan,
      script,
      providerUsed: "local-template",
      repaired: false,
      warnings,
    };
  }

  const planResult = await generatePlanWithProvider(request, project, rules);
  const plan = GenerationPlanSchema.parse({
    ...planResult.value,
    request,
  });
  const scriptResult = await generateScriptWithProvider(request, plan, project, rules);
  const providerScript = VideoScriptSchema.parse(scriptResult.value);
  const script = enrichScript(request, project.assetManifest, providerScript, scriptResult.provider, scriptResult.repaired);
  const wordCheck = verifyNarrationWordCount(script, request.durationSeconds);

  if (!wordCheck.isSufficient) {
    warnings.push(
      `Narration word count (${wordCheck.totalWords} words ~= ${wordCheck.expectedDuration.toFixed(1)}s) is below target (${request.durationSeconds}s). Consider regenerating or adding narration manually.`,
    );
  }

  if (
    request.operator.includeMusic &&
    !project.assetManifest.categories.music.some((asset) => asset.relativePath === script.backgroundMusic?.file)
  ) {
    warnings.push("No background music asset is available. The render will proceed without music.");
  }

  return {
    request,
    project,
    rules,
    plan,
    script,
    providerUsed: scriptResult.provider,
    repaired: planResult.repaired || scriptResult.repaired,
    warnings,
  };
};
