import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import type { ZodType } from "zod";
import { z } from "zod";
import type { ProjectEnv, StudioConfig } from "./env";
import type { ProviderName } from "../types";
import { ProviderFailure, ValidationFailure } from "./errors";

export interface ProviderDescriptor {
  provider: ProviderName;
  model: string;
}

export interface ProviderStatus extends ProviderDescriptor {
  ready: boolean;
  reason?: string;
}

interface PromptExecutionOptions<T> {
  env: ProjectEnv;
  config: StudioConfig;
  purpose: string;
  prompt: string;
  schema: ZodType<T>;
}

const keyForProvider = (provider: ProviderName, env: ProjectEnv) => {
  switch (provider) {
    case "gemini":
      return env.GOOGLE_AI_STUDIO_API_KEY;
    case "openrouter":
      return env.OPENROUTER_API_KEY;
    default:
      return undefined;
  }
};

const extractJsonDocument = (raw: string) => {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const startCandidates = [trimmed.indexOf("{"), trimmed.indexOf("[")].filter((index) => index >= 0);
  if (startCandidates.length === 0) {
    return trimmed;
  }

  const start = Math.min(...startCandidates);
  const endObject = trimmed.lastIndexOf("}");
  const endArray = trimmed.lastIndexOf("]");
  const end = Math.max(endObject, endArray);

  if (end <= start) {
    return trimmed.slice(start).trim();
  }

  return trimmed.slice(start, end + 1).trim();
};

const formatZodIssues = (error: z.ZodError) =>
  error.issues
    .map((issue) => `- ${issue.path.join(".") || "root"}: ${issue.message}`)
    .join("\n");

const parseStructuredOutput = <T>(schema: ZodType<T>, raw: string) => {
  const jsonText = extractJsonDocument(raw);
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonText);
  } catch (error) {
    throw new ValidationFailure("The provider did not return parseable JSON.", {
      raw,
      jsonText,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const parsed = schema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new ValidationFailure("The provider returned JSON that did not satisfy the schema.", {
      raw,
      jsonText,
      issues: formatZodIssues(parsed.error),
    });
  }

  return parsed.data;
};

const callGemini = async (env: ProjectEnv, model: string, prompt: string) => {
  const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    throw new ProviderFailure("Gemini is selected but GOOGLE_AI_STUDIO_API_KEY is missing.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const instance = client.getGenerativeModel({ model });
  const result = await instance.generateContent(prompt);
  return result.response.text();
};

const callOpenRouter = async (env: ProjectEnv, model: string, prompt: string) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new ProviderFailure("OpenRouter is selected but OPENROUTER_API_KEY is missing.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content ?? "";
};

const callProvider = async (descriptor: ProviderDescriptor, env: ProjectEnv, prompt: string) => {
  switch (descriptor.provider) {
    case "gemini":
      return callGemini(env, descriptor.model, prompt);
    case "openrouter":
      return callOpenRouter(env, descriptor.model, prompt);
    default:
      throw new ProviderFailure(`Unsupported provider: ${descriptor.provider}`);
  }
};

export const resolveProviderStatuses = (env: ProjectEnv, config: StudioConfig): ProviderStatus[] => {
  const ordered: ProviderDescriptor[] = [
    config.providers.primary,
    config.providers.fallback,
  ];

  return ordered.map((provider) => {
    const apiKey = keyForProvider(provider.provider, env);
    return {
      ...provider,
      ready: Boolean(apiKey),
      reason: apiKey ? undefined : `Missing credentials for ${provider.provider}.`,
    };
  });
};

export const resolveProviderChain = (env: ProjectEnv, config: StudioConfig) => {
  const readyProviders = resolveProviderStatuses(env, config).filter((provider) => provider.ready);

  if (readyProviders.length === 0) {
    throw new ProviderFailure("No LLM providers are ready. Configure at least one provider in .env.");
  }

  return readyProviders.map(({ provider, model }) => ({ provider, model }));
};

const buildRepairPrompt = (purpose: string, originalPrompt: string, raw: string, validationError: ValidationFailure) => {
  const details = validationError.details as { issues?: string };
  return [
    `You previously answered for: ${purpose}.`,
    "Return ONLY valid JSON.",
    "Do not explain. Do not wrap in markdown fences.",
    "Fix the response to satisfy the schema and timing rules below.",
    "",
    originalPrompt,
    "",
    "Validation errors:",
    details?.issues ?? validationError.message,
    "",
    "Original output:",
    raw,
  ].join("\n");
};

export const generateStructuredOutput = async <T>({
  env,
  config,
  purpose,
  prompt,
  schema,
}: PromptExecutionOptions<T>) => {
  const chain = resolveProviderChain(env, config);
  const failures: string[] = [];

  for (const provider of chain) {
    try {
      const raw = await callProvider(provider, env, prompt);
      try {
        return {
          value: parseStructuredOutput(schema, raw),
          provider: `${provider.provider}:${provider.model}`,
          repaired: false,
          raw,
        };
      } catch (error) {
        if (!(error instanceof ValidationFailure)) {
          throw error;
        }

        const repairPrompt = buildRepairPrompt(purpose, prompt, raw, error);
        const repairedRaw = await callProvider(provider, env, repairPrompt);
        return {
          value: parseStructuredOutput(schema, repairedRaw),
          provider: `${provider.provider}:${provider.model}`,
          repaired: true,
          raw: repairedRaw,
        };
      }
    } catch (error) {
      failures.push(
        `${provider.provider}:${provider.model} -> ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new ProviderFailure(`All provider attempts failed for ${purpose}.`, failures);
};
