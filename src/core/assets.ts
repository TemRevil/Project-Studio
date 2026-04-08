import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { RenderInternals } from "@remotion/renderer";
import type { AssetCategory, AssetFile, AssetManifest, AssetRequirement, GenerationRequest, ProductionVideoType } from "../types";
import { AssetManifestSchema } from "../types";

type AssetMetadata = {
  name?: string;
  type?: string;
  description?: string;
  durationSeconds?: number;
  bestFor?: string[] | string;
  useFor?: string[] | string;
  emotionalCue?: string;
  technicalNotes?: string;
  mood?: string;
};

const CATEGORY_ORDER: AssetCategory[] = ["characters", "icons", "lottie", "music", "vfx"];
const AUDIO_EXTENSIONS = new Set([".aac", ".m4a", ".mp3", ".ogg", ".wav"]);
const IMAGE_EXTENSIONS = new Set([".gif", ".jpeg", ".jpg", ".png", ".webp"]);
const CATEGORY_ALLOWED_EXTENSIONS: Record<AssetCategory, Set<string>> = {
  characters: IMAGE_EXTENSIONS,
  icons: new Set([".svg"]),
  lottie: new Set([".json"]),
  music: AUDIO_EXTENSIONS,
  vfx: new Set([...AUDIO_EXTENSIONS, ...IMAGE_EXTENSIONS]),
};
const STUDIO_NOTES_RELATIVE_PATH = "STUDIO_NOTES.md";

const REQUIRED_BY_TYPE: Record<ProductionVideoType, AssetRequirement[]> = {
  kinetic: [
    { relativePath: "vfx/click.mp3", required: true, reason: "Kinetic scenes rely on the click accent." },
  ],
  motion: [
    { relativePath: "vfx/whoosh_soft.mp3", required: true, reason: "Motion scenes use a whoosh on entry." },
    { relativePath: "vfx/paper_texture.png", required: true, reason: "Light-mode scenes need the paper texture overlay." },
  ],
  slides: [
    { relativePath: "vfx/paper_rustle.mp3", required: true, reason: "Slides use a paper rustle on slide entry." },
    { relativePath: "vfx/pop_gentle.mp3", required: true, reason: "Slides reveal points with the pop accent." },
    { relativePath: "vfx/paper_texture.png", required: true, reason: "Slides use the shared paper texture surface." },
  ],
};

const readJsonFile = <T>(absolutePath: string): T | undefined => {
  if (!fs.existsSync(absolutePath)) {
    return undefined;
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8")) as T;
  } catch {
    return undefined;
  }
};

const listCategoryFiles = (categoryRoot: string, category: AssetCategory) => {
  if (!fs.existsSync(categoryRoot)) {
    return [];
  }

  const files: string[] = [];
  const stack = [categoryRoot];
  const allowedExtensions = CATEGORY_ALLOWED_EXTENSIONS[category];

  while (stack.length > 0) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(absolute);
        continue;
      }

      if (entry.name.toLowerCase() === "readme.md") {
        continue;
      }

      if (!allowedExtensions.has(path.extname(entry.name).toLowerCase())) {
        continue;
      }

      files.push(absolute);
    }
  }

  return files.sort((left, right) => left.localeCompare(right));
};

const humanizeName = (fileName: string) =>
  fileName
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeList = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/[,\n;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const fallbackKeywords = (asset: AssetFile) =>
  humanizeName(path.basename(asset.relativePath))
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 4);

const buildCategoryFiles = (projectRoot: string, category: AssetCategory): AssetFile[] => {
  const categoryRoot = path.join(projectRoot, "attachments", category);
  return listCategoryFiles(categoryRoot, category).map((absolutePath) => {
    const relativePath = path
      .relative(path.join(projectRoot, "attachments"), absolutePath)
      .replace(/\\/g, "/");

    const metadataCandidate = absolutePath.replace(/\.[a-z0-9]+$/i, ".json");
    const metadataPath = fs.existsSync(metadataCandidate) && metadataCandidate !== absolutePath
      ? path.relative(path.join(projectRoot, "attachments"), metadataCandidate).replace(/\\/g, "/")
      : undefined;

    return {
      id: `${category}-${relativePath}`,
      category,
      relativePath,
      label: humanizeName(path.basename(absolutePath)),
      exists: true,
      sizeBytes: fs.statSync(absolutePath).size,
      metadataPath,
    };
  });
};

