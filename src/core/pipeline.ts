import type { GenerationRequest, RunReport, RunStep, VideoScript } from "../types";
import { RunReportSchema, VideoScriptSchema } from "../types";
import { attachAudioToScript, generateNarrationAudio } from "./audio";
import { syncAllScenes } from "./sync";
import { runDoctor } from "./doctor";
import { buildDraftPackage } from "./generation";
import { PreflightFailure, RenderFailure } from "./errors";
import { renderVideoPackage } from "./rendering";
import { savePlan, saveRunReport, saveScript } from "./storage";
import { loadEnv } from "./env";

export interface PipelineProgress {
  step: string;
  message: string;
  progress?: number;
}

const createStep = (name: string): RunStep => ({
  name,
  status: "pending",
});

const finalizeReport = (report: RunReport) => RunReportSchema.parse(report);

/**
 * Project Studio 2.0 Pipeline
 * 
 * STEP 1: Generate script JSON (LLM) — with triggersOnWord, voiceDirection
 * STEP 2: Generate per-scene audio (Mistral TTS) — parallel with p-limit(3)
 * STEP 3: Transcribe each scene audio (Mistral STT) — word timestamps
 * STEP 4: Map word timestamps → entryFrame for every visual element
 * STEP 5: Reconcile scene durations from actual audio lengths
 * STEP 6: Render with Remotion
 * STEP 7: Save everything to videos/[slug]/
 */
export const runProductionPipeline = async (
  projectRoot: string,
  request: GenerationRequest,
  onProgress?: (progress: PipelineProgress) => void,
) => {
  const startedAt = new Date().toISOString();
  const draft = await buildDraftPackage(projectRoot, request);
  const doctor = runDoctor(projectRoot);
  const steps: RunStep[] = [
    createStep("draft"),
    createStep("audio"),
    createStep("sync"),       // NEW: STT + frame mapping
    createStep("render"),
    createStep("save"),
  ];

  // ── STEP 1: Draft package created ──
  steps[0] = { ...steps[0], status: "succeeded", message: `Draft created with ${draft.providerUsed}.` };
  onProgress?.({ step: "draft", message: "Draft package created." });

  savePlan(projectRoot, draft.plan);
  saveScript(projectRoot, draft.script);

  let script: VideoScript = draft.script;
  const issues: string[] = [...draft.warnings];
  let status: RunReport["status"] = "succeeded";
  let renderResult: { outputLocation: string } = { outputLocation: "dry-run-skipped" };

  try {
    if (!request.operator.skipAudio) {
      const env = loadEnv();
      if (!doctor.voiceReady) {
        throw new PreflightFailure("Voice generation is not ready. Configure Mistral credentials or use --skip-audio.");
      }

      // ── STEP 2: Generate per-scene audio (TTS) ──
      onProgress?.({ step: "audio", message: "Generating per-scene audio (TTS)..." });
      const sceneAudioPaths = await generateNarrationAudio(projectRoot, env, draft.script, 3);
      script = VideoScriptSchema.parse(await attachAudioToScript(projectRoot, draft.script, sceneAudioPaths));
      steps[1] = { ...steps[1], status: "succeeded", message: `${sceneAudioPaths.length} scene audio files generated.` };
      onProgress?.({ step: "audio", message: `✓ ${sceneAudioPaths.length} scenes recorded.` });

      // ── STEP 3: Sync engine — STT + frame mapping ──
      onProgress?.({ step: "sync", message: "Running sync engine (STT → timestamps → frame mapping)..." });
      try {
        script = VideoScriptSchema.parse(await syncAllScenes(script, sceneAudioPaths, env));
        steps[2] = { ...steps[2], status: "succeeded", message: "Word timestamps resolved, frames mapped from STT." };
        onProgress?.({ step: "sync", message: "✓ Sync engine complete — exact frame mapping applied." });
      } catch (syncError) {
        // Sync failure is non-fatal — fall back to estimated timing
        const syncMessage = syncError instanceof Error ? syncError.message : String(syncError);
        steps[2] = { ...steps[2], status: "succeeded", message: `Sync partial: ${syncMessage}. Using estimated timing.` };
        issues.push(`Sync engine warning: ${syncMessage}`);
        onProgress?.({ step: "sync", message: "⚠ Sync engine fallback — using estimated timing." });
      }

      saveScript(projectRoot, script);
    } else {
      steps[1] = { ...steps[1], status: "skipped", message: "Audio generation skipped by operator option." };
      steps[2] = { ...steps[2], status: "skipped", message: "Sync skipped (no audio)." };
    }

    // ── STEP 4: Render with Remotion ──
    if (!request.operator.dryRun) {
      onProgress?.({ step: "render", message: "Rendering video with Remotion..." });
      renderResult = await renderVideoPackage({
        projectRoot,
        script,
        onProgress: (progress) =>
          onProgress?.({
            step: "render",
            message: progress.stage,
            progress: progress.progress,
          }),
      });
      steps[3] = { ...steps[3], status: "succeeded", message: `Rendered ${renderResult.outputLocation}.` };
    } else {
      steps[3] = { ...steps[3], status: "skipped", message: "Render skipped by dryRun option." };
    }
  } catch (error) {
    status = "failed";
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Mark the active step as failed
    const activeStepIndex = steps.findIndex(s => s.status === "pending");
    if (activeStepIndex !== -1) {
      steps[activeStepIndex] = { ...steps[activeStepIndex], status: "failed", message: errorMessage };
    }
    
    issues.push(errorMessage);
    
    if (error instanceof PreflightFailure) throw error;
  }

  // ── STEP 5: Save ──
  steps[4] = { ...steps[4], status: status === "succeeded" ? "succeeded" : "failed", message: "Plan, script, and run report saved to videos/." };

  const report = finalizeReport({
    version: 2,
    slug: script.slug,
    mode: request.mode,
    status,
    startedAt,
    finishedAt: new Date().toISOString(),
    outputDir: renderResult.outputLocation,
    issues,
    steps,
  });

  saveRunReport(projectRoot, report);

  if (status === "failed") {
    throw new RenderFailure(`Pipeline failed: ${issues.join(", ")}`);
  }

  return {
    draft,
    script,
    renderResult,
    report,
  };
};
