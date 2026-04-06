import React from "react";
import { Box, Text, useApp } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import type { GenerationRequest } from "../types";
import { buildDraftPackage, createRequest, type DraftPackage } from "../core/generation";
import { runDoctor, type DoctorReport } from "../core/doctor";
import { runProductionPipeline } from "../core/pipeline";
import { getVideoLibrary } from "../core/storage";

type Screen = "home" | "doctor" | "assets" | "library" | "generate" | "review" | "run";

interface StudioAppProps {
  projectRoot: string;
}

interface MenuItem<T> {
  label: string;
  value: T;
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
  const [topic, setTopic] = React.useState("How reliable AI video pipelines work");
  const [type, setType] = React.useState<GenerationRequest["type"]>("kinetic");
  const [format, setFormat] = React.useState<GenerationRequest["format"]>("reel");
  const [duration, setDuration] = React.useState("30");
  const [sarcasm, setSarcasm] = React.useState(true);
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

  const homeItems: MenuItem<string>[] = [
    { label: "Generate Draft", value: "generate" },
    { label: "Doctor", value: "doctor" },
    { label: "Assets", value: "assets" },
    { label: "Library", value: "library" },
    { label: "Refresh", value: "refresh" },
    { label: "Exit", value: "exit" },
  ];

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
          operator: {
            autoApprove: true,
            includeMusic: true,
            dryRun: false,
            skipAudio: false,
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

    setLoading("Running production pipeline...");
    setRunSummary(null);
    setLogs([]);
    setError(null);
    setScreen("run");

    try {
      const result = await runProductionPipeline(projectRoot, draft.request, (progress) => {
        setLogs((current) => [...current.slice(-7), `${progress.step}: ${progress.message}`]);
      });
      setRunSummary(`Rendered ${result.renderResult.outputLocation}`);
      await refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setLoading(null);
    }
  };

  const renderHome = () => (
    <>
      <Header />
      <Text color="cyan">Interactive studio for Project Studio's production pipeline.</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Production-ready types: {doctor?.productionTypes.join(", ") ?? "Loading..."}</Text>
        <Text>Providers ready: {doctor?.providers.filter((provider) => provider.ready).length ?? 0}</Text>
        <Text>Voice ready: {doctor?.voiceReady ? "yes" : "no"}</Text>
        <Text>Videos in library: {library.length}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <SelectInput
          items={homeItems}
          onSelect={(item) => {
            switch (item.value) {
              case "generate":
                setGenerateStep("topic");
                setScreen("generate");
                return;
              case "doctor":
              case "assets":
              case "library":
                setScreen(item.value as Screen);
                return;
              case "refresh":
                void refresh();
                return;
              case "exit":
                exit();
                return;
              default:
                return;
            }
          }}
        />
      </Box>
    </>
  );