const hasAsset = (manifest: AssetManifest, relativePath: string) => {
  return CATEGORY_ORDER.some((category) =>
    manifest.categories[category].some((asset) => asset.relativePath === relativePath),
  );
};

const readAssetMetadata = (projectRoot: string, asset: AssetFile): AssetMetadata | undefined => {
  const metadataRelativePath = asset.metadataPath;
  if (!metadataRelativePath) {
    return undefined;
  }

  return readJsonFile<AssetMetadata>(path.join(projectRoot, "attachments", metadataRelativePath));
};

const probeAudioDurationSeconds = (absolutePath: string): number | undefined => {
  try {
    const ffprobePath = RenderInternals.getExecutablePath({
      type: "ffprobe",
      indent: false,
      logLevel: "error",
      binariesDirectory: null,
    });

    const stdout = execFileSync(
      ffprobePath,
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        absolutePath,
      ],
      { encoding: "utf8" },
    ).trim();

    const parsed = Number.parseFloat(stdout);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
};

const getAssetDurationSeconds = (projectRoot: string, asset: AssetFile, metadata?: AssetMetadata) => {
  if (typeof metadata?.durationSeconds === "number" && Number.isFinite(metadata.durationSeconds) && metadata.durationSeconds > 0) {
    return metadata.durationSeconds;
  }

  if (!AUDIO_EXTENSIONS.has(path.extname(asset.relativePath).toLowerCase())) {
    return undefined;
  }

  return probeAudioDurationSeconds(resolveAttachmentPath(projectRoot, asset.relativePath));
};

const formatDuration = (seconds: number | undefined) => {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "unknown";
  }

  return seconds >= 10 ? `${seconds.toFixed(1)}s` : `${seconds.toFixed(2)}s`;
};

const buildAssetDescription = (asset: AssetFile, metadata?: AssetMetadata) => {
  if (typeof metadata?.description === "string" && metadata.description.trim().length > 0) {
    return metadata.description.trim();
  }

  const label = humanizeName(path.basename(asset.relativePath));

  switch (asset.category) {
    case "lottie":
      return `${label} animation.`;
    case "music":
      return `${label} background track.`;
    case "vfx":
      return IMAGE_EXTENSIONS.has(path.extname(asset.relativePath).toLowerCase())
        ? `${label} texture or overlay asset.`
        : `${label} sound effect.`;
    case "characters":
      return `${label} character pose or expression.`;
    case "icons":
      return `${label} vector icon.`;
    default:
      return label;
  }
};

const buildAssetUseCases = (asset: AssetFile, metadata?: AssetMetadata) => {
  const explicit = normalizeList(metadata?.bestFor ?? metadata?.useFor);
  if (explicit.length > 0) {
    return explicit.join(", ");
  }

  const tokens = fallbackKeywords(asset);
  if (tokens.length > 0) {
    return tokens.join(", ");
  }

  switch (asset.category) {
    case "lottie":
      return "concept highlights, supporting icon beats";
    case "music":
      return "background bed, explainers, intros";
    case "vfx":
      return "transitions, emphasis, scene punctuation";
    case "characters":
      return "character-driven scenes, animation beats";
    case "icons":
      return "UI or symbolic callouts";
    default:
      return "general support";
  }
};

const buildMood = (metadata?: AssetMetadata) => {
  if (typeof metadata?.emotionalCue === "string" && metadata.emotionalCue.trim().length > 0) {
    return metadata.emotionalCue.trim();
  }

  if (typeof metadata?.mood === "string" && metadata.mood.trim().length > 0) {
    return metadata.mood.trim();
  }

  return "unspecified";
};

const escapeMarkdownCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim();

const renderMarkdownTable = (headers: string[], rows: string[][]) => {
  if (rows.length === 0) {
    return "_None available._";
  }

  const headerRow = `| ${headers.join(" | ")} |`;
  const dividerRow = `| ${headers.map(() => "---").join(" | ")} |`;
  const bodyRows = rows.map((row) => `| ${row.map((cell) => escapeMarkdownCell(cell)).join(" | ")} |`);
  return [headerRow, dividerRow, ...bodyRows].join("\n");
};

const unique = <T>(values: T[]) => [...new Set(values)];

