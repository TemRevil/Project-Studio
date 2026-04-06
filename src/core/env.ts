import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { ProviderName, QualityMode, VideoFormat, VideoType } from "../types";
import { PROVIDERS, QUALITY_MODES, VIDEO_FORMATS, VIDEO_TYPES } from "../types";
import { ValidationFailure } from "./errors";

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }, schema.optional());

export const EnvSchema = z.object({
  GOOGLE_AI_STUDIO_API_KEY: emptyToUndefined(z.string()),
  OPENROUTER_API_KEY: emptyToUndefined(z.string()),
  PRIMARY_LLM_PROVIDER: z.enum(PROVIDERS).default("gemini"),
  PRIMARY_LLM_MODEL: z.string().default("gemini-2.5-flash"),
  FALLBACK_LLM_PROVIDER: z.enum(PROVIDERS).default("openrouter"),
  FALLBACK_LLM_MODEL: z.string().default("openai/gpt-4o-mini"),
  MISTRAL_API_KEY: emptyToUndefined(z.string()),
  MISTRAL_VOICE_ID: emptyToUndefined(z.string()),
  SERIES_NAME: z.string().default("Project Studio"),
  DEFAULT_VIDEO_TYPE: z.enum(VIDEO_TYPES).default("kinetic"),
  DEFAULT_VIDEO_FORMAT: z.enum(VIDEO_FORMATS).default("reel"),
  DEFAULT_QUALITY: z.enum(QUALITY_MODES).default("production"),
});

export const StudioConfigSchema = z.object({
  version: z.literal(1),
  defaults: z.object({
    type: z.enum(VIDEO_TYPES).default("kinetic"),
    format: z.enum(VIDEO_FORMATS).default("reel"),
    durationSeconds: z.number().int().positive().max(90).default(30),
    quality: z.enum(QUALITY_MODES).default("production"),
    includeMusic: z.boolean().default(true),
  }),
  providers: z.object({
    primary: z.object({
      provider: z.enum(PROVIDERS),
      model: z.string().min(1),
    }),
    fallback: z.object({
      provider: z.enum(PROVIDERS),
      model: z.string().min(1),
    }),
  }),
});

export type ProjectEnv = z.infer<typeof EnvSchema>;
export type StudioConfig = z.infer<typeof StudioConfigSchema>;

export const getConfigDir = (projectRoot: string) => path.join(projectRoot, ".project-studio");
export const getConfigPath = (projectRoot: string) => path.join(getConfigDir(projectRoot), "config.json");

export const loadEnv = (): ProjectEnv => {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    throw new ValidationFailure("Environment variables are invalid.", parsed.error.flatten());
  }

  return parsed.data;
};

export const buildDefaultConfig = (env: ProjectEnv): StudioConfig => ({
  version: 1,
  defaults: {
    type: env.DEFAULT_VIDEO_TYPE,
    format: env.DEFAULT_VIDEO_FORMAT,
    durationSeconds: 30,
    quality: env.DEFAULT_QUALITY,
    includeMusic: true,
  },
  providers: {
    primary: {
      provider: env.PRIMARY_LLM_PROVIDER,
      model: env.PRIMARY_LLM_MODEL,
    },
    fallback: {
      provider: env.FALLBACK_LLM_PROVIDER,
      model: env.FALLBACK_LLM_MODEL,
    },
  },
});

export const loadStudioConfig = (projectRoot: string, env: ProjectEnv): StudioConfig => {
  const configPath = getConfigPath(projectRoot);

  if (!fs.existsSync(configPath)) {
    return buildDefaultConfig(env);
  }

  const raw = fs.readFileSync(configPath, "utf8");
  const json = JSON.parse(raw) as unknown;
  const parsed = StudioConfigSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationFailure(`Studio config at ${configPath} is invalid.`, parsed.error.flatten());
  }

  return parsed.data;
};

export const saveStudioConfig = (projectRoot: string, config: StudioConfig) => {
  const configDir = getConfigDir(projectRoot);
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(getConfigPath(projectRoot), `${JSON.stringify(config, null, 2)}\n`, "utf8");
};

export const resolveDefaultVideoType = (config: StudioConfig): VideoType => config.defaults.type as VideoType;
export const resolveDefaultVideoFormat = (config: StudioConfig): VideoFormat => config.defaults.format as VideoFormat;
export const resolveDefaultQuality = (config: StudioConfig): QualityMode => config.defaults.quality as QualityMode;
export const resolvePrimaryProvider = (config: StudioConfig): ProviderName => config.providers.primary.provider as ProviderName;
export const resolveFallbackProvider = (config: StudioConfig): ProviderName => config.providers.fallback.provider as ProviderName;
