import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import axios from "axios";
import { RenderInternals } from "@remotion/renderer";
import type { ProjectEnv } from "./env";
import type { VideoScript } from "../types";
import { ProviderFailure } from "./errors";
import { ensureDir, getVoicePath, getSceneVoicePath, toProjectRelativePath } from "./storage";
const MISTRAL_TTS_MODEL = "voxtral-mini-tts-2603";

const buildNarrationText = (script: VideoScript) => script.scenes.map((scene) => scene.narration.trim()).join(" ");

const VOICE_MAP: Record<string, string> = {
  Stella: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86", // Favorite/Primary
  Benjamin: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86", // Fallback to same for now, but distinct in prompt
  Marlowe: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
  Leila: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
};

export const generateSceneAudio = async (
  projectRoot: string,
  env: ProjectEnv,
  slug: string,
  sceneId: string,
  text: string,
  voiceConfig: string
) => {
  const outputPath = getSceneVoicePath(projectRoot, slug, sceneId);
  ensureDir(path.dirname(outputPath));

  // Resolve voice ID: use map, then env, then hardcoded fallback
  const voiceId = VOICE_MAP[voiceConfig] || voiceConfig || env.MISTRAL_VOICE_ID || "b2c1225e-917b-42a9-b59d-3a1ad7c42f86";

  try {
    const response = await axios.post(
      "https://api.mistral.ai/v1/audio/speech",
      {
        model: MISTRAL_TTS_MODEL,
        input: text,
        voice_id: voiceId,
        response_format: "mp3",
      },
      {
        headers: {
          Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const base64Audio = response.data?.audio_data;
    if (typeof base64Audio !== "string") throw new Error("No audio data");

    fs.writeFileSync(outputPath, Buffer.from(base64Audio, "base64"));
    return outputPath;
  } catch (error) {
    throw new ProviderFailure(`Scene ${sceneId} TTS failed`, error);
  }
};

export const generateNarrationAudio = async (projectRoot: string, env: ProjectEnv, script: VideoScript) => {
  if (!env.MISTRAL_API_KEY) throw new ProviderFailure("MISTRAL_API_KEY is missing.");

  const results = await Promise.all(
    script.scenes.map((scene) =>
      generateSceneAudio(
        projectRoot,
        env,
        script.slug,
        scene.id,
        scene.narration,
        scene.voiceId || env.MISTRAL_VOICE_ID!
      )
    )
  );

  return results; // Array of absolute paths
};

const execFilePromise = promisify(execFile);

export const getAudioDurationSeconds = async (absolutePath: string) => {
  try {
    const ffprobePath = RenderInternals.getExecutablePath({
      type: "ffprobe",
      indent: false,
      logLevel: "info",
      binariesDirectory: null,
    });

    const { stdout } = await execFilePromise(ffprobePath, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      absolutePath,
    ]);

    const durationSeconds = Number.parseFloat(stdout.trim());
    if (Number.isNaN(durationSeconds) || durationSeconds <= 0) {
      throw new Error(`Invalid duration from ffprobe: ${stdout}`);
    }

    return durationSeconds;
  } catch (error) {
    throw new ProviderFailure(
      `Unable to determine audio duration for ${absolutePath}. ${error instanceof Error ? error.message : ""}`,
    );
  }
};

export const attachAudioToScript = async (projectRoot: string, script: VideoScript, sceneAudioPaths: string[]) => {
  const FPS = 30;
  const adjustedScenes = [];
  let currentStart = 0;
  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const absolutePath = sceneAudioPaths[i];
    const durationSeconds = await getAudioDurationSeconds(absolutePath);
    const startSecond = currentStart;
    const endSecond = currentStart + durationSeconds;
    currentStart = endSecond;

    adjustedScenes.push({
      ...scene,
      startSecond,
      endSecond,
      audioFile: toProjectRelativePath(projectRoot, absolutePath),
    });
  }

  return {
    ...script,
    durationSeconds: currentStart,
    audioDurationFrames: Math.round(currentStart * FPS),
    scenes: adjustedScenes,
  };
};