export const buildAssetManifest = (projectRoot: string): AssetManifest => {
  const categories = {
    characters: buildCategoryFiles(projectRoot, "characters"),
    icons: buildCategoryFiles(projectRoot, "icons"),
    lottie: buildCategoryFiles(projectRoot, "lottie"),
    music: buildCategoryFiles(projectRoot, "music"),
    vfx: buildCategoryFiles(projectRoot, "vfx"),
  };

  const draft: AssetManifest = {
    version: 2,
    generatedAt: new Date().toISOString(),
    categories,
    requiredByType: REQUIRED_BY_TYPE,
    summary: {
      totalFiles: CATEGORY_ORDER.reduce((count, category) => count + categories[category].length, 0),
      missingProductionRequirements: 0,
    },
  };

  draft.summary.missingProductionRequirements = (Object.keys(REQUIRED_BY_TYPE) as ProductionVideoType[]).reduce(
    (count, type) =>
      count +
      REQUIRED_BY_TYPE[type].filter((requirement) => requirement.required && !hasAsset(draft, requirement.relativePath)).length,
    0,
  );

  return AssetManifestSchema.parse(draft);
};

export const getMissingRequirementsForType = (manifest: AssetManifest, type: ProductionVideoType) => {
  return manifest.requiredByType[type].filter((requirement) => requirement.required && !hasAsset(manifest, requirement.relativePath));
};

export const listMissingProductionRequirements = (manifest: AssetManifest, request: GenerationRequest) => {
  if (request.type === "animation" || request.type === "images" || request.type === "hybrid") {
    return [];
  }

  return getMissingRequirementsForType(manifest, request.type);
};

export const buildFallbackAssetList = (assets: AssetManifest): string => {
  const lines = ["# Available Assets (use EXACT paths, never invent new ones)", ""];

  const lottieFiles = assets.categories.lottie.filter((asset) => asset.relativePath.toLowerCase().endsWith(".json"));
  if (lottieFiles.length > 0) {
    lines.push("## LOTTIE ANIMATIONS (kind: \"icon\")");
    lottieFiles.forEach((asset) => lines.push(`- ${asset.relativePath} -> ${asset.label}`));
    lines.push("");
  }

  const vfxFiles = assets.categories.vfx.filter((asset) => asset.relativePath.toLowerCase().endsWith(".mp3"));
  if (vfxFiles.length > 0) {
    lines.push("## SOUND EFFECTS (sfxCues)");
    vfxFiles.forEach((asset) => lines.push(`- ${asset.relativePath}`));
    lines.push("");
  }

  const musicFiles = assets.categories.music.filter((asset) => AUDIO_EXTENSIONS.has(path.extname(asset.relativePath).toLowerCase()));
  if (musicFiles.length > 0) {
    lines.push("## MUSIC (backgroundMusic)");
    musicFiles.forEach((asset) => lines.push(`- ${asset.relativePath}`));
    lines.push("");
  }

  const characterFiles = assets.categories.characters;
  if (characterFiles.length > 0) {
    lines.push("## CHARACTERS");
    characterFiles.forEach((asset) => lines.push(`- ${asset.relativePath} -> ${asset.label}`));
    lines.push("");
  }

  if (lottieFiles.length === 0) {
    lines.push("## NO LOTTIE FILES AVAILABLE");
    lines.push("Do NOT use kind: \"icon\". Use kind: \"label\" or kind: \"hero\" for text-first scenes.");
    lines.push("");
  }

  lines.push("## RULE");
  lines.push("Never invent a file path. If no asset matches a concept, use text elements instead.");

  return lines.join("\n");
};

export const getStudioNotesPath = (projectRoot: string) => path.join(projectRoot, "attachments", STUDIO_NOTES_RELATIVE_PATH);

