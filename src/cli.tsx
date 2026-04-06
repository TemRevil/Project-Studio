#!/usr/bin/env node
import path from "node:path";
import { inspect } from "node:util";
import chalk from "chalk";
import { buildAssetManifest } from "./core/assets";
import { runDoctor } from "./core/doctor";
import { buildDraftPackage, createRequest } from "./core/generation";
import { runProductionPipeline } from "./core/pipeline";
import { renderVideoPackage } from "./core/rendering";
import { getScriptPath, getVideoLibrary, loadScript, savePlan, saveRunReport, saveScript } from "./core/storage";
import { RunReportSchema, type GenerationRequest } from "./types";

type ParsedArgs = Record<string, string | boolean>;

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

const printJson = (value: unknown) => {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
};

const printHeader = (value: string) => {
  process.stdout.write(`${chalk.cyan.bold(value)}\n`);
};

const printLine = (value: string) => {
  process.stdout.write(`${value}\n`);
};

const buildHeadlessRequest = (projectRoot: string, args: ParsedArgs) => {
  const topic = getStringArg(args, "topic");
  if (!topic) {
    throw new Error("The generate command requires --topic.");
  }

  const dryRun = getBooleanArg(args, "dry-run", false);

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
      operator: {
        dryRun,
        skipAudio: getBooleanArg(args, "skip-audio", dryRun),
        autoApprove: true,
        includeMusic: getBooleanArg(args, "include-music", true),
      },
    },
    projectRoot,
  );
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
  const request = buildHeadlessRequest(projectRoot, args);
  const draftOnly = getBooleanArg(args, "draft-only", false);
  const asJson = getBooleanArg(args, "json", false);

  if (draftOnly) {
    const draft = await buildDraftPackage(projectRoot, request);
    savePlan(projectRoot, draft.plan);
    saveScript(projectRoot, draft.script);
    if (asJson) {
      printJson(draft);
      return;
    }

    printHeader("Draft Created");
    printLine(`slug: ${draft.script.slug}`);
    printLine(`provider: ${draft.providerUsed}${draft.repaired ? " (repaired)" : ""}`);
    draft.script.scenes.forEach((scene) => {
      printLine(`- ${scene.id}: ${scene.narration}`);
    });
    return;
  }

  printHeader("Running Production Pipeline");
  const result = await runProductionPipeline(projectRoot, request, (progress) => {
    if (typeof progress.progress === "number") {
      printLine(`${progress.step}: ${progress.message} ${Math.round(progress.progress * 100)}%`);
      return;
    }

    printLine(`${progress.step}: ${progress.message}`);
  });

  if (asJson) {
    printJson(result.report);
    return;
  }

  printLine(chalk.green(`rendered: ${result.renderResult.outputLocation}`));
};

const commandRender = async (projectRoot: string, args: ParsedArgs) => {
  const explicitScript = getStringArg(args, "from-script");
  const slug = getStringArg(args, "slug");
  const scriptPath = explicitScript
    ? path.resolve(projectRoot, explicitScript)
    : slug
      ? getScriptPath(projectRoot, slug)
      : undefined;

  if (!scriptPath) {
    throw new Error("render requires --slug <slug> or --from-script <path>.");
  }

  const script = loadScript(scriptPath);
  printHeader("Rendering Saved Script");
  const renderResult = await renderVideoPackage({
    projectRoot,
    script,
    onProgress: (progress) => {
      if (typeof progress.progress === "number") {
        printLine(`${progress.stage}: ${Math.round(progress.progress * 100)}%`);
        return;
      }

      printLine(progress.stage);
    },
  });

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
