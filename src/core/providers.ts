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

export interface ProviderModelOption extends ProviderDescriptor {
  label: string;
  description: string;
  source: "api" | "fallback";
}

interface PromptExecutionOptions<T> {
  env: ProjectEnv;
  config: StudioConfig;
  purpose: string;
  prompt: string;
  schema: ZodType<T>;
}

interface ModelRule {
  pattern: RegExp;
  label: string;
  reason: string;
  fallbackId: string;
}

const CAPABLE_MODEL_RULES: Record<ProviderName, ModelRule[]> = {
  gemini: [
    {
      pattern: /^gemini-3\.1-pro-preview-customtools$/i,
      label: "Gemini 3.1 Pro Preview Custom Tools",
      reason: "Large-context preview model with strong repo reasoning and tool-oriented planning.",
      fallbackId: "gemini-3.1-pro-preview-customtools",
    },
    {
      pattern: /^gemini-3\.1-pro-preview$/i,
      label: "Gemini 3.1 Pro Preview",
      reason: "Large-context preview model for deep repo understanding and structured output.",
      fallbackId: "gemini-3.1-pro-preview",
    },
    {
      pattern: /^gemini-3-pro-preview$/i,
      label: "Gemini 3 Pro Preview",
      reason: "Strong preview model for complex planning, repair prompts, and longer project context.",
      fallbackId: "gemini-3-pro-preview",
    },
    {
      pattern: /^gemini-pro-latest$/i,
      label: "Gemini Pro Latest",
      reason: "Latest general-purpose Gemini Pro line with long context.",
      fallbackId: "gemini-pro-latest",
    },
    {
      pattern: /^gemini-2\.5-pro$/i,
      label: "Gemini 2.5 Pro",
      reason: "Best stable Gemini option for longer prompts, repairs, and deeper reasoning.",
      fallbackId: "gemini-2.5-pro",
    },
    {
      pattern: /^gemini-3-flash-preview$/i,
      label: "Gemini 3 Flash Preview",
      reason: "Fast preview model with large context for structured drafts.",
      fallbackId: "gemini-3-flash-preview",
    },
    {
      pattern: /^gemini-flash-latest$/i,
      label: "Gemini Flash Latest",
      reason: "Latest fast Gemini text model with long context.",
      fallbackId: "gemini-flash-latest",
    },
    {
      pattern: /^gemini-2\.5-flash$/i,
      label: "Gemini 2.5 Flash",
      reason: "Fast stable Gemini model for structured JSON drafts and planning.",
      fallbackId: "gemini-2.5-flash",
    },
    {
      pattern: /^gemini-2\.0-flash(?:-001)?$/i,
      label: "Gemini 2.0 Flash",
      reason: "Older but still capable long-context fallback.",
      fallbackId: "gemini-2.0-flash",
    },
    {
      pattern: /^gemma-4-31b-it$/i,
      label: "Gemma 4 31B IT",
      reason: "Large instruction-tuned Gemma model with enough context for this project.",
      fallbackId: "gemma-4-31b-it",
    },
    {
      pattern: /^gemma-4-26b-a4b-it$/i,
      label: "Gemma 4 26B A4B IT",
      reason: "Large Gemma model that can handle repo-aware structured generation.",
      fallbackId: "gemma-4-26b-a4b-it",
    },
    {
      pattern: /^gemma-3-27b-it$/i,
      label: "Gemma 3 27B IT",
      reason: "Capable Gemma fallback with larger context than the smaller Gemma 3 variants.",
      fallbackId: "gemma-3-27b-it",
    },
  ],
  openrouter: [
    {
      pattern: /^anthropic\/claude-sonnet-4/i,
      label: "Claude Sonnet 4",
      reason: "Strong repo reasoning, prompt following, and clean structured output.",
      fallbackId: "anthropic/claude-sonnet-4",
    },
    {
      pattern: /^anthropic\/claude-3\.7-sonnet/i,
      label: "Claude 3.7 Sonnet",
      reason: "Reliable long-context reasoning for multi-step video prompts.",
      fallbackId: "anthropic/claude-3.7-sonnet",
    },
    {
      pattern: /^openai\/gpt-5/i,
      label: "GPT-5",
      reason: "Very strong code and structured-generation model when available.",
      fallbackId: "openai/gpt-5",
    },
    {
      pattern: /^openai\/gpt-4\.1/i,
      label: "GPT-4.1",
      reason: "Reliable JSON generation and long-context planning.",
      fallbackId: "openai/gpt-4.1",
    },
    {
      pattern: /^openai\/gpt-4o(?!-mini)/i,
      label: "GPT-4o",
      reason: "Balanced fallback with strong instruction following.",
      fallbackId: "openai/gpt-4o",
    },
    {
      pattern: /^google\/gemini-2\.5-pro/i,
      label: "Gemini 2.5 Pro",
      reason: "Deep reasoning option through OpenRouter.",
      fallbackId: "google/gemini-2.5-pro",
    },
    {
      pattern: /^google\/gemini-2\.5-flash/i,
      label: "Gemini 2.5 Flash",
      reason: "Fast structured-output option through OpenRouter.",
      fallbackId: "google/gemini-2.5-flash",
    },
  ],
};

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

