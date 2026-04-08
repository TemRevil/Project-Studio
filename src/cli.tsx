#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { inspect } from "node:util";
import chalk from "chalk";
import { confirm, input, select } from "@inquirer/prompts";
import { buildAssetManifest, buildStudioNotes, getStudioNotesPath } from "./core/assets";
import { runDoctor } from "./core/doctor";
import { buildDraftPackage, createRequest } from "./core/generation";
import { runProductionPipeline } from "./core/pipeline";
import { renderVideoPackage } from "./core/rendering";
import { getScriptPath, getVideoLibrary, loadScript, savePlan, saveRunReport, saveScript } from "./core/storage";
import { RunReportSchema, type ColorPalette, type GenerationRequest } from "./types";
import { config, isHexColor, normalizeHexColor } from "./studio/config";
import { DEFAULT_VIDEO_STYLE_KEY, PALETTE_PRESETS, VIDEO_STYLES } from "./studio/presets";

type ParsedArgs = Record<string, string | boolean>;

const DOT_FRAMES = ["   ", ".  ", ".. ", "..."];
const BAR_WIDTH = 26;
const COLOR_ARG_MAP = {
  "background-color": "mainBackground",
  "text-color": "primaryText",
  "primary-color": "accentColor",
  "emphasis-color": "emphasisColor",
  "surface-color": "surfaceColor",
  "secondary-color": "secondaryColor",
} as const satisfies Record<string, keyof ColorPalette>;

const RUN_STEP_LABELS: Record<string, string> = {
  draft: "Draft",
  audio: "Narration",
  sync: "Word Sync",
  render: "Render",
  save: "Save",
};

const parseArgs = (argv: string[]) => {
  const args: ParsedArgs = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const rawKey = token.slice(2);
    if (rawKey.startsWith("no-")) {
      args[rawKey.slice(3)] = false;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[rawKey] = true;
      continue;
    }

    args[rawKey] = next;
    index += 1;
  }

  return args;
};

const getStringArg = (args: ParsedArgs, key: string) => {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
};

const hasArg = (args: ParsedArgs, key: string) => Object.prototype.hasOwnProperty.call(args, key);

const getBooleanArg = (args: ParsedArgs, key: string, fallback = false) => {
  const value = args[key];
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
};

const getNumberArg = (args: ParsedArgs, key: string) => {
  const value = getStringArg(args, key);
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const isInteractiveTerminal = () => Boolean(process.stdin.isTTY && process.stdout.isTTY);

const printJson = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const printHeader = (value: string) => {
  process.stdout.write(`${chalk.cyan.bold(value)}\n`);
};

const printLine = (value: string) => {
  process.stdout.write(`${value}\n`);
};

const formatProgressBar = (progress: number) => {
  const safe = Math.max(0, Math.min(1, progress));
  const filled = Math.round(safe * BAR_WIDTH);
  const empty = Math.max(0, BAR_WIDTH - filled);
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${Math.round(safe * 100)}%`;
};

const createLiveReporter = (enabled: boolean) => {
  type ReporterState = {
    step: string;
    message: string;
    progress?: number;
  };

  let frame = 0;
  let timer: NodeJS.Timeout | null = null;
  let current: ReporterState = {
    step: "draft",
    message: "Preparing pipeline",
  };

  const canRewriteLine = enabled && isInteractiveTerminal() && typeof process.stdout.clearLine === "function" && typeof process.stdout.cursorTo === "function";

  const clearLine = () => {
    if (!canRewriteLine) {
      return;
    }

    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  };

  const renderFrame = () => {
    if (!canRewriteLine) {
      return;
    }

    const label = RUN_STEP_LABELS[current.step] ?? current.step;
    const status = typeof current.progress === "number" ? formatProgressBar(current.progress) : DOT_FRAMES[frame % DOT_FRAMES.length];
    frame += 1;
    clearLine();
    process.stdout.write(`${chalk.cyan(label.padEnd(10))} ${status} ${current.message}`);
  };

  return {
    start(next?: ReporterState) {
      if (next) {
        current = next;
      }

      if (!canRewriteLine) {
        if (enabled) {
          printLine(`${current.step}: ${current.message}`);
        }
        return;
      }

      timer = setInterval(renderFrame, 120);
      renderFrame();
    },
    update(next: ReporterState) {
      current = next;
      if (!enabled) {
        return;
      }

      if (!canRewriteLine) {
        const suffix = typeof next.progress === "number" ? ` ${Math.round(next.progress * 100)}%` : "";
        printLine(`${next.step}: ${next.message}${suffix}`);
        return;
      }

      renderFrame();
    },
    stop(finalLine?: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      if (!enabled) {
        return;
      }

      clearLine();
      if (finalLine) {
        printLine(finalLine);
      }
    },
    fail(finalLine: string) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }

      clearLine();
      printLine(chalk.red(finalLine));
    },
  };
};

const buildCustomPaletteFromArgs = (args: ParsedArgs) => {
  const nextPalette: ColorPalette = {
    ...config.store.customPalette,
    name: "Custom Palette",
  };
  let changed = false;

  for (const [argName, field] of Object.entries(COLOR_ARG_MAP)) {
    const value = getStringArg(args, argName);
    if (!value) {
      continue;
    }

    if (!isHexColor(value)) {
      throw new Error(`--${argName} must be a hex color like #16425B.`);
    }

    nextPalette[field] = normalizeHexColor(value);
    changed = true;
  }

  return changed ? nextPalette : undefined;
};

