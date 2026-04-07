import Conf from "conf";

export interface StudioConfig {
  llmProvider: "gemini" | "openrouter";
  llmModel: string;
  defaultVideoType: "kinetic" | "motion" | "slides" | "animation" | "images" | "hybrid";
  defaultFormat: "reel" | "video" | "square";
  defaultDuration: number;
  seriesName: string;
  autoOpenVideo: boolean;
  sarcasmDefault: boolean;
}

const defaultConfig: StudioConfig = {
  llmProvider: "gemini",
  llmModel: "gemini-2.5-pro",
  defaultVideoType: "kinetic",
  defaultFormat: "reel",
  defaultDuration: 30,
  seriesName: "Project Studio Shorts",
  autoOpenVideo: true,
  sarcasmDefault: true,
};

export const config = new Conf<StudioConfig>({
  projectName: "project-studio-v2",
  defaults: defaultConfig,
});

export const updateConfig = (updates: Partial<StudioConfig>) => {
  for (const [key, value] of Object.entries(updates)) {
    config.set(key as keyof StudioConfig, value);
  }
};