  const renderDoctor = () => (
    <>
      <Header />
      <Text color="cyan">Doctor</Text>
      {doctor ? (
        <Box marginTop={1} flexDirection="column">
          <Text>Series: {doctor.seriesName}</Text>
          <Text>Config: {doctor.configPath}</Text>
          <Text>Defaults: {doctor.defaultRequest.type} / {doctor.defaultRequest.format} / {doctor.defaultRequest.quality}</Text>
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
      <Text color="cyan">Assets</Text>
      {doctor ? (
        <Box marginTop={1} flexDirection="column">
          <Text>characters: {doctor.assets.categories.characters.length}</Text>
          <Text>icons: {doctor.assets.categories.icons.length}</Text>
          <Text>lottie: {doctor.assets.categories.lottie.length}</Text>
          <Text>music: {doctor.assets.categories.music.length}</Text>
          <Text>vfx: {doctor.assets.categories.vfx.length}</Text>
          <Text>Missing required production assets: {doctor.assets.summary.missingProductionRequirements}</Text>
        </Box>
      ) : null}
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  const renderLibrary = () => (
    <>
      <Header />
      <Text color="cyan">Library</Text>
      <Box marginTop={1} flexDirection="column">
        {library.length === 0 ? (
          <Text>No generated videos yet.</Text>
        ) : (
          library.map((entry) => (
            <Text key={entry.slug}>
              - {entry.slug}: {entry.files.join(", ")}
            </Text>
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
          <Text color="cyan">Generation Wizard</Text>
          <Text>Topic</Text>
          <TextInput
            value={topic}
            onChange={setTopic}
            onSubmit={() => setGenerateStep("type")}
          />
          <Footer onBack={() => setScreen("home")} hint="Press enter to continue." />
        </>
      );
    }

    if (generateStep === "type") {
      const items: MenuItem<GenerationRequest["type"]>[] = [
        { label: "kinetic", value: "kinetic" },
        { label: "motion", value: "motion" },
        { label: "slides", value: "slides" },
        { label: "animation (experimental)", value: "animation" },
        { label: "images (experimental)", value: "images" },
        { label: "hybrid (experimental)", value: "hybrid" },
      ];
      return (
        <>
          <Header />
          <Text color="cyan">Video Type</Text>
          <SelectInput items={items} onSelect={(item) => { setType(item.value); setGenerateStep("format"); }} />
          <Footer onBack={() => setGenerateStep("topic")} />
        </>
      );
    }

    if (generateStep === "format") {
      const items: MenuItem<GenerationRequest["format"]>[] = [
        { label: "reel", value: "reel" },
        { label: "video", value: "video" },
        { label: "square", value: "square" },
      ];
      return (
        <>
          <Header />
          <Text color="cyan">Format</Text>
          <SelectInput items={items} onSelect={(item) => { setFormat(item.value); setGenerateStep("duration"); }} />
          <Footer onBack={() => setGenerateStep("type")} />
        </>
      );
    }

    if (generateStep === "duration") {
      return (
        <>
          <Header />
          <Text color="cyan">Duration (seconds)</Text>
          <TextInput
            value={duration}
            onChange={setDuration}
            onSubmit={() => setGenerateStep("sarcasm")}
          />
          <Footer onBack={() => setGenerateStep("format")} hint="Use 30, 60, or 90." />
        </>
      );
    }

    if (generateStep === "sarcasm") {
      const items: MenuItem<boolean>[] = [
        { label: "Sarcasm on", value: true },
        { label: "Sarcasm off", value: false },
      ];
      return (
        <>
          <Header />
          <Text color="cyan">Sarcasm</Text>
          <SelectInput items={items} onSelect={(item) => { setSarcasm(item.value); setGenerateStep("submit"); }} />
          <Footer onBack={() => setGenerateStep("duration")} />
        </>
      );
    }

    const submitItems: MenuItem<string>[] = [
      { label: "Build draft", value: "submit" },
      { label: "Back", value: "back" },
    ];
    return (
      <>
        <Header />
        <Text color="cyan">Review Request</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Topic: {topic}</Text>
          <Text>Type: {type}</Text>
          <Text>Format: {format}</Text>
          <Text>Duration: {duration}s</Text>
          <Text>Sarcasm: {sarcasm ? "on" : "off"}</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={submitItems}
            onSelect={(item) => {
              if (item.value === "submit") {
                void buildDraft();
                return;
              }

              setGenerateStep("sarcasm");
            }}
          />
        </Box>
      </>
    );
  };

  const renderReview = () => (
    <>
      <Header />
      <Text color="cyan">Draft Review</Text>
      {draft ? (
        <Box marginTop={1} flexDirection="column">
          <Text>Provider: {draft.providerUsed}{draft.repaired ? " (repaired)" : ""}</Text>
          <Text>Slug: {draft.script.slug}</Text>
          <Text>Scenes: {draft.script.scenes.length}</Text>
          {draft.script.scenes.map((scene) => (
            <Text key={scene.id}>
              - {scene.id} [{scene.startSecond}s-{scene.endSecond}s] {scene.narration}
            </Text>
          ))}
        </Box>
      ) : null}
      <Box marginTop={1}>
        <SelectInput
          items={[
            { label: "Approve and render", value: "approve" },
            { label: "Back to home", value: "home" },
          ]}
          onSelect={(item) => {
            if (item.value === "approve") {
              void approveDraft();
              return;
            }

            setScreen("home");
          }}
        />
      </Box>
    </>
  );

  const renderRun = () => (
    <>
      <Header />
      <Text color="cyan">Pipeline Run</Text>
      <Box marginTop={1} flexDirection="column">
        {logs.length === 0 ? <Text>Waiting for pipeline output...</Text> : logs.map((line, index) => <Text key={`${line}-${index}`}>{line}</Text>)}
        {runSummary ? <Text color="green">{runSummary}</Text> : null}
      </Box>
      <Footer onBack={() => setScreen("home")} />
    </>
  );

  return (
    <Box flexDirection="column">
      {loading ? <Text color="yellow">{loading}</Text> : null}
      {error ? <Text color="red">{error}</Text> : null}
      {!loading && screen === "home" ? renderHome() : null}
      {!loading && screen === "doctor" ? renderDoctor() : null}
      {!loading && screen === "assets" ? renderAssets() : null}
      {!loading && screen === "library" ? renderLibrary() : null}
      {!loading && screen === "generate" ? renderGenerate() : null}
      {!loading && screen === "review" ? renderReview() : null}
      {!loading && screen === "run" ? renderRun() : null}
    </Box>
  );
};

export default StudioApp;

const Header = () => (
  <Box flexDirection="column" marginBottom={1}>
    <Text color="cyanBright">Project Studio</Text>
    <Text color="gray">Production-first AI video system</Text>
  </Box>
);

const Footer = ({ onBack, hint }: { onBack: () => void; hint?: string }) => (
  <Box marginTop={1} flexDirection="column">
    {hint ? <Text color="gray">{hint}</Text> : null}
    <Text color="gray">Use the menu to navigate. Back returns to the previous screen.</Text>
    <Box marginTop={1}>
      <SelectInput
        items={[{ label: "Back", value: "back" }]}
        onSelect={() => onBack()}
      />
    </Box>
  </Box>
);
