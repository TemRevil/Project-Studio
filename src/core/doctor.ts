import type { GenerationRequest } from "../types";
import { PRODUCTION_VIDEO_TYPES } from "../types";
import { buildAssetManifest, getMissingRequirementsForType } from "./assets";
import { buildRendererCapabilitiesManifest } from "./capabilities";
import { loadEnv, loadStudioConfig } from "./env";
import { resolveProviderStatuses } from "./providers";
import { getConfigPath } from "./env";

export interface DoctorReport {
  projectRoot: string;
  configPath: string;
  seriesName: string;
  productionTypes: string[];
  providers: ReturnType<typeof resolveProviderStatuses>;
  assets: ReturnType<typeof buildAssetManifest>;
  capabilities: ReturnType<typeof buildRendererCapabilitiesManifest>;
  defaultRequest: {
    type: string;
    format: string;
    quality: string;
    includeMusic: boolean;
  };
  voiceReady: boolean;
  productionIssues: Record<string, string[]>;
}

export const runDoctor = (projectRoot: string): DoctorReport => {
  const env = loadEnv();
  const config = loadStudioConfig(projectRoot, env);
  const assets = buildAssetManifest(projectRoot);
  const capabilities = buildRendererCapabilitiesManifest();
  const providers = resolveProviderStatuses(env, config);

  const productionIssues = Object.fromEntries(
    PRODUCTION_VIDEO_TYPES.map((type) => [
      type,
      getMissingRequirementsForType(assets, type).map(
        (requirement) => `${requirement.relativePath} (${requirement.reason})`,
      ),
    ]),
  );

  return {
    projectRoot,
    configPath: getConfigPath(projectRoot),
    seriesName: env.SERIES_NAME,
    productionTypes: [...PRODUCTION_VIDEO_TYPES],
    providers,
    assets,
    capabilities,
    defaultRequest: {
      type: config.defaults.type,
      format: config.defaults.format,
      quality: config.defaults.quality,
      includeMusic: config.defaults.includeMusic,
    },
    voiceReady: Boolean(env.MISTRAL_API_KEY && env.MISTRAL_VOICE_ID),
    productionIssues,
  };
};

export const summarizeDoctorForRequest = (report: DoctorReport, request: GenerationRequest) => {
  const issues = report.productionIssues[request.type] ?? [];
  const providerReady = report.providers.some((provider) => provider.ready);
  return {
    providerReady,
    voiceReady: report.voiceReady,
    issues,
  };
};
