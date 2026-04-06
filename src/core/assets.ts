import fs from "node:fs";
import path from "node:path";
import type { AssetCategory, AssetFile, AssetManifest, AssetRequirement, GenerationRequest, ProductionVideoType } from "../types";
import { AssetManifestSchema } from "../types";

const CATEGORY_ORDER: AssetCategory[] = ["characters", "icons", "lottie", "music", "vfx"];

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

const listCategoryFiles = (categoryRoot: string) => {
  if (!fs.existsSync(categoryRoot)) {
    return [];
  }

  const files: string[] = [];
  const stack = [categoryRoot];

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

const buildCategoryFiles = (projectRoot: string, category: AssetCategory): AssetFile[] => {
  const categoryRoot = path.join(projectRoot, "attachments", category);
  return listCategoryFiles(categoryRoot).map((absolutePath) => {
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

export const pickBackgroundMusic = (manifest: AssetManifest) => {
  return manifest.categories.music.find((asset) => asset.relativePath.toLowerCase().endsWith(".mp3"));
};

export const resolveAttachmentPath = (projectRoot: string, relativePath: string) => {
  return path.join(projectRoot, "attachments", relativePath);
};

export const findAssetByRelativePath = (manifest: AssetManifest, relativePath: string) => {
  return CATEGORY_ORDER.flatMap((category) => manifest.categories[category]).find((asset) => asset.relativePath === relativePath);
};