const buildHeadlessRequest = (projectRoot: string, args: ParsedArgs) => {
  const topic = getStringArg(args, "topic");
  if (!topic) {
    throw new Error("The generate command requires --topic, or run it in an interactive TTY.");
  }

  const dryRun = getBooleanArg(args, "dry-run", false);
  const paletteFromArgs = buildCustomPaletteFromArgs(args);
  const paletteKey = getStringArg(args, "palette") ?? (paletteFromArgs ? "custom" : undefined);
  const customPalette = paletteFromArgs ?? (paletteKey === "custom" ? config.store.customPalette : undefined);

  return createRequest(
    {
      topic,
      takeaway: getStringArg(args, "takeaway"),
      type: getStringArg(args, "type") as GenerationRequest["type"] | undefined,
      format: getStringArg(args, "format") as GenerationRequest["format"] | undefined,
      durationSeconds: getNumberArg(args, "duration"),
      sarcasm: getBooleanArg(args, "sarcasm", true),
      mode: getStringArg(args, "mode") as GenerationRequest["mode"] | undefined,
      quality: getStringArg(args, "quality") as GenerationRequest["quality"] | undefined,
      videoStyle: getStringArg(args, "style"),
      paletteKey,
      customPalette,
      operator: {
        dryRun,
        skipAudio: getBooleanArg(args, "skip-audio", dryRun),
        autoApprove: true,
        includeMusic: getBooleanArg(args, "include-music", config.store.includeMusicDefault),
      },
    },
    projectRoot,
  );
};

const promptForCustomPalette = async (initialPalette: ColorPalette) => {
  const palette: ColorPalette = {
    ...initialPalette,
    name: "Custom Palette",
  };

  const prompts: Array<{ field: keyof typeof COLOR_ARG_MAP extends never ? never : keyof ColorPalette; label: string }> = [
    { field: "mainBackground", label: "Background color" },
    { field: "primaryText", label: "Text color" },
    { field: "accentColor", label: "Primary accent color" },
    { field: "emphasisColor", label: "Emphasis color" },
    { field: "surfaceColor", label: "Surface color" },
    { field: "secondaryColor", label: "Secondary color" },
  ];

  for (const prompt of prompts) {
    const value = await input({
      message: prompt.label,
      default: palette[prompt.field] as string,
      validate: (answer) => (isHexColor(answer) ? true : "Use a 6-digit hex color like #16425B."),
    });

    palette[prompt.field] = normalizeHexColor(value) as never;
  }

  return palette;
};

