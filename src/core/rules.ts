import fs from "node:fs";
import path from "node:path";
import type { GenerationRequest, RulesDigest } from "../types";
import { RulesDigestSchema } from "../types";

const RULE_FILES = [
  "rules/operation.md",
  "rules/prompting.md",
  "rules/series/tone.md",
  "rules/series/brand.md",
  "rules/style/colors.md",
  "rules/style/typography.md",
  "rules/lens/camera.md",
  "rules/lens/transitions.md",
  "rules/lens/depth.md",
  "rules/lens/timing.md",
  "rules/sync.md",
] as const;

const TYPE_FILE_BY_VIDEO_TYPE = {
  kinetic: "rules/types/kinetic.md",
  motion: "rules/types/motion.md",
  slides: "rules/types/slides_images_hybrid.md",
  animation: "rules/types/animation.md",
  images: "rules/types/slides_images_hybrid.md",
  hybrid: "rules/types/slides_images_hybrid.md",
} as const;

const FORMAT_FILE = "rules/format/formats.md";

const normalizeExcerpt = (raw: string, maxLength = 2200) => {
  const compact = raw.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength).trimEnd()}\n...`;
};

const titleFromPath = (filePath: string) => path.basename(filePath).replace(/\.[a-z]+$/i, "");

export const buildRulesDigest = (projectRoot: string, request: GenerationRequest): RulesDigest => {
  const relevantFiles = [...RULE_FILES, FORMAT_FILE, TYPE_FILE_BY_VIDEO_TYPE[request.type]];

  const files = relevantFiles.map((relativePath) => {
    const absolutePath = path.join(projectRoot, relativePath);
    const raw = fs.readFileSync(absolutePath, "utf8");
    return {
      path: relativePath.replace(/\\/g, "/"),
      title: titleFromPath(relativePath),
      excerpt: normalizeExcerpt(raw),
    };
  });

  return RulesDigestSchema.parse({
    version: 2,
    files,
  });
};