const findModelRule = (provider: ProviderName, model: string) =>
  CAPABLE_MODEL_RULES[provider].find((rule) => rule.pattern.test(model));

const compareModelOptions = (provider: ProviderName, left: string, right: string) => {
  const leftIndex = CAPABLE_MODEL_RULES[provider].findIndex((rule) => rule.pattern.test(left));
  const rightIndex = CAPABLE_MODEL_RULES[provider].findIndex((rule) => rule.pattern.test(right));
  const safeLeft = leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex;
  const safeRight = rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex;

  if (safeLeft !== safeRight) {
    return safeLeft - safeRight;
  }

  return left.localeCompare(right);
};

const buildModelOption = (
  provider: ProviderName,
  model: string,
  source: ProviderModelOption["source"],
  extraDescription?: string,
): ProviderModelOption => {
  const rule = findModelRule(provider, model);
  const details = [rule?.reason, extraDescription].filter(Boolean).join(" ");
  return {
    provider,
    model,
    label: rule ? `${rule.label} - ${model}` : model,
    description: details || "Capable model for Project Studio prompts.",
    source,
  };
};

const dedupeModelOptions = (models: ProviderModelOption[]) => {
  const unique = new Map<string, ProviderModelOption>();
  models.forEach((model) => {
    if (!unique.has(model.model)) {
      unique.set(model.model, model);
    }
  });
  return [...unique.values()];
};

const getFallbackModelOptions = (provider: ProviderName) =>
  CAPABLE_MODEL_RULES[provider].map((rule) =>
    buildModelOption(provider, rule.fallbackId, "fallback"),
  );

const canUseForProjectStudio = (provider: ProviderName, model: string, contextLength?: number) => {
  if (!findModelRule(provider, model)) {
    return false;
  }

  if (provider === "openrouter" && typeof contextLength === "number" && contextLength > 0) {
    return contextLength >= 64000;
  }

  return true;
};

const fetchGeminiModelOptions = async (env: ProjectEnv) => {
  const apiKey = env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    return [];
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) {
    throw new ProviderFailure(`Gemini model list failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    models?: Array<{
      name?: string;
      description?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  return dedupeModelOptions(
    (payload.models ?? [])
      .map((entry) => {
        const rawName = entry.name?.replace(/^models\//, "");
        if (!rawName) {
          return undefined;
        }

        if (!entry.supportedGenerationMethods?.includes("generateContent")) {
          return undefined;
        }

        if (!canUseForProjectStudio("gemini", rawName)) {
          return undefined;
        }

        return buildModelOption("gemini", rawName, "api", entry.description);
      })
      .filter((entry): entry is ProviderModelOption => Boolean(entry)),
  ).sort((left, right) => compareModelOptions("gemini", left.model, right.model));
};

const fetchOpenRouterModelOptions = async (env: ProjectEnv) => {
  const apiKey = env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return [];
  }

  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) {
    throw new ProviderFailure(`OpenRouter model list failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{
      id?: string;
      name?: string;
      description?: string;
      context_length?: number;
    }>;
  };

  return dedupeModelOptions(
    (payload.data ?? [])
      .map((entry) => {
        if (!entry.id) {
          return undefined;
        }

        if (!canUseForProjectStudio("openrouter", entry.id, entry.context_length)) {
          return undefined;
        }

        return buildModelOption(
          "openrouter",
          entry.id,
          "api",
          [entry.name, entry.description].filter(Boolean).join(". "),
        );
      })
      .filter((entry): entry is ProviderModelOption => Boolean(entry)),
  ).sort((left, right) => compareModelOptions("openrouter", left.model, right.model));
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

export const resolveReadyProviders = (env: ProjectEnv, config: StudioConfig) =>
  resolveProviderStatuses(env, config).filter((provider) => provider.ready);

export const listCapableProviderModels = async (provider: ProviderName, env: ProjectEnv): Promise<ProviderModelOption[]> => {
  try {
    const fromApi =
      provider === "gemini"
        ? await fetchGeminiModelOptions(env)
        : await fetchOpenRouterModelOptions(env);

    if (fromApi.length > 0) {
      return fromApi;
    }
  } catch {
    // Fall back to the curated list below when live model discovery fails.
  }

  return getFallbackModelOptions(provider);
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