const promptForRequest = async (projectRoot: string, args: ParsedArgs) => {
  const topic = getStringArg(args, "topic") ?? await input({
    message: "What should this video explain?",
    validate: (value) => (value.trim().length > 0 ? true : "Topic is required."),
  });

  const takeaway = getStringArg(args, "takeaway") ?? await input({
    message: "Optional takeaway or angle",
    default: "",
  });

  const styleKey = getStringArg(args, "style") ?? await select({
    message: "Choose a video style",
    default: config.store.defaultVideoStyle ?? DEFAULT_VIDEO_STYLE_KEY,
    choices: Object.entries(VIDEO_STYLES).map(([key, style]) => ({
      value: key,
      name: style.name,
      description: style.description,
    })),
  });

  const type = (getStringArg(args, "type") as GenerationRequest["type"] | undefined) ?? await select({
    message: "Choose a video engine",
    default: VIDEO_STYLES[styleKey]?.defaultType ?? config.store.defaultVideoType,
    choices: [
      { value: "kinetic", name: "Kinetic", description: "Fast text, icons, sharp pacing" },
      { value: "motion", name: "Motion", description: "Systems, flows, and diagrams" },
      { value: "slides", name: "Slides", description: "Cards, headings, and clean explainers" },
      { value: "animation", name: "Animation", description: "Experimental animation mode" },
      { value: "images", name: "Images", description: "Image-led storytelling" },
      { value: "hybrid", name: "Hybrid", description: "Mixed experimental visuals" },
    ],
  });

  const format = (getStringArg(args, "format") as GenerationRequest["format"] | undefined) ?? await select({
    message: "Choose the frame format",
    default: config.store.defaultFormat,
    choices: [
      { value: "reel", name: "Reel", description: "9:16 vertical" },
      { value: "video", name: "Video", description: "16:9 landscape" },
      { value: "square", name: "Square", description: "1:1 social tile" },
    ],
  });

  const durationSeconds = getNumberArg(args, "duration") ?? Number(await select({
    message: "Choose the target duration",
    default: String(config.store.defaultDuration),
    choices: [
      { value: "15", name: "15 seconds" },
      { value: "30", name: "30 seconds" },
      { value: "45", name: "45 seconds" },
      { value: "60", name: "60 seconds" },
      { value: "90", name: "90 seconds" },
    ],
  }));

  const quality = (getStringArg(args, "quality") as GenerationRequest["quality"] | undefined) ?? await select({
    message: "Choose the quality profile",
    default: config.store.defaultQuality,
    choices: [
      { value: "production", name: "Production", description: "Best fidelity" },
      { value: "balanced", name: "Balanced", description: "Good quality with less waiting" },
      { value: "fast", name: "Fast", description: "Quickest turnaround" },
    ],
  });

  const sarcasm = hasArg(args, "sarcasm")
    ? getBooleanArg(args, "sarcasm", config.store.sarcasmDefault)
    : await confirm({
      message: "Enable sarcasm / punchier tone?",
      default: VIDEO_STYLES[styleKey]?.defaultSarcasm ?? config.store.sarcasmDefault,
    });

  const paletteFromArgs = buildCustomPaletteFromArgs(args);
  const paletteKey = getStringArg(args, "palette") ?? await select({
    message: "Choose the color palette",
    default: paletteFromArgs ? "custom" : config.store.colorPalette,
    choices: Object.entries(PALETTE_PRESETS).map(([key, palette]) => ({
      value: key,
      name: palette.name,
      description: key === "custom" ? "Edit each color channel yourself" : `Accent ${palette.accentColor}`,
    })),
  });

  let customPalette = paletteFromArgs ?? (paletteKey === "custom" ? config.store.customPalette : undefined);
  if (paletteKey === "custom" && !paletteFromArgs) {
    const customizeNow = await confirm({
      message: "Edit the custom palette colors now?",
      default: true,
    });

    if (customizeNow) {
      customPalette = await promptForCustomPalette(config.store.customPalette);
    }
  }

  const includeMusic = hasArg(args, "include-music")
    ? getBooleanArg(args, "include-music", config.store.includeMusicDefault)
    : await confirm({
      message: "Include background music when available?",
      default: config.store.includeMusicDefault,
    });

  const dryRunFlag = getBooleanArg(args, "dry-run", false);
  const skipAudio = hasArg(args, "skip-audio")
    ? getBooleanArg(args, "skip-audio", dryRunFlag || config.store.skipAudioDefault)
    : await confirm({
      message: "Skip narration audio and sync?",
      default: dryRunFlag || config.store.skipAudioDefault,
    });

  const requestedMode = getBooleanArg(args, "draft-only", false)
    ? "draft"
    : dryRunFlag
      ? "dry-run"
      : await select({
        message: "What should this run do?",
        default: "render",
        choices: [
          { value: "render", name: "Render full video", description: "Draft, audio, sync, and render" },
          { value: "draft", name: "Build draft only", description: "Create plan and script for review" },
          { value: "dry-run", name: "Dry run", description: "Skip final render, save the draft pipeline output" },
        ],
      });

  return {
    request: createRequest(
      {
        topic: topic.trim(),
        takeaway: takeaway.trim() || undefined,
        type,
        format,
        durationSeconds,
        sarcasm,
        quality,
        videoStyle: styleKey,
        paletteKey,
        customPalette,
        operator: {
          dryRun: requestedMode === "dry-run",
          skipAudio,
          autoApprove: true,
          includeMusic,
        },
      },
      projectRoot,
    ),
    draftOnly: requestedMode === "draft",
  };
};

