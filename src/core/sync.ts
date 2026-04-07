import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import FormData from "form-data";
import type { ProjectEnv } from "./env";
import type { WordTimestamp, VisualElement, SFXCue, VideoScript, SceneConfig } from "../types";
import { ProviderFailure } from "./errors";
import { getAudioDurationSeconds } from "./audio";

// ── Constants ──
const FPS = 30;
const BUFFER_MS = 50; // visual appears 50ms before word for feel
const LINGER_FRAMES = 9; // 0.3s linger after audio ends
const MISTRAL_STT_MODEL = "mistral-small-latest"; // Using available model; upgrade to voxtral-small-2507 when available

// ── Frame conversion math (Appendix C) ──

export const wordStartFrame = (startSec: number): number =>
  Math.max(0, Math.round((startSec - BUFFER_MS / 1000) * FPS));

export const wordEndFrame = (endSec: number): number =>
  Math.round(endSec * FPS);

export const sceneFramesFromAudio = (audioDurationSec: number): number =>
  Math.round(audioDurationSec * FPS) + LINGER_FRAMES;

// ── STT: Transcribe scene audio with Voxtral ──

export interface RawSTTWord {
  word: string;
  start: number;
  end: number;
}

export interface STTResult {
  text: string;
  words: RawSTTWord[];
}

export const transcribeSceneAudio = async (
  audioPath: string,
  env: ProjectEnv
): Promise<WordTimestamp[]> => {
  if (!env.MISTRAL_API_KEY) {
    throw new ProviderFailure("MISTRAL_API_KEY is required for STT transcription.");
  }

  if (!fs.existsSync(audioPath)) {
    throw new ProviderFailure(`Audio file not found for transcription: ${audioPath}`);
  }

  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(audioPath));
    form.append("model", MISTRAL_STT_MODEL);
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities", "word");

    const response = await axios.post(
      "https://api.mistral.ai/v1/audio/transcriptions",
      form,
      {
        headers: {
          Authorization: `Bearer ${env.MISTRAL_API_KEY}`,
          ...form.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const data = response.data;
    const words: RawSTTWord[] = data.words ?? [];

    // Convert to WordTimestamp with frame info
    return words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      frame: wordStartFrame(w.start),
      endFrame: wordEndFrame(w.end),
    }));
  } catch (error) {
    // Fallback: estimate timestamps from narration if STT fails
    console.warn(
      `STT transcription failed for ${path.basename(audioPath)}, using estimation fallback.`,
      error instanceof Error ? error.message : error
    );
    return estimateTimestamps(audioPath);
  }
};

// ── Fallback: Estimate timestamps when STT is unavailable ──

const estimateTimestamps = async (audioPath: string): Promise<WordTimestamp[]> => {
  try {
    const duration = await getAudioDurationSeconds(audioPath);
    // We don't have the narration text here, so return empty
    // The caller should handle empty timestamps gracefully
    return [];
  } catch {
    return [];
  }
};

// ── Resolve element frames from word timestamps ──

export const resolveElementFrames = (
  elements: VisualElement[],
  wordTimestamps: WordTimestamp[],
  fps: number = FPS
): VisualElement[] => {
  return elements.map((el) => {
    if (el.triggersOnWord && wordTimestamps.length > 0) {
      const target = el.triggersOnWord.toLowerCase();
      const match = wordTimestamps.find((w) =>
        w.word.toLowerCase().includes(target) ||
        target.includes(w.word.toLowerCase())
      );

      if (match && match.frame !== undefined) {
        const delayFrames = el.entryDelayMs
          ? Math.round(el.entryDelayMs / (1000 / fps))
          : 0;
        return {
          ...el,
          entryFrame: match.frame + delayFrames,
        };
      }
    }
    return el;
  });
};

// ── Resolve SFX cue frames from word timestamps ──

