import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import axios from "axios";
import { RenderInternals } from "@remotion/renderer";
import type { ProjectEnv } from "./env";
import type { VideoScript, SceneConfig, VoiceDirection } from "../types";
import { EMOTION_SPEED_MAP, type VoiceEmotion } from "../types";
import { ProviderFailure } from "./errors";
import { ensureDir, getSceneVoicePath, toProjectRelativePath } from "./storage";

// ── Constants ──
const MISTRAL_TTS_MODEL = "voxtral-mini-tts-2603";

const VOICE_MAP: Record<string, string> = {
  Stella: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
  Benjamin: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
  Marlowe: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
  Leila: "b2c1225e-917b-42a9-b59d-3a1ad7c42f86",
};

// ── Voice direction → TTS parameters ──

const resolveSpeed = (scene: SceneConfig): number => {
  // Priority: explicit voiceDirection.speed > emotion mapping > scene.speed > 1.0
  if (scene.voiceDirection?.speed && scene.voiceDirection.speed !== 1.0) {
    return scene.voiceDirection.speed;
  }
  if (scene.voiceDirection?.emotion) {
    return EMOTION_SPEED_MAP[scene.voiceDirection.emotion as VoiceEmotion] ?? 1.0;
  }
  return scene.speed ?? 1.0;
};

const applyPunctuationForEmotion = (text: string, direction?: VoiceDirection): string => {
  if (!direction) return text;

  let narration = text;

  // Add pauses through punctuation control
  if (direction.pauseBeforeMs > 0) {
    narration = "... " + narration;
  }
  if (direction.pauseAfterMs > 200) {
    narration = narration + " ...";
  }

  return narration;
};

// ── Per-scene audio generation ──

export const generateSceneAudio = async (
  projectRoot: string,
  env: ProjectEnv,
  slug: string,
  scene: SceneConfig
): Promise<string> => {
  const outputPath = getSceneVoicePath(projectRoot, slug, scene.id);
  ensureDir(path.dirname(outputPath));

  // Resolve voice ID
  const voiceConfig = scene.voiceId ?? "";
  const voiceId =
    VOICE_MAP[voiceConfig] ||
    voiceConfig ||
    env.MISTRAL_VOICE_ID ||
    "b2c1225e-917b-42a9-b59d-3a1ad7c42f86";

  // Resolve speed from voice direction
  const speed = resolveSpeed(scene);

  // Apply emotional punctuation
  const narrationText = applyPunctuationForEmotion(scene.narration, scene.voiceDirection);

  try {
    const response = await axios.post(
      "https://api.mistral.ai/v1/audio/speech",
      {
        model: MISTRAL_TTS_MODEL,
        input: narrationText,
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
    if (typeof base64Audio !== "string") throw new Error("No audio data in TTS response");

    fs.writeFileSync(outputPath, Buffer.from(base64Audio, "base64"));
    return outputPath;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      fs.writeFileSync("mistral_error.json", JSON.stringify(error.response.data, null, 2));
      console.error("Mistral TTS API Error Response:", JSON.stringify(error.response.data, null, 2));
    }
    throw new ProviderFailure(`Scene ${scene.id} TTS failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// ── Generate all scene audio (parallel with concurrency limit) ──

export const generateNarrationAudio = async (
  projectRoot: string,
  env: ProjectEnv,
  script: VideoScript,
  concurrency: number = 3
): Promise<string[]> => {
  if (!env.MISTRAL_API_KEY) {
    throw new ProviderFailure("MISTRAL_API_KEY is missing.");
  }

  // Dynamic import for p-limit (ESM)
  const { default: pLimit } = await import("p-limit");
  const limit = pLimit(concurrency);

  const results = await Promise.all(
    script.scenes.map((scene) =>
      limit(() => generateSceneAudio(projectRoot, env, script.slug, scene))
    )
  );

  return results;
};

// ── Audio duration probe ──

const execFilePromise = promisify(execFile);

export const getAudioDurationSeconds = async (absolutePath: string): Promise<number> => {
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
      `Unable to determine audio duration for ${absolutePath}. ${error instanceof Error ? error.message : ""}`
    );
  }
};

// ── Attach audio paths and durations to script (backward compat) ──

export const attachAudioToScript = async (
  projectRoot: string,
  script: VideoScript,
  sceneAudioPaths: string[]
): Promise<VideoScript> => {
  const FPS = 30;
  const adjustedScenes: SceneConfig[] = [];
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
      audioDurationSeconds: durationSeconds,
    });
  }

  return {
    ...script,
    durationSeconds: currentStart,
    audioDurationFrames: Math.round(currentStart * FPS),
    scenes: adjustedScenes,
  };
};