const resolveGenerateRequest = async (projectRoot: string, args: ParsedArgs) => {
  if (isInteractiveTerminal() && (getBooleanArg(args, "interactive", false) || !getStringArg(args, "topic"))) {
    return promptForRequest(projectRoot, args);
  }

  return {
    request: buildHeadlessRequest(projectRoot, args),
    draftOnly: getBooleanArg(args, "draft-only", false),
  };
};

const resolveRenderScriptPath = async (projectRoot: string, args: ParsedArgs) => {
  const explicitScript = getStringArg(args, "from-script");
  const slug = getStringArg(args, "slug");
  if (explicitScript) {
    return path.resolve(projectRoot, explicitScript);
  }

  if (slug) {
    return getScriptPath(projectRoot, slug);
  }

  if (!isInteractiveTerminal()) {
    throw new Error("render requires --slug <slug> or --from-script <path> in non-interactive shells.");
  }

  const library = getVideoLibrary(projectRoot).filter((entry) => entry.scriptPath);
  if (library.length === 0) {
    throw new Error("No saved scripts were found in videos/.");
  }

  return select({
    message: "Choose a saved script to render",
    choices: library.map((entry) => ({
      value: entry.scriptPath!,
      name: entry.slug,
      description: entry.files.join(", "),
    })),
  });
};

const commandDoctor = (projectRoot: string, args: ParsedArgs) => {
  const report = runDoctor(projectRoot);
  if (getBooleanArg(args, "json", false)) {
    printJson(report);
    return;
  }

  printHeader("Project Studio Doctor");
  printLine(`Series: ${report.seriesName}`);
  printLine(`Defaults: ${report.defaultRequest.type} / ${report.defaultRequest.format} / ${report.defaultRequest.quality}`);
  printLine(`Voice ready: ${report.voiceReady ? "yes" : "no"}`);
  printLine("Providers:");
  report.providers.forEach((provider) => {
    printLine(`- ${provider.provider}:${provider.model} ${provider.ready ? "ready" : `blocked (${provider.reason})`}`);
  });
  printLine("Production blockers:");
  report.productionTypes.forEach((type) => {
    const issues = report.productionIssues[type];
    printLine(`- ${type}: ${issues.length === 0 ? "clear" : issues.join(", ")}`);
  });
};

const commandAssets = (projectRoot: string, args: ParsedArgs) => {
  const manifest = buildAssetManifest(projectRoot);
  if (getBooleanArg(args, "json", false)) {
    printJson(manifest);
    return;
  }

  printHeader("Asset Inventory");
  printLine(`characters: ${manifest.categories.characters.length}`);
  printLine(`icons: ${manifest.categories.icons.length}`);
  printLine(`lottie: ${manifest.categories.lottie.length}`);
  printLine(`music: ${manifest.categories.music.length}`);
  printLine(`vfx: ${manifest.categories.vfx.length}`);
  printLine(`missing required production assets: ${manifest.summary.missingProductionRequirements}`);
};

const commandInitAssets = (projectRoot: string, args: ParsedArgs) => {
  const manifest = buildAssetManifest(projectRoot);
  const studioNotes = buildStudioNotes(projectRoot, manifest);
  const pendingRawFiles = fs.existsSync(path.join(projectRoot, "attachments", "New"))
    ? fs.readdirSync(path.join(projectRoot, "attachments", "New")).filter((name) => name.toLowerCase() !== "initializing.md")
    : [];

  if (getBooleanArg(args, "json", false)) {
    printJson({
      studioNotesPath: path.relative(projectRoot, getStudioNotesPath(projectRoot)).replace(/\\/g, "/"),
      studioNotesLength: studioNotes.length,
      pendingRawFiles,
      manifest,
    });
    return;
  }

  printHeader("Asset Notes Initialized");
  printLine(`studio notes: ${path.relative(projectRoot, getStudioNotesPath(projectRoot)).replace(/\\/g, "/")}`);
  printLine(`characters: ${manifest.categories.characters.length}`);
  printLine(`icons: ${manifest.categories.icons.length}`);
  printLine(`lottie: ${manifest.categories.lottie.length}`);
  printLine(`music: ${manifest.categories.music.length}`);
  printLine(`vfx: ${manifest.categories.vfx.length}`);
  printLine(`missing required production assets: ${manifest.summary.missingProductionRequirements}`);
  if (pendingRawFiles.length > 0) {
    printLine(`pending raw files in attachments/New: ${pendingRawFiles.join(", ")}`);
  }
};

