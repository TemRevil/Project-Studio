import fs from "node:fs";
import path from "node:path";
import type { RuntimeMedia, VideoScript } from "../types";
import { RuntimeMediaSchema, VideoScriptSchema } from "../types";
import { PreflightFailure, ProjectStudioError } from "./errors";
import { getVideoOutputPath, stageSceneVoiceForRender, stageVoiceForRender } from "./storage";

export interface RenderProgress {
  stage: string;
  progress?: number;
}

export interface RenderOptions {
  projectRoot: string;
  script: VideoScript;
  onProgress?: (progress: RenderProgress) => void;
}

const applyLowMemoryFfmpegArgs = (args: string[]) => {
  const compactArgs: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "-threads") {
      index += 1;
      continue;
    }
    compactArgs.push(arg);
  }

  const outputArg = compactArgs.pop();
  if (!outputArg) {
    return args;
  }

  return [...compactArgs, "-threads", "1", outputArg];
};

const buildRuntimeMedia = (projectRoot: string, script: VideoScript): RuntimeMedia => {
  const runtime: RuntimeMedia = {
    sceneNarrationFiles: {},
  };

  if (script.audioFile) {
    const absoluteVoicePath = path.join(projectRoot, script.audioFile);
    if (!fs.existsSync(absoluteVoicePath)) {
      throw new PreflightFailure(`Narration audio is missing at ${script.audioFile}.`);
    }

    runtime.narrationFile = stageVoiceForRender(projectRoot, script.slug, absoluteVoicePath);
  }

  // Stage per-scene audio
  script.scenes.forEach((scene) => {
    if (scene.audioFile) {
      const absolutePath = path.join(projectRoot, scene.audioFile);
      if (fs.existsSync(absolutePath)) {
        runtime.sceneNarrationFiles![scene.id] = stageSceneVoiceForRender(
          projectRoot,
          script.slug,
          scene.id,
          absolutePath
        );
      }
    }
  });

  if (script.backgroundMusic?.file) {
    const absoluteMusicPath = path.join(projectRoot, "attachments", script.backgroundMusic.file);
    if (fs.existsSync(absoluteMusicPath)) {
      runtime.backgroundMusicFile = script.backgroundMusic.file;
    }
  }

  return RuntimeMediaSchema.parse(runtime);
};

const sanitizeScriptAssets = (script: any) => {
  return {
    ...script,
    backgroundMusic: script.backgroundMusic
      ? {
          ...script.backgroundMusic,
          file: script.backgroundMusic.file.includes(":")
            ? script.backgroundMusic.file.split(":").pop()
            : script.backgroundMusic.file,
        }
      : undefined,
    scenes: script.scenes.map((scene: any) => ({
      ...scene,
      sfxCues: scene.sfxCues?.map((cue: any) => ({
        ...cue,
        file: cue.file.includes(":") ? cue.file.split(":").pop() : cue.file,
      })),
    })),
  };
};

export const renderVideoPackage = async ({ projectRoot, script, onProgress }: RenderOptions) => {
  const parsedScript = sanitizeScriptAssets(VideoScriptSchema.parse(script));
  const runtimeMedia = buildRuntimeMedia(projectRoot, parsedScript);
  const outputLocation = getVideoOutputPath(projectRoot, parsedScript.slug, parsedScript.format);

  try {
    onProgress?.({ stage: "Bundling Remotion project" });
    const { bundle } = await import("@remotion/bundler");
    const serveUrl = await bundle({
      entryPoint: path.join(projectRoot, "src", "Root.tsx"),
      publicDir: path.join(projectRoot, "attachments"),
    });

    onProgress?.({ stage: "Selecting composition" });
    const { renderMedia, selectComposition } = await import("@remotion/renderer");
    const composition = await selectComposition({
      serveUrl,
      id: "StudioVideo",
      inputProps: {
        script: parsedScript,
        runtimeMedia,
      },
    });

    onProgress?.({ stage: "Rendering video", progress: 0 });
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      concurrency: 1,
      disallowParallelEncoding: true,
      outputLocation,
      inputProps: {
        script: parsedScript,
        runtimeMedia,
      },
      onProgress: ({ progress }) => onProgress?.({ stage: "Rendering video", progress }),
      chromiumOptions: {
        disableWebSecurity: false,
        gl: "angle",
      },
      jpegQuality: 80,
      x264Preset: "ultrafast",
      ffmpegOverride: ({ type, args }) => (type === "stitcher" ? applyLowMemoryFfmpegArgs(args) : args),
    });

    return {
      outputLocation,
      runtimeMedia,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ERR_INSUFFICIENT_RESOURCES")) {
      throw new ProjectStudioError(
        "RENDER_BROWSER_RESOURCE_ERROR",
        "The headless browser ran out of resources while loading the Remotion project. Retry on a machine with more browser capacity or use a shorter smoke render first.",
        message,
      );
    }

    throw new ProjectStudioError("RENDER_FAILURE", `Render failed: ${message}`, error);
  }
};