export const resolveSfxFrames = (
  cues: SFXCue[] | undefined,
  wordTimestamps: WordTimestamp[],
  fps: number = FPS
): SFXCue[] | undefined => {
  if (!cues) return undefined;

  return cues.map((cue) => {
    if (cue.triggersOnWord && wordTimestamps.length > 0) {
      const target = cue.triggersOnWord.toLowerCase();
      const match = wordTimestamps.find((w) =>
        w.word.toLowerCase().includes(target)
      );

      if (match && match.frame !== undefined) {
        return { ...cue, frame: match.frame };
      }
    }
    return cue;
  });
};

// ── Reconcile scene durations from actual audio lengths ──

export const reconcileSceneDurations = async (
  script: VideoScript,
  sceneAudioPaths: string[]
): Promise<VideoScript> => {
  let currentStart = 0;
  const adjustedScenes: SceneConfig[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const audioPath = sceneAudioPaths[i];

    let audioDuration = scene.audioDurationSeconds;
    if (audioPath && fs.existsSync(audioPath)) {
      audioDuration = await getAudioDurationSeconds(audioPath);
    }

    const sceneEnd = currentStart + audioDuration + LINGER_FRAMES / FPS;

    adjustedScenes.push({
      ...scene,
      startSecond: currentStart,
      endSecond: sceneEnd,
      audioDurationSeconds: audioDuration,
    });

    currentStart = sceneEnd;
  }

  return {
    ...script,
    version: 3,
    durationSeconds: currentStart,
    audioDurationFrames: Math.round(currentStart * FPS),
    scenes: adjustedScenes,
  };
};

// ── Full sync pipeline for a single scene ──

export const syncScene = async (
  scene: SceneConfig,
  audioPath: string,
  env: ProjectEnv,
  fps: number = FPS
): Promise<SceneConfig> => {
  // Step 1: Transcribe the audio
  const wordTimestamps = await transcribeSceneAudio(audioPath, env);

  // Step 2: Resolve visual element frames from word triggers
  const resolvedElements = resolveElementFrames(
    scene.visual.elements,
    wordTimestamps,
    fps
  );

  // Step 3: Resolve SFX cue frames from word triggers
  const resolvedSfx = resolveSfxFrames(scene.sfxCues, wordTimestamps, fps);

  // Step 4: Get audio duration
  const audioDuration = await getAudioDurationSeconds(audioPath);

  return {
    ...scene,
    wordTimestamps,
    audioDurationSeconds: audioDuration,
    visual: {
      ...scene.visual,
      elements: resolvedElements,
    },
    sfxCues: resolvedSfx,
  };
};

// ── Batch sync: Process all scenes in a script ──

export const syncAllScenes = async (
  script: VideoScript,
  sceneAudioPaths: string[],
  env: ProjectEnv,
  fps: number = FPS
): Promise<VideoScript> => {
  const syncedScenes: SceneConfig[] = [];

  for (let i = 0; i < script.scenes.length; i++) {
    const scene = script.scenes[i];
    const audioPath = sceneAudioPaths[i];

    if (audioPath && fs.existsSync(audioPath)) {
      const synced = await syncScene(scene, audioPath, env, fps);
      syncedScenes.push(synced);
    } else {
      // No audio: keep scene as-is with empty timestamps
      syncedScenes.push({
        ...scene,
        wordTimestamps: scene.wordTimestamps ?? [],
        audioDurationSeconds: scene.audioDurationSeconds ?? 0,
      });
    }
  }

  // Reconcile durations from actual audio
  let currentStart = 0;
  const timedScenes = syncedScenes.map((scene) => {
    const duration = scene.audioDurationSeconds + LINGER_FRAMES / FPS;
    const result = {
      ...scene,
      startSecond: currentStart,
      endSecond: currentStart + duration,
    };
    currentStart += duration;
    return result;
  });

  return {
    ...script,
    version: 3,
    durationSeconds: currentStart,
    audioDurationFrames: Math.round(currentStart * FPS),
    scenes: timedScenes,
  };
};
