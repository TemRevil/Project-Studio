import type { GenerationRequest, RunReport, RunStep, VideoScript } from "../types";
import { RunReportSchema, VideoScriptSchema } from "../types";
import { attachAudioToScript, generateNarrationAudio } from "./audio";
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
    createStep("render"),
    createStep("save"),
  ];

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

      onProgress?.({ step: "audio", message: "Generating narration audio." });
      const sceneAudioPaths = await generateNarrationAudio(projectRoot, env, draft.script);
      script = VideoScriptSchema.parse(await attachAudioToScript(projectRoot, draft.script, sceneAudioPaths));
      steps[1] = { ...steps[1], status: "succeeded", message: `Narration saved (${sceneAudioPaths.length} scenes).` };
      saveScript(projectRoot, script);
    } else {
      steps[1] = { ...steps[1], status: "skipped", message: "Audio generation skipped by operator option." };
    }

    if (!request.operator.dryRun) {
      onProgress?.({ step: "render", message: "Rendering video with Remotion." });
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
      steps[2] = { ...steps[2], status: "succeeded", message: `Rendered ${renderResult.outputLocation}.` };
    } else {
      steps[2] = { ...steps[2], status: "skipped", message: "Render skipped by dryRun option." };
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
    
    // Re-throw if it's a preflight or critical error we don't want to swallow
    if (error instanceof PreflightFailure) throw error;
  }

  steps[3] = { ...steps[3], status: status === "succeeded" ? "succeeded" : "failed", message: "Plan, script, and run report saved to videos/." };

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