export const buildStudioNotes = (projectRoot: string, manifest: AssetManifest = buildAssetManifest(projectRoot)) => {
  const generatedAt = new Date().toISOString();
  const lottieFiles = manifest.categories.lottie.filter((asset) => asset.relativePath.toLowerCase().endsWith(".json"));
  const vfxFiles = manifest.categories.vfx.filter((asset) => AUDIO_EXTENSIONS.has(path.extname(asset.relativePath).toLowerCase()));
  const musicFiles = manifest.categories.music.filter((asset) => AUDIO_EXTENSIONS.has(path.extname(asset.relativePath).toLowerCase()));
  const characterFiles = manifest.categories.characters;

  const lines = [
    "# STUDIO_NOTES.md - Project Studio Asset Inventory",
    `Last updated: ${generatedAt}`,
    `Total assets: ${manifest.summary.totalFiles}`,
    "",
    "## LOTTIE ANIMATIONS (use these EXACT paths)",
    "Use these EXACT relative paths as the label field for kind: \"icon\" elements.",
    "If no Lottie matches your concept, use kind: \"label\" or kind: \"hero\" and never invent a path.",
    "",
    renderMarkdownTable(
      ["Path", "Description", "Best For"],
      lottieFiles.map((asset) => {
        const metadata = readAssetMetadata(projectRoot, asset);
        return [
          asset.relativePath,
          buildAssetDescription(asset, metadata),
          buildAssetUseCases(asset, metadata),
        ];
      }),
    ),
    "",
    "## SOUND EFFECTS",
    "Use these EXACT paths in sfxCues[].file fields.",
    "",
    renderMarkdownTable(
      ["Path", "Duration", "Use When"],
      vfxFiles.map((asset) => {
        const metadata = readAssetMetadata(projectRoot, asset);
        return [
          asset.relativePath,
          formatDuration(getAssetDurationSeconds(projectRoot, asset, metadata)),
          buildAssetUseCases(asset, metadata),
        ];
      }),
    ),
    "",
    "## MUSIC",
    "Use these EXACT paths in backgroundMusic.file.",
    "",
    renderMarkdownTable(
      ["Path", "Mood", "Duration"],
      musicFiles.map((asset) => {
        const metadata = readAssetMetadata(projectRoot, asset);
        return [
          asset.relativePath,
          buildMood(metadata),
          formatDuration(getAssetDurationSeconds(projectRoot, asset, metadata)),
        ];
      }),
    ),
    "",
    "## CHARACTERS",
    "Animation-only character poses and stills.",
    "",
    renderMarkdownTable(
      ["Path", "Description", "Use For"],
      characterFiles.map((asset) => {
        const metadata = readAssetMetadata(projectRoot, asset);
        return [
          asset.relativePath,
          buildAssetDescription(asset, metadata),
          buildAssetUseCases(asset, metadata),
        ];
      }),
    ),
    "",
    "## DEPENDENCY GUIDE",
    "- kinetic type: needs vfx/click.mp3",
    "- motion type: needs vfx/whoosh_soft.mp3 and vfx/paper_texture.png",
    "- slides type: needs vfx/paper_rustle.mp3, vfx/pop_gentle.mp3, and vfx/paper_texture.png",
    "- animation type: expects characters/idle.png and characters/talking.png if character scenes are used",
    "",
    "## CURRENTLY MISSING (DO NOT REFERENCE)",
  ];

  const missingAssets = unique([
    ...listMissingProductionRequirements(manifest, {
      topic: "asset-audit",
      type: "kinetic",
      format: "reel",
      durationSeconds: 30,
      sarcasm: false,
      mode: "preview",
      quality: "fast",
      operator: {
        dryRun: true,
        skipAudio: true,
        autoApprove: true,
        includeMusic: false,
      },
    }).map((requirement) => requirement.relativePath),
    ...listMissingProductionRequirements(manifest, {
      topic: "asset-audit",
      type: "motion",
      format: "reel",
      durationSeconds: 30,
      sarcasm: false,
      mode: "preview",
      quality: "fast",
      operator: {
        dryRun: true,
        skipAudio: true,
        autoApprove: true,
        includeMusic: false,
      },
    }).map((requirement) => requirement.relativePath),
    ...listMissingProductionRequirements(manifest, {
      topic: "asset-audit",
      type: "slides",
      format: "reel",
      durationSeconds: 30,
      sarcasm: false,
      mode: "preview",
      quality: "fast",
      operator: {
        dryRun: true,
        skipAudio: true,
        autoApprove: true,
        includeMusic: false,
      },
    }).map((requirement) => requirement.relativePath),
    ...["characters/idle.png", "characters/talking.png"].filter((relativePath) => !hasAsset(manifest, relativePath)),
  ]);

  if (missingAssets.length === 0) {
    lines.push("- None");
  } else {
    missingAssets.forEach((relativePath) => lines.push(`- ${relativePath}`));
  }

  const content = `${lines.join("\n")}\n`;
  fs.writeFileSync(getStudioNotesPath(projectRoot), content, "utf8");
  return content;
};

export const pickBackgroundMusic = (manifest: AssetManifest) => {
  return manifest.categories.music.find((asset) => asset.relativePath.toLowerCase().endsWith(".mp3"));
};

export const resolveAttachmentPath = (projectRoot: string, relativePath: string) => {
  return path.join(projectRoot, "attachments", relativePath);
};

export const findAssetByRelativePath = (manifest: AssetManifest, relativePath: string) => {
  return CATEGORY_ORDER.flatMap((category) => manifest.categories[category]).find((asset) => asset.relativePath === relativePath);
};
