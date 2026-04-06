import fs from "node:fs";
import path from "node:path";
import type { GenerationPlan, RunReport, VideoScript } from "../types";
import { GenerationPlanSchema, RunReportSchema, VideoScriptSchema } from "../types";

export const ensureDir = (dirPath: string) => {
  fs.mkdirSync(dirPath, { recursive: true });
};

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const getVideosRoot = (projectRoot: string) => path.join(projectRoot, "videos");
export const getVideoDir = (projectRoot: string, slug: string) => path.join(getVideosRoot(projectRoot), slug);
export const getPlanPath = (projectRoot: string, slug: string) => path.join(getVideoDir(projectRoot, slug), `${slug}_plan.json`);
export const getScriptPath = (projectRoot: string, slug: string) => path.join(getVideoDir(projectRoot, slug), `${slug}_script.json`);
export const getVoicePath = (projectRoot: string, slug: string) => path.join(getVideoDir(projectRoot, slug), `${slug}_voice.mp3`);
export const getSceneVoicePath = (projectRoot: string, slug: string, sceneId: string) =>
  path.join(getVideoDir(projectRoot, slug), "scenes", `${sceneId}_voice.mp3`);
export const getRunReportPath = (projectRoot: string, slug: string) => path.join(getVideoDir(projectRoot, slug), `${slug}_run.json`);
export const getVideoOutputPath = (projectRoot: string, slug: string, format: string) =>
  path.join(getVideoDir(projectRoot, slug), `${slug}_${format}.mp4`);

export const getRuntimeAssetsRoot = (projectRoot: string) => path.join(projectRoot, "attachments", "runtime");
export const getRuntimeVoicePath = (projectRoot: string, slug: string) =>
  path.join(getRuntimeAssetsRoot(projectRoot), slug, "voice.mp3");
export const getRuntimeSceneVoicePath = (projectRoot: string, slug: string, sceneId: string) =>
  path.join(getRuntimeAssetsRoot(projectRoot), slug, "scenes", `${sceneId}_voice.mp3`);

export const toProjectRelativePath = (projectRoot: string, absolutePath: string) =>
  path.relative(projectRoot, absolutePath).replace(/\\/g, "/");

export const writeJsonFile = (filePath: string, payload: unknown) => {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

export const savePlan = (projectRoot: string, plan: GenerationPlan) => {
  writeJsonFile(getPlanPath(projectRoot, plan.slug), GenerationPlanSchema.parse(plan));
};

export const saveScript = (projectRoot: string, script: VideoScript) => {
  writeJsonFile(getScriptPath(projectRoot, script.slug), VideoScriptSchema.parse(script));
};

export const saveRunReport = (projectRoot: string, report: RunReport) => {
  writeJsonFile(getRunReportPath(projectRoot, report.slug), RunReportSchema.parse(report));
};

export const loadScript = (filePath: string) => {
  const raw = fs.readFileSync(filePath, "utf8");
  return VideoScriptSchema.parse(JSON.parse(raw));
};

export const stageVoiceForRender = (projectRoot: string, slug: string, sourceVoicePath: string) => {
  const runtimeVoicePath = getRuntimeVoicePath(projectRoot, slug);
  ensureDir(path.dirname(runtimeVoicePath));
  fs.copyFileSync(sourceVoicePath, runtimeVoicePath);
  return path.relative(path.join(projectRoot, "attachments"), runtimeVoicePath).replace(/\\/g, "/");
};

export const stageSceneVoiceForRender = (projectRoot: string, slug: string, sceneId: string, sourceVoicePath: string) => {
  const runtimePath = getRuntimeSceneVoicePath(projectRoot, slug, sceneId);
  ensureDir(path.dirname(runtimePath));
  fs.copyFileSync(sourceVoicePath, runtimePath);
  return path.relative(path.join(projectRoot, "attachments"), runtimePath).replace(/\\/g, "/");
};

export const getVideoLibrary = (projectRoot: string) => {
  const videosRoot = getVideosRoot(projectRoot);

  if (!fs.existsSync(videosRoot)) {
    return [];
  }

  return fs
    .readdirSync(videosRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const dir = path.join(videosRoot, slug);
      const files = fs.readdirSync(dir).sort();
      return {
        slug,
        dir,
        files,
        scriptPath: files.find((file) => file.endsWith("_script.json")) ? path.join(dir, `${slug}_script.json`) : undefined,
        mp4Path: files.find((file) => file.endsWith(".mp4")) ? path.join(dir, files.find((file) => file.endsWith(".mp4"))!) : undefined,
        voicePath: files.find((file) => file.endsWith("_voice.mp3")) ? path.join(dir, `${slug}_voice.mp3`) : undefined,
      };
    });
};
