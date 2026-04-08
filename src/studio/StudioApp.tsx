import React from "react";
import { Box, Text, useApp, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import open from "open";
import { runDoctor, type DoctorReport } from "../core/doctor";
import { buildDraftPackage, createRequest, type DraftPackage } from "../core/generation";
import { runProductionPipeline, type PipelineProgress } from "../core/pipeline";
import { getVideoLibrary } from "../core/storage";
import type { GenerationRequest } from "../types";
import { config } from "./config";
import { Footer, Header } from "./components/Header";
import { AnimatedDots, ProgressBar, Spinner } from "./components/StatusWidgets";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { DEFAULT_VIDEO_STYLE_KEY, PALETTE_PRESETS, VIDEO_STYLES } from "./presets";

type Screen = "home" | "doctor" | "assets" | "library" | "generate" | "review" | "run" | "settings" | "help";
type GenerateStep =
  | "topic"
  | "takeaway"
  | "style"
  | "type"
  | "format"
  | "duration"
  | "quality"
  | "palette"
  | "sarcasm"
  | "music"
  | "audio"
  | "submit";

interface RunState {
  step: string;
  message: string;
  progress?: number;
  status: "running" | "succeeded" | "failed";
}

interface StudioAppProps {
  projectRoot: string;
}

const GENERATE_STEPS: GenerateStep[] = [
  "topic",
  "takeaway",
  "style",
  "type",
  "format",
  "duration",
  "quality",
  "palette",
  "sarcasm",
  "music",
  "audio",
  "submit",
];

const RUN_STEP_LABELS: Record<string, string> = {
  draft: "Draft",
  audio: "Narration",
  sync: "Word Sync",
  render: "Render",
  save: "Save",
};

const PROGRESS_STEP_ORDER = ["draft", "audio", "sync", "render", "save"];

const nextGenerateStep = (step: GenerateStep) => {
  const index = GENERATE_STEPS.indexOf(step);
  return GENERATE_STEPS[Math.min(GENERATE_STEPS.length - 1, index + 1)];
};

const previousGenerateStep = (step: GenerateStep) => {
  const index = GENERATE_STEPS.indexOf(step);
  return GENERATE_STEPS[Math.max(0, index - 1)];
};

export const StudioApp = ({ projectRoot }: StudioAppProps) => {
  const { exit } = useApp();
  const [screen, setScreen] = React.useState<Screen>("home");
  const [doctor, setDoctor] = React.useState<DoctorReport | null>(null);
  const [library, setLibrary] = React.useState<ReturnType<typeof getVideoLibrary>>([]);
  const [loading, setLoading] = React.useState<string | null>("Loading Project Studio...");
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<DraftPackage | null>(null);
  const [runSummary, setRunSummary] = React.useState<string | null>(null);
  const [logs, setLogs] = React.useState<string[]>([]);
  const [runState, setRunState] = React.useState<RunState | null>(null);

  const [topic, setTopic] = React.useState("");
  const [takeaway, setTakeaway] = React.useState("");
  const [type, setType] = React.useState<GenerationRequest["type"]>(config.store.defaultVideoType);
  const [format, setFormat] = React.useState<GenerationRequest["format"]>(config.store.defaultFormat);
  const [duration, setDuration] = React.useState(String(config.store.defaultDuration));
  const [quality, setQuality] = React.useState<GenerationRequest["quality"]>(config.store.defaultQuality);
  const [sarcasm, setSarcasm] = React.useState(config.store.sarcasmDefault);
  const [videoStyle, setVideoStyle] = React.useState(config.store.defaultVideoStyle ?? DEFAULT_VIDEO_STYLE_KEY);
  const [paletteKey, setPaletteKey] = React.useState(config.store.colorPalette);
  const [includeMusic, setIncludeMusic] = React.useState(config.store.includeMusicDefault);
  const [skipAudio, setSkipAudio] = React.useState(config.store.skipAudioDefault);
  const [generateStep, setGenerateStep] = React.useState<GenerateStep>("topic");

  const refresh = React.useCallback(async () => {
    setLoading("Refreshing workspace health");
    setError(null);
    try {
      setDoctor(runDoctor(projectRoot));
      setLibrary(getVideoLibrary(projectRoot));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setLoading(null);
    }
  }, [projectRoot]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const resetGeneratorState = React.useCallback(() => {
    setTopic("");
    setTakeaway("");
    setType(config.store.defaultVideoType);
    setFormat(config.store.defaultFormat);
    setDuration(String(config.store.defaultDuration));
    setQuality(config.store.defaultQuality);
    setSarcasm(config.store.sarcasmDefault);
    setVideoStyle(config.store.defaultVideoStyle ?? DEFAULT_VIDEO_STYLE_KEY);
    setPaletteKey(config.store.colorPalette);
    setIncludeMusic(config.store.includeMusicDefault);
    setSkipAudio(config.store.skipAudioDefault);
    setGenerateStep("topic");
    setDraft(null);
    setRunSummary(null);
    setRunState(null);
    setLogs([]);
    setError(null);
  }, []);

  const openGenerateWizard = React.useCallback(() => {
    resetGeneratorState();
    setScreen("generate");
  }, [resetGeneratorState]);

  const handleNavigation = React.useCallback((nextScreen: string) => {
    if (nextScreen === "generate") {
      openGenerateWizard();
      return;
    }

    setError(null);
    setScreen(nextScreen as Screen);
  }, [openGenerateWizard]);

  const handlePipelineProgress = React.useCallback((progress: PipelineProgress) => {
    setRunState({
      step: progress.step,
      message: progress.message,
      progress: progress.progress,
      status: "running",
    });

    setLogs((current) => {
      const suffix = typeof progress.progress === "number" ? ` ${Math.round(progress.progress * 100)}%` : "";
      return [...current.slice(-9), `[${progress.step}] ${progress.message}${suffix}`];
    });
  }, []);

  const buildDraft = async () => {
    setLoading("Building draft package");
    setError(null);
    setLogs([]);
    try {
      const request = createRequest(
        {
          topic,
          takeaway: takeaway.trim() || undefined,
          type,
          format,
          durationSeconds: Number(duration),
          sarcasm,
          quality,
          videoStyle,
          paletteKey,
          customPalette: paletteKey === "custom" ? config.store.customPalette : undefined,
          operator: {
            autoApprove: true,
            includeMusic,
            dryRun: false,
            skipAudio,
          },
        },
        projectRoot,
      );
      const nextDraft = await buildDraftPackage(projectRoot, request);
      setDraft(nextDraft);
      setScreen("review");
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : String(buildError));
      setScreen("generate");
    } finally {
      setLoading(null);
    }
  };

  const approveDraft = async () => {
    if (!draft) {
      return;
    }

    setLoading(null);
    setRunSummary(null);
    setLogs([]);
    setError(null);
    setRunState({
      step: "draft",
      message: "Preparing pipeline",
      status: "running",
    });
    setScreen("run");

    try {
      const result = await runProductionPipeline(projectRoot, draft.request, handlePipelineProgress);
      setRunState({
        step: "save",
        message: "Render package saved successfully",
        progress: 1,
        status: "succeeded",
      });
      setRunSummary(`Rendered video: ${result.renderResult.outputLocation}`);
      if (config.store.autoOpenVideo) {
        void open(result.renderResult.outputLocation);
      }
      await refresh();
    } catch (runError) {
      const message = runError instanceof Error ? runError.message : String(runError);
      setRunState((current) => ({
        step: current?.step ?? "draft",
        message,
        progress: current?.progress,
        status: "failed",
      }));
      setError(message);
    }
  };

  useInput((input, key) => {
    if (!key.escape || loading) {
      return;
    }

    if (screen === "settings") {
      return;
    }

    if (screen === "home") {
      return;
    }

    if (screen === "generate") {
      if (generateStep === "topic") {
        setScreen("home");
        return;
      }

      setGenerateStep(previousGenerateStep(generateStep));
      return;
    }

    if (screen === "review") {
      setScreen("generate");
      setGenerateStep("submit");
      return;
    }

    if (screen === "run") {
      if (runState?.status === "running") {
        return;
      }

      setScreen("home");
      setRunSummary(null);
      setRunState(null);
      return;
    }

    setScreen("home");
  });

  const renderRequestSummary = () => {
    const palette = PALETTE_PRESETS[paletteKey] ?? config.store.customPalette;

    return (
      <Box marginTop={1} borderStyle="round" borderColor="gray" paddingX={1} flexDirection="column">
        <Text dimColor>Topic: {topic || "(waiting for topic)"}</Text>
        <Text dimColor>Takeaway: {takeaway.trim() || "(optional)"}</Text>
        <Text dimColor>Style: {VIDEO_STYLES[videoStyle]?.name ?? videoStyle}</Text>
        <Text dimColor>Type: {type} | Format: {format} | Duration: {duration}s</Text>
        <Text dimColor>Quality: {quality} | Sarcasm: {sarcasm ? "on" : "off"}</Text>
        <Text dimColor>Music: {includeMusic ? "on" : "off"} | Audio: {skipAudio ? "skip" : "generate"}</Text>
        <Text dimColor>Palette: {palette.name} | Accent {palette.accentColor}</Text>
      </Box>
    );
  };

  const renderDoctor = () => (
    <>
      <Header />
      <Text color="cyan" bold>Doctor Report</Text>
      {doctor ? (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text>Config: {doctor.configPath}</Text>
          <Text>Voice cloning: {doctor.voiceReady ? "ready" : "missing credentials"}</Text>
          <Text>Providers:</Text>
          {doctor.providers.map((provider) => (
            <Text key={`${provider.provider}-${provider.model}`}>
              - {provider.provider}:{provider.model} {provider.ready ? "ready" : `blocked (${provider.reason})`}
            </Text>
          ))}
          <Text>Production blockers:</Text>
          {doctor.productionTypes.map((videoType) => (
            <Text key={videoType}>
              - {videoType}: {doctor.productionIssues[videoType].length === 0 ? "clear" : doctor.productionIssues[videoType].join(", ")}
            </Text>
          ))}
        </Box>
      ) : null}
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  const renderAssets = () => (
    <>
      <Header />
      <Text color="cyan" bold>Asset Inventory</Text>
      {doctor ? (
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
          <Text>Characters: {doctor.assets.categories.characters.length}</Text>
          <Text>Icons: {doctor.assets.categories.icons.length}</Text>
          <Text>Lotties: {doctor.assets.categories.lottie.length}</Text>
          <Text>Music: {doctor.assets.categories.music.length}</Text>
          <Text>VFX: {doctor.assets.categories.vfx.length}</Text>
          <Text color="yellow">Missing production requirements: {doctor.assets.summary.missingProductionRequirements}</Text>
        </Box>
      ) : null}
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  const renderLibrary = () => (
    <>
      <Header />
      <Text color="cyan" bold>Video Library</Text>
      <Box marginTop={1} flexDirection="column">
        {library.length === 0 ? (
          <Text>No generated videos yet.</Text>
        ) : (
          library.map((entry) => (
            <Box key={entry.slug} flexDirection="column" marginBottom={1} borderStyle="round" borderColor="green" paddingX={1}>
              <Text bold color="green">{entry.slug}</Text>
              <Text dimColor>Files: {entry.files.join(", ")}</Text>
              {entry.mp4Path ? <Text dimColor>Render: {entry.mp4Path}</Text> : null}
            </Box>
          ))
        )}
      </Box>
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  const renderGenerate = () => {
    const heading = (
      <>
        <Header />
        <Text color="cyan" bold>Interactive Generation Wizard</Text>
        {generateStep !== "topic" ? renderRequestSummary() : null}
      </>
    );

    if (generateStep === "topic") {
      return (
        <>
          {heading}
          <Text>What topic should this video explain?</Text>
          <TextInput value={topic} onChange={setTopic} onSubmit={() => setGenerateStep(nextGenerateStep("topic"))} />
          <Footer onBack={() => setScreen("home")} hint="Press Enter to continue after naming the topic." />
        </>
      );
    }

    if (generateStep === "takeaway") {
      return (
        <>
          {heading}
          <Text>Optional takeaway or framing line</Text>
          <TextInput value={takeaway} onChange={setTakeaway} onSubmit={() => setGenerateStep(nextGenerateStep("takeaway"))} />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("takeaway"))} hint="Leave it blank if you just want the topic to drive the draft." />
        </>
      );
    }

    if (generateStep === "style") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the visual style</Text>
          <SelectInput
            items={Object.entries(VIDEO_STYLES).map(([key, style]) => ({
              label: `${style.name} - ${style.description}`,
              value: key,
            }))}
            onSelect={(item) => {
              setVideoStyle(item.value);
              setType(VIDEO_STYLES[item.value].defaultType);
              setSarcasm(VIDEO_STYLES[item.value].defaultSarcasm);
              setGenerateStep(nextGenerateStep("style"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("style"))} />
        </>
      );
    }

    if (generateStep === "type") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the video engine</Text>
          <SelectInput
            items={[
              { label: "Kinetic - fast text and icon beats", value: "kinetic" },
              { label: "Motion - flows, diagrams, moving systems", value: "motion" },
              { label: "Slides - clean cards and statement beats", value: "slides" },
              { label: "Animation - experimental animation mode", value: "animation" },
              { label: "Images - image-led storytelling", value: "images" },
              { label: "Hybrid - mixed experimental mode", value: "hybrid" },
            ]}
            onSelect={(item) => {
              setType(item.value as GenerationRequest["type"]);
              setGenerateStep(nextGenerateStep("type"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("type"))} />
        </>
      );
    }

    if (generateStep === "format") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the frame format</Text>
          <SelectInput
            items={[
              { label: "Reel - 9:16 vertical", value: "reel" },
              { label: "Video - 16:9 landscape", value: "video" },
              { label: "Square - 1:1 social tile", value: "square" },
            ]}
            onSelect={(item) => {
              setFormat(item.value as GenerationRequest["format"]);
              setGenerateStep(nextGenerateStep("format"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("format"))} />
        </>
      );
    }

    if (generateStep === "duration") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose a target duration</Text>
          <SelectInput
            items={[
              { label: "15 seconds", value: "15" },
              { label: "30 seconds", value: "30" },
              { label: "45 seconds", value: "45" },
              { label: "60 seconds", value: "60" },
              { label: "90 seconds", value: "90" },
            ]}
            onSelect={(item) => {
              setDuration(item.value);
              setGenerateStep(nextGenerateStep("duration"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("duration"))} />
        </>
      );
    }

    if (generateStep === "quality") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the quality profile</Text>
          <SelectInput
            items={[
              { label: "Production - fullest pipeline quality", value: "production" },
              { label: "Balanced - faster with solid quality", value: "balanced" },
              { label: "Fast - quickest turn for experiments", value: "fast" },
            ]}
            onSelect={(item) => {
              setQuality(item.value as GenerationRequest["quality"]);
              setGenerateStep(nextGenerateStep("quality"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("quality"))} />
        </>
      );
    }

    if (generateStep === "palette") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the video palette</Text>
          <SelectInput
            items={Object.entries(PALETTE_PRESETS).map(([key, palette]) => ({
              label: key === "custom" ? `${palette.name} - use colors from Settings` : `${palette.name} - accent ${palette.accentColor}`,
              value: key,
            }))}
            onSelect={(item) => {
              setPaletteKey(item.value);
              setGenerateStep(nextGenerateStep("palette"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("palette"))} hint="Use Settings if you want to fine-tune each color channel." />
        </>
      );
    }

    if (generateStep === "sarcasm") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose the narration tone</Text>
          <SelectInput
            items={[
              { label: "Sarcasm on - punchier and drier", value: "true" },
              { label: "Sarcasm off - cleaner and straightforward", value: "false" },
            ]}
            onSelect={(item) => {
              setSarcasm(item.value === "true");
              setGenerateStep(nextGenerateStep("sarcasm"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("sarcasm"))} />
        </>
      );
    }

    if (generateStep === "music") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose background music behavior</Text>
          <SelectInput
            items={[
              { label: "Include background music when available", value: "true" },
              { label: "No background music", value: "false" },
            ]}
            onSelect={(item) => {
              setIncludeMusic(item.value === "true");
              setGenerateStep(nextGenerateStep("music"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("music"))} />
        </>
      );
    }

    if (generateStep === "audio") {
      return (
        <>
          {heading}
          <Text color="cyan" bold>Choose narration behavior</Text>
          <SelectInput
            items={[
              { label: "Generate narration audio and sync timing", value: "false" },
              { label: "Skip audio and render layout only", value: "true" },
            ]}
            onSelect={(item) => {
              setSkipAudio(item.value === "true");
              setGenerateStep(nextGenerateStep("audio"));
            }}
          />
          <Footer onBack={() => setGenerateStep(previousGenerateStep("audio"))} />
        </>
      );
    }

    const palette = PALETTE_PRESETS[paletteKey] ?? config.store.customPalette;

    return (
      <>
        {heading}
        <Text color="cyan" bold>Review Request</Text>
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="green" paddingX={1}>
          <Text>Topic: {topic}</Text>
          <Text>Takeaway: {takeaway.trim() || "(none)"}</Text>
          <Text>Style: {VIDEO_STYLES[videoStyle]?.name ?? videoStyle}</Text>
          <Text>Type: {type}</Text>
          <Text>Format: {format}</Text>
          <Text>Duration: {duration}s</Text>
          <Text>Quality: {quality}</Text>
          <Text>Sarcasm: {sarcasm ? "on" : "off"}</Text>
          <Text>Music: {includeMusic ? "on" : "off"}</Text>
          <Text>Audio sync: {skipAudio ? "skip audio" : "full audio + sync"}</Text>
          <Text>Palette: {palette.name}</Text>
          <Text dimColor>
            Background {palette.mainBackground} | Text {palette.primaryText} | Accent {palette.accentColor}
          </Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={[
              { label: "Build draft for review", value: "submit" },
              { label: "Back one step", value: "back" },
            ]}
            onSelect={(item) => (item.value === "submit" ? void buildDraft() : setGenerateStep(previousGenerateStep("submit")))}
          />
        </Box>
        <Footer onBack={() => setGenerateStep(previousGenerateStep("submit"))} />
      </>
    );
  };

  const renderReview = () => (
    <>
      <Header />
      <Text color="cyan" bold>Draft Review</Text>
      {draft ? (
        <Box marginTop={1} flexDirection="column">
          <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
            <Text dimColor>Provider used: {draft.providerUsed}</Text>
            <Text dimColor>Warnings: {draft.warnings.length === 0 ? "none" : draft.warnings.join(" | ")}</Text>
            <Text bold color="green">Slug: {draft.script.slug}</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            {draft.script.scenes.map((scene, index) => (
              <Box key={scene.id} flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
                <Text color="magenta" bold>Scene {index + 1} - {scene.voiceDirection?.emotion ?? scene.emotion ?? "default"}</Text>
                <Text italic>"{scene.narration}"</Text>
                <Text dimColor>
                  Entry: {scene.entryVariant ?? "default"} | Visual type: {scene.visual.type}
                </Text>
                <Text dimColor>
                  Elements: {scene.visual.elements.map((element) => element.label || element.kind).join(" | ")}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: "Approve and run pipeline", value: "approve" },
            { label: "Back to request", value: "back" },
            { label: "Discard draft", value: "home" },
          ]}
          onSelect={(item) => {
            if (item.value === "approve") {
              void approveDraft();
              return;
            }

            if (item.value === "back") {
              setScreen("generate");
              setGenerateStep("submit");
              return;
            }

            setScreen("home");
          }}
        />
      </Box>
      <Footer onBack={() => setScreen("generate")} />
    </>
  );

  const renderRun = () => {
    const activeStep = runState?.step ?? "draft";
    const activeLabel = RUN_STEP_LABELS[activeStep] ?? activeStep;
    const activeIndex = PROGRESS_STEP_ORDER.indexOf(activeStep);

    return (
      <>
        <Header />
        <Text color="cyan" bold>Pipeline Run</Text>
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
          <Text bold>Current stage: {activeLabel}</Text>
          {typeof runState?.progress === "number" ? (
            <ProgressBar progress={runState.progress} label={runState.message} color={runState.status === "failed" ? "red" : "green"} />
          ) : (
            <Spinner label={runState?.message ?? "Waiting for engine output"} color={runState?.status === "failed" ? "red" : "cyan"} />
          )}
        </Box>
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text bold color="yellow">Stage tracker</Text>
          {PROGRESS_STEP_ORDER.map((step, index) => {
            const status =
              runState?.status === "succeeded"
                ? "done"
                : runState?.status === "failed" && step === activeStep
                  ? "failed"
                  : index < activeIndex
                    ? "done"
                    : step === activeStep
                      ? "live"
                      : "wait";
            const prefix = status === "done" ? "[done]" : status === "failed" ? "[fail]" : status === "live" ? "[live]" : "[wait]";
            const color = status === "done" ? "green" : status === "failed" ? "red" : status === "live" ? "cyan" : "gray";
            return (
              <Text key={step} color={color}>
                {prefix} {RUN_STEP_LABELS[step]}
              </Text>
            );
          })}
        </Box>
        <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
          <Text bold color="yellow">Recent activity</Text>
          {logs.length === 0 ? <Text dimColor>No pipeline messages yet.</Text> : logs.map((line, index) => <Text key={`${line}-${index}`}>{line}</Text>)}
        </Box>
        {runSummary ? (
          <Box marginTop={1} flexDirection="column">
            <Text color="green" bold>{runSummary}</Text>
            <Footer onBack={() => setScreen("home")} hint="Esc now returns to the home screen." />
          </Box>
        ) : error ? (
          <Footer onBack={() => setScreen("home")} hint="Esc returns home after a failed run." />
        ) : null}
      </>
    );
  };

  const renderHelp = () => (
    <>
      <Header />
      <Text color="cyan" bold>Quick Reference</Text>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
        <Text color="magenta">Interactive generation</Text>
        <Text>The Ink wizard now lets you choose topic, takeaway, style, format, quality, audio, music, and palette before drafting.</Text>
        <Text dimColor>Headless equivalent: npm run generate</Text>
        <Box marginTop={1} flexDirection="column">
          <Text color="magenta">Palette tuning</Text>
          <Text>Open Settings to switch presets or edit your own background, text, accent, emphasis, surface, and secondary colors.</Text>
          <Text dimColor>Custom palette values are passed into the saved script and renderer.</Text>
        </Box>
      </Box>
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  return (
    <Box flexDirection="column" minHeight={20}>
      {loading ? <AnimatedDots label={loading} color="yellowBright" /> : null}
      {error && screen !== "run" ? (
        <Box marginTop={1} borderStyle="round" borderColor="red" paddingX={1}>
          <Text color="redBright" bold>Error: {error}</Text>
        </Box>
      ) : null}

      {!loading && screen === "home" ? <HomeScreen doctor={doctor} videoCount={library.length} onNavigate={handleNavigation} onExit={exit} onRefresh={refresh} /> : null}
      {!loading && screen === "settings" ? <SettingsScreen onBack={() => setScreen("home")} projectRoot={projectRoot} /> : null}
      {!loading && screen === "help" ? renderHelp() : null}
      {!loading && screen === "doctor" ? renderDoctor() : null}
      {!loading && screen === "assets" ? renderAssets() : null}
      {!loading && screen === "library" ? renderLibrary() : null}
      {!loading && screen === "generate" ? renderGenerate() : null}
      {!loading && screen === "review" ? renderReview() : null}
      {screen === "run" ? renderRun() : null}
    </Box>
  );
};

export default StudioApp;
