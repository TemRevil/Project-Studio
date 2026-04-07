import React from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import open from "open";
import type { GenerationRequest } from "../types";
import { buildDraftPackage, createRequest, type DraftPackage } from "../core/generation";
import { runDoctor, type DoctorReport } from "../core/doctor";
import { runProductionPipeline } from "../core/pipeline";
import { getVideoLibrary } from "../core/storage";
import { config } from "./config";
import { Header, Footer } from "./components/Header";
import { HomeScreen } from "./screens/HomeScreen";
import { SettingsScreen } from "./screens/SettingsScreen";

type Screen = "home" | "doctor" | "assets" | "library" | "generate" | "review" | "run" | "settings" | "help";

interface StudioAppProps {
  projectRoot: string;
}

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
  
  // Generator State
  const [topic, setTopic] = React.useState("");
  const [type, setType] = React.useState<GenerationRequest["type"]>(config.store.defaultVideoType);
  const [format, setFormat] = React.useState<GenerationRequest["format"]>(config.store.defaultFormat);
  const [duration, setDuration] = React.useState(String(config.store.defaultDuration));
  const [sarcasm, setSarcasm] = React.useState(config.store.sarcasmDefault);
  const [generateStep, setGenerateStep] = React.useState<"topic" | "type" | "format" | "duration" | "sarcasm" | "submit">("topic");

  const refresh = React.useCallback(async () => {
    setLoading("Refreshing workspace health...");
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

  const buildDraft = async () => {
    setLoading("Building draft package...");
    setError(null);
    setLogs([]);
    try {
      const request = createRequest(
        {
          topic,
          type,
          format,
          durationSeconds: Number(duration),
          sarcasm,
          operator: { autoApprove: true, includeMusic: true, dryRun: false, skipAudio: false },
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
    if (!draft) return;

    setLoading(null); // Clear overall loading since we use Pipeline progress now
    setRunSummary(null);
    setLogs([]);
    setError(null);
    setScreen("run");

    try {
      const result = await runProductionPipeline(projectRoot, draft.request, (progress) => {
        setLogs((current) => [...current.slice(-10), `[${progress.step}] ${progress.message}`]);
      });
      setRunSummary(`Rendered: ${result.renderResult.outputLocation}`);
      if (config.store.autoOpenVideo) {
         void open(result.renderResult.outputLocation);
      }
      await refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    }
  };

  const renderDoctor = () => (
    <>
      <Header />
      <Text color="cyan" bold>Doctor Report</Text>
      {doctor ? (
        <Box marginTop={1} flexDirection="column">
          <Text>Config: {doctor.configPath}</Text>
          <Text>Voice cloning: {doctor.voiceReady ? "ready" : "missing credentials"}</Text>
          <Text>Providers:</Text>
          {doctor.providers.map((p) => (
            <Text key={`${p.provider}-${p.model}`}>
              - {p.provider}:{p.model} {p.ready ? "ready" : `blocked (${p.reason})`}
            </Text>
          ))}
          <Text>Production blockers:</Text>
          {doctor.productionTypes.map((vt) => (
            <Text key={vt}>
              - {vt}: {doctor.productionIssues[vt].length === 0 ? "clear" : doctor.productionIssues[vt].join(", ")}
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
        <Box marginTop={1} flexDirection="column">
          <Text>Characters: {doctor.assets.categories.characters.length}</Text>
          <Text>Icons: {doctor.assets.categories.icons.length}</Text>
          <Text>Lotties: {doctor.assets.categories.lottie.length}</Text>
          <Text>Music: {doctor.assets.categories.music.length}</Text>
          <Text>VFX: {doctor.assets.categories.vfx.length}</Text>
          <Box marginTop={1}>
            <Text color="yellow">Missing required production assets: {doctor.assets.summary.missingProductionRequirements}</Text>
          </Box>
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
            <Box key={entry.slug} flexDirection="column" marginBottom={1}>
              <Text bold color="green">{entry.slug}</Text>
              <Text dimColor>  Files: {entry.files.join(", ")}</Text>
            </Box>
          ))
        )}
      </Box>
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  const renderGenerate = () => {
    if (generateStep === "topic") {
      return (
        <>
          <Header />
          <Text color="cyan" bold>Generation Wizard</Text>
          <Text>Topic to explain:</Text>
          <TextInput value={topic} onChange={setTopic} onSubmit={() => setGenerateStep("type")} />
          <Footer onBack={() => setScreen("home")} hint="Press enter to continue." />
        </>
      );
    }
    if (generateStep === "type") {
      return (
        <>
          <Header />
          <Text color="cyan" bold>Video Type</Text>
          <SelectInput
            items={[
              { label: "Kinetic (Fast Paced Text/Icons)", value: "kinetic" },
              { label: "Motion (Systems/Flows)", value: "motion" },
              { label: "Slides", value: "slides" },
              { label: "Animation", value: "animation" },
            ]}
            onSelect={(i) => { setType(i.value as any); setGenerateStep("format"); }}
          />
          <Footer onBack={() => setGenerateStep("topic")} />
        </>
      );
    }
    if (generateStep === "format") {
      return (
        <>
          <Header />
          <Text color="cyan" bold>Format</Text>
          <SelectInput
            items={[
              { label: "Reel (9:16)", value: "reel" },
              { label: "Video (16:9)", value: "video" },
              { label: "Square (1:1)", value: "square" },
            ]}
            onSelect={(i) => { setFormat(i.value as any); setGenerateStep("duration"); }}
          />
          <Footer onBack={() => setGenerateStep("type")} />
        </>
      );
    }
    if (generateStep === "duration") {
      return (
        <>
          <Header />
          <Text color="cyan" bold>Approximate Duration (seconds)</Text>
          <TextInput value={duration} onChange={setDuration} onSubmit={() => setGenerateStep("sarcasm")} />
          <Footer onBack={() => setGenerateStep("format")} hint="Press enter to continue (30, 60, 90)." />
        </>
      );
    }
    if (generateStep === "sarcasm") {
      return (
        <>
          <Header />
          <Text color="cyan" bold>Sarcasm Setting</Text>
          <SelectInput
            items={[{ label: "Sarcasm ON", value: true }, { label: "Sarcasm OFF", value: false }]}
            onSelect={(i) => { setSarcasm(i.value); setGenerateStep("submit"); }}
          />
          <Footer onBack={() => setGenerateStep("duration")} />
        </>
      );
    }
    return (
      <>
        <Header />
        <Text color="cyan" bold>Review Request</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Topic: {topic}</Text>
          <Text>Type: {type}</Text>
          <Text>Format: {format}</Text>
          <Text>Duration: {duration}s</Text>
          <Text>Sarcasm: {sarcasm ? "on" : "off"}</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={[{ label: "Build Draft", value: "submit" }, { label: "Go Back", value: "back" }]}
            onSelect={(i) => i.value === "submit" ? void buildDraft() : setGenerateStep("sarcasm")}
          />
        </Box>
      </>
    );
  };

  const renderReview = () => (
    <>
      <Header />
      <Text color="cyan" bold>Draft Review</Text>
      {draft ? (
        <Box marginTop={1} flexDirection="column">
          <Text dimColor>Provider used: {draft.providerUsed}</Text>
          <Text bold color="green">Slug: {draft.script.slug}</Text>
          <Box marginTop={1} flexDirection="column">
            {draft.script.scenes.map((scene, idx) => (
              <Box key={scene.id} flexDirection="column" marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
                 <Text color="magenta" bold>Scene {idx + 1} - Emotion: {scene.voiceDirection?.emotion ?? scene.emotion ?? "default"}</Text>
                 <Text italic>"{scene.narration}"</Text>
                 <Box marginTop={1} flexDirection="column">
                    <Text dimColor bold>Visual Elements:</Text>
                    {scene.visual.elements.map((el) => (
                      <Text key={el.id} dimColor>
                        - {el.kind}: {el.label || "(no label)"} {el.triggersOnWord ? `[Triggers on: ${el.triggersOnWord}]` : `[Frame: ${el.entryFrame}]`}
                      </Text>
                    ))}
                 </Box>
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <SelectInput
          items={[{ label: "Approve and Render", value: "approve" }, { label: "Discard Draft", value: "home" }]}
          onSelect={(i) => i.value === "approve" ? void approveDraft() : setScreen("home")}
        />
      </Box>
    </>
  );

  const renderRun = () => (
    <>
      <Header />
      <Text color="bgBlue" bold> Pipeline Run </Text>
      <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        {logs.length === 0 ? <Text dimColor>Waiting for engine output...</Text> : logs.map((line, index) => (
           <Text key={index} color={line.includes("[ERROR]") ? "red" : line.includes("[DONE]") ? "green" : "white"}>{line}</Text>
        ))}
      </Box>
      {runSummary ? (
         <Box marginTop={1} flexDirection="column">
            <Text color="green" bold>{runSummary}</Text>
            <Footer onBack={() => setScreen("home")} />
         </Box>
      ) : null}
    </>
  );

  const renderHelp = () => (
    <>
      <Header />
      <Text color="cyan" bold>Quick Reference</Text>
      <Box marginTop={1} flexDirection="column">
        <Text color="magenta">Generation Pipeline</Text>
        <Text>The pipeline creates scripts and renders them to MP4 automatically.</Text>
        <Text>You can configure AI models in the Settings tab.</Text>
        <Text dimColor>CLI equivalent: 'npm run generate'</Text>
        
        <Box marginTop={1} flexDirection="column">
           <Text color="magenta">Asset Management</Text>
           <Text>Drop audio/images to attachments/New and run initialization.</Text>
           <Text dimColor>CLI equivalent: 'npm run init-assets'</Text>
        </Box>
      </Box>
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  return (
    <Box flexDirection="column" minHeight={20}>
      {loading ? <Text color="yellowBright" bold>{loading}</Text> : null}
      {error ? <Text color="redBright" bold>Error: {error}</Text> : null}
      
      {!loading && screen === "home" ? <HomeScreen doctor={doctor} videoCount={library.length} onNavigate={(s) => setScreen(s as Screen)} onExit={exit} onRefresh={refresh} /> : null}
      {!loading && screen === "settings" ? <SettingsScreen onBack={() => setScreen("home")} /> : null}
      {!loading && screen === "help" ? renderHelp() : null}
      {!loading && screen === "doctor" ? renderDoctor() : null}
      {!loading && screen === "assets" ? renderAssets() : null}
      {!loading && screen === "library" ? renderLibrary() : null}
      {!loading && screen === "generate" ? renderGenerate() : null}
      {!loading && screen === "review" ? renderReview() : null}
      {/* We DO NOT conditionally render `screen === "run"` with `!loading` because rendering is part of the run screen */}
      {screen === "run" ? renderRun() : null}
    </Box>
  );
};

export default StudioApp;