const commandLibrary = (projectRoot: string, args: ParsedArgs) => {
  const library = getVideoLibrary(projectRoot);
  if (getBooleanArg(args, "json", false)) {
    printJson(library);
    return;
  }

  printHeader("Video Library");
  if (library.length === 0) {
    printLine("No videos generated yet.");
    return;
  }

  library.forEach((entry) => {
    printLine(`- ${entry.slug}: ${entry.files.join(", ")}`);
  });
};

const commandGenerate = async (projectRoot: string, args: ParsedArgs) => {
  const { request, draftOnly } = await resolveGenerateRequest(projectRoot, args);
  const asJson = getBooleanArg(args, "json", false);
  const reporter = createLiveReporter(!asJson);

  if (draftOnly) {
    if (!asJson) {
      printHeader("Building Draft Package");
      reporter.start({ step: "draft", message: "Designing the draft package" });
    }

    try {
      const draft = await buildDraftPackage(projectRoot, request);
      reporter.stop(chalk.green(`draft ready: ${draft.script.slug}`));
      savePlan(projectRoot, draft.plan);
      saveScript(projectRoot, draft.script);
      if (asJson) {
        printJson(draft);
        return;
      }

      printLine(`provider: ${draft.providerUsed}${draft.repaired ? " (repaired)" : ""}`);
      draft.script.scenes.forEach((scene) => {
        printLine(`- ${scene.id}: ${scene.narration}`);
      });
      return;
    } catch (error) {
      reporter.fail(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  if (!asJson) {
    printHeader("Running Production Pipeline");
    reporter.start({ step: "draft", message: "Preparing production pipeline" });
  }

  try {
    const result = await runProductionPipeline(projectRoot, request, (progress) => {
      reporter.update(progress);
    });
    reporter.stop();

    if (asJson) {
      printJson(result.report);
      return;
    }

    printLine(chalk.green(`rendered: ${result.renderResult.outputLocation}`));
  } catch (error) {
    reporter.fail(error instanceof Error ? error.message : String(error));
    throw error;
  }
};

const commandRender = async (projectRoot: string, args: ParsedArgs) => {
  const scriptPath = await resolveRenderScriptPath(projectRoot, args);
  const script = loadScript(scriptPath);
  const reporter = createLiveReporter(!getBooleanArg(args, "json", false));

  printHeader("Rendering Saved Script");
  reporter.start({ step: "render", message: "Preparing Remotion render" });
  const renderResult = await renderVideoPackage({
    projectRoot,
    script,
    onProgress: (progress) => {
      reporter.update({
        step: "render",
        message: progress.stage,
        progress: progress.progress,
      });
    },
  });
  reporter.stop();

  const report = RunReportSchema.parse({
    version: 2,
    slug: script.slug,
    mode: script.mode,
    status: "succeeded",
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    outputDir: renderResult.outputLocation,
    issues: [],
    steps: [
      { name: "render", status: "succeeded", message: `Rendered ${renderResult.outputLocation}.` },
    ],
  });
  saveRunReport(projectRoot, report);
  printLine(chalk.green(`rendered: ${renderResult.outputLocation}`));
};

const commandStudio = async (projectRoot: string) => {
  process.chdir(projectRoot);
  await import("./studio-main.mts");
};

const main = async () => {
  const projectRoot = process.cwd();
  const [command = "studio", ...argv] = process.argv.slice(2);
  const args = parseArgs(argv);

  switch (command) {
    case "studio":
      await commandStudio(projectRoot);
      return;
    case "doctor":
      commandDoctor(projectRoot, args);
      return;
    case "assets":
      commandAssets(projectRoot, args);
      return;
    case "init-assets":
      commandInitAssets(projectRoot, args);
      return;
    case "library":
      commandLibrary(projectRoot, args);
      return;
    case "generate":
      await commandGenerate(projectRoot, args);
      return;
    case "render":
      await commandRender(projectRoot, args);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
};

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : inspect(error, { depth: 5, colors: false });
  process.stderr.write(`${chalk.red(message)}\n`);
  process.exitCode = 1;
});
