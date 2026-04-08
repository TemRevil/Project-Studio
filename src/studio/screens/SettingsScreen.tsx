import React from "react";
import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";
import TextInput from "ink-text-input";
import { loadEnv, loadStudioConfig, saveStudioConfig, type ProjectEnv, type StudioConfig as ProjectStudioConfig } from "../../core/env";
import { listCapableProviderModels, resolveReadyProviders, type ProviderModelOption } from "../../core/providers";
import { Header, Footer } from "../components/Header";
import { AnimatedDots, Spinner } from "../components/StatusWidgets";
import {
  CUSTOM_PALETTE_FIELDS,
  config,
  isHexColor,
  updateConfig,
  updateCustomPalette,
  type CustomPaletteField,
  type StudioConfig,
} from "../config";
import { PALETTE_PRESETS, VIDEO_STYLES } from "../presets";

interface SettingsScreenProps {
  onBack: () => void;
  projectRoot: string;
}

type SettingsEditor =
  | null
  | "llmProvider"
  | "llmModel"
  | "defaultVideoType"
  | "defaultFormat"
  | "defaultDuration"
  | "defaultQuality"
  | "defaultVideoStyle"
  | "seriesName"
  | "autoOpenVideo"
  | "sarcasmDefault"
  | "includeMusicDefault"
  | "skipAudioDefault"
  | "colorPalette"
  | "customPaletteMenu"
  | `custom:${CustomPaletteField}`;

type SettingsSection = "main" | "video" | "colors" | "models" | "behavior";

const COLOR_LABELS: Record<CustomPaletteField, string> = {
  mainBackground: "Background color",
  primaryText: "Text color",
  accentColor: "Primary accent color",
  emphasisColor: "Emphasis color",
  surfaceColor: "Surface color",
  secondaryColor: "Secondary color",
};

const makeBooleanItems = (enabledLabel: string, disabledLabel: string) => [
  { label: enabledLabel, value: "true" },
  { label: disabledLabel, value: "false" },
  { label: "Cancel", value: "cancel" },
];

export const SettingsScreen = ({ onBack, projectRoot }: SettingsScreenProps) => {
  const [currentConfig, setCurrentConfig] = React.useState<StudioConfig>(config.store);
  const [section, setSection] = React.useState<SettingsSection>("main");
  const [editing, setEditing] = React.useState<SettingsEditor>(null);
  const [textValue, setTextValue] = React.useState("");
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const [projectEnv, setProjectEnv] = React.useState<ProjectEnv | null>(null);
  const [projectConfig, setProjectConfig] = React.useState<ProjectStudioConfig | null>(null);
  const [readyProviders, setReadyProviders] = React.useState<ReturnType<typeof resolveReadyProviders>>([]);
  const [modelOptions, setModelOptions] = React.useState<ProviderModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = React.useState(false);
  const [modelsError, setModelsError] = React.useState<string | null>(null);

  const syncConfig = React.useCallback(() => {
    setCurrentConfig(config.store);
  }, []);

  const syncProjectProviderIntoStudioConfig = React.useCallback((provider: StudioConfig["llmProvider"], model: string) => {
    updateConfig({
      llmProvider: provider,
      llmModel: model,
    });
    setCurrentConfig(config.store);
  }, []);

  const persistPrimaryProvider = React.useCallback((provider: StudioConfig["llmProvider"], model: string) => {
    if (!projectEnv || !projectConfig) {
      return;
    }

    const nextProjectConfig: ProjectStudioConfig = {
      ...projectConfig,
      providers: {
        ...projectConfig.providers,
        primary: {
          provider,
          model,
        },
      },
    };

    saveStudioConfig(projectRoot, nextProjectConfig);
    setProjectConfig(nextProjectConfig);
    setReadyProviders(resolveReadyProviders(projectEnv, nextProjectConfig));
    syncProjectProviderIntoStudioConfig(provider, model);
  }, [projectConfig, projectEnv, projectRoot, syncProjectProviderIntoStudioConfig]);

  const loadModelOptions = React.useCallback(async (provider: StudioConfig["llmProvider"]) => {
    if (!projectEnv) {
      setModelsError("Environment is not ready yet.");
      return [] as ProviderModelOption[];
    }

    setModelsLoading(true);
    setModelsError(null);
    try {
      const nextModels = await listCapableProviderModels(provider, projectEnv);
      setModelOptions(nextModels);
      if (nextModels.length === 0) {
        setModelsError("No capable models were found for this provider.");
      }
      return nextModels;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setModelsError(message);
      setModelOptions([]);
      return [] as ProviderModelOption[];
    } finally {
      setModelsLoading(false);
    }
  }, [projectEnv]);

  React.useEffect(() => {
    try {
      const env = loadEnv();
      const loadedProjectConfig = loadStudioConfig(projectRoot, env);
      setProjectEnv(env);
      setProjectConfig(loadedProjectConfig);
      setReadyProviders(resolveReadyProviders(env, loadedProjectConfig));
      syncProjectProviderIntoStudioConfig(
        loadedProjectConfig.providers.primary.provider,
        loadedProjectConfig.providers.primary.model,
      );
    } catch (error) {
      setModelsError(error instanceof Error ? error.message : String(error));
    }
  }, [projectRoot, syncProjectProviderIntoStudioConfig]);

  React.useEffect(() => {
    if (editing !== "llmModel") {
      return;
    }

    void loadModelOptions(currentConfig.llmProvider);
  }, [currentConfig.llmProvider, editing, loadModelOptions]);

  const closeEditor = React.useCallback(() => {
    setEditing(null);
    setTextValue("");
    setValidationError(null);
    setModelsError(null);
  }, []);

  const goBack = React.useCallback(() => {
    if (editing === null) {
      if (section !== "main") {
        setSection("main");
        return;
      }

      onBack();
      return;
    }

    if (editing === "customPaletteMenu" || editing.startsWith("custom:")) {
      setEditing(editing.startsWith("custom:") ? "customPaletteMenu" : null);
      setValidationError(null);
      return;
    }

    closeEditor();
  }, [closeEditor, editing, onBack, section]);

  useInput((input, key) => {
    if (key.escape) {
      goBack();
      return;
    }

    if (input.toLowerCase() === "q" && editing === null) {
      onBack();
    }
  });

  const handleConfigUpdate = (updates: Partial<StudioConfig>) => {
    updateConfig(updates);
    syncConfig();
    closeEditor();
  };

  const beginTextEdit = (nextEditor: SettingsEditor, initialValue: string) => {
    setEditing(nextEditor);
    setTextValue(initialValue);
    setValidationError(null);
  };

  const handleTextSubmit = () => {
    if (editing === "seriesName") {
      if (!textValue.trim()) {
        setValidationError("Series name cannot be empty.");
        return;
      }

      handleConfigUpdate({ seriesName: textValue.trim() });
      return;
    }

    if (!editing?.startsWith("custom:")) {
      return;
    }

    if (!isHexColor(textValue)) {
      setValidationError("Use a 6-digit hex value like #16425B.");
      return;
    }

    const field = editing.replace("custom:", "") as CustomPaletteField;
    updateCustomPalette(field, textValue);
    syncConfig();
    setEditing("customPaletteMenu");
    setValidationError(null);
  };

  const getSectionItems = () => {
    const paletteName = PALETTE_PRESETS[currentConfig.colorPalette]?.name ?? currentConfig.customPalette.name;
    const styleName = VIDEO_STYLES[currentConfig.defaultVideoStyle]?.name ?? currentConfig.defaultVideoStyle;

    if (section === "main") {
      return [
        { label: "Video", value: "video" },
        { label: "Colors", value: "colors" },
        { label: "Models", value: "models" },
        { label: "Behavior", value: "behavior" },
        { label: "Back to Home", value: "back" },
      ];
    }

    if (section === "video") {
      return [
        { label: `Default style: ${styleName}`, value: "defaultVideoStyle" },
        { label: `Default type: ${currentConfig.defaultVideoType}`, value: "defaultVideoType" },
        { label: `Default format: ${currentConfig.defaultFormat}`, value: "defaultFormat" },
        { label: `Default duration: ${currentConfig.defaultDuration}s`, value: "defaultDuration" },
        { label: `Default quality: ${currentConfig.defaultQuality}`, value: "defaultQuality" },
        { label: `Series name: ${currentConfig.seriesName}`, value: "seriesName" },
        { label: "Back to Settings", value: "back" },
      ];
    }

    if (section === "colors") {
      return [
        { label: `Palette preset: ${paletteName}`, value: "colorPalette" },
        { label: "Custom colors", value: "customPaletteMenu" },
        { label: "Back to Settings", value: "back" },
      ];
    }

    if (section === "models") {
      return [
        { label: `LLM provider: ${currentConfig.llmProvider}`, value: "llmProvider" },
        { label: `LLM model: ${currentConfig.llmModel}`, value: "llmModel" },
        { label: "Back to Settings", value: "back" },
      ];
    }

    return [
      { label: `Music default: ${currentConfig.includeMusicDefault ? "on" : "off"}`, value: "includeMusicDefault" },
      { label: `Skip audio default: ${currentConfig.skipAudioDefault ? "yes" : "no"}`, value: "skipAudioDefault" },
      { label: `Sarcasm default: ${currentConfig.sarcasmDefault ? "on" : "off"}`, value: "sarcasmDefault" },
      { label: `Auto-open render: ${currentConfig.autoOpenVideo ? "yes" : "no"}`, value: "autoOpenVideo" },
      { label: "Back to Settings", value: "back" },
    ];
  };

  if (editing === "llmProvider") {
    const providerItems = readyProviders.map((provider) => ({
      label: `${provider.provider === "gemini" ? "Gemini" : "OpenRouter"} - ${provider.model}`,
      value: provider.provider,
    }));

    return (
      <>
        <Header />
        <Text color="cyan" bold>Select LLM Provider</Text>
        <Text dimColor>Only providers with working API credentials are shown here.</Text>
        {readyProviders.length === 0 ? <Text color="yellow">No ready providers were found in the current environment.</Text> : null}
        <SelectInput
          items={[
            ...providerItems,
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => {
            if (item.value === "cancel") {
              closeEditor();
              return;
            }

            const nextProvider = item.value as StudioConfig["llmProvider"];
            void (async () => {
              const nextModels = await loadModelOptions(nextProvider);
              const selectedModel = nextModels[0]?.model;
              if (!selectedModel) {
                setModelsError("No capable models are available for this provider.");
                return;
              }

              persistPrimaryProvider(nextProvider, selectedModel);
              setEditing("llmModel");
            })();
          }}
        />
        <Footer onBack={goBack} hint="Selecting a provider updates the primary project model config." />
      </>
    );
  }

  if (editing === "llmModel") {
    const loadedFromApi = modelOptions.some((model) => model.source === "api");

    return (
      <>
        <Header />
        <Text color="cyan" bold>Select LLM Model</Text>
        <Text dimColor>
          Provider: {currentConfig.llmProvider} {loadedFromApi ? "(loaded from API)" : "(using curated capable list)"}
        </Text>
        {modelsLoading ? <AnimatedDots label="Loading capable models" color="yellow" /> : null}
        {!modelsLoading && modelOptions.length > 0 ? (
          <SelectInput
            items={[
              ...modelOptions.map((model) => ({
                label: `${model.label} - ${model.description}`,
                value: model.model,
              })),
              { label: "Cancel", value: "cancel" },
            ]}
            onSelect={(item) => {
              if (item.value === "cancel") {
                closeEditor();
                return;
              }

              persistPrimaryProvider(currentConfig.llmProvider, item.value);
              closeEditor();
            }}
          />
        ) : null}
        {!modelsLoading && modelOptions.length === 0 ? (
          <Box marginTop={1} flexDirection="column">
            {modelsError ? <Text color="redBright">{modelsError}</Text> : <Text color="yellow">No capable models found.</Text>}
            <Spinner label="Pick another provider or check credentials" color="yellow" />
          </Box>
        ) : null}
        <Footer onBack={goBack} hint="The menu is filtered to models strong enough for long prompts and structured video drafts." />
      </>
    );
  }

  if (editing === "defaultVideoType") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Default Video Type</Text>
        <SelectInput
          items={[
            { label: "Kinetic", value: "kinetic" },
            { label: "Motion", value: "motion" },
            { label: "Slides", value: "slides" },
            { label: "Animation", value: "animation" },
            { label: "Images", value: "images" },
            { label: "Hybrid", value: "hybrid" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ defaultVideoType: item.value as StudioConfig["defaultVideoType"] }))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "defaultFormat") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Default Format</Text>
        <SelectInput
          items={[
            { label: "Reel (9:16)", value: "reel" },
            { label: "Video (16:9)", value: "video" },
            { label: "Square (1:1)", value: "square" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ defaultFormat: item.value as StudioConfig["defaultFormat"] }))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "defaultDuration") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Default Duration</Text>
        <SelectInput
          items={[
            { label: "15 seconds", value: "15" },
            { label: "30 seconds", value: "30" },
            { label: "45 seconds", value: "45" },
            { label: "60 seconds", value: "60" },
            { label: "90 seconds", value: "90" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ defaultDuration: Number(item.value) }))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "defaultQuality") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Default Quality</Text>
        <SelectInput
          items={[
            { label: "Production", value: "production" },
            { label: "Balanced", value: "balanced" },
            { label: "Fast", value: "fast" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ defaultQuality: item.value as StudioConfig["defaultQuality"] }))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "defaultVideoStyle") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Default Video Style</Text>
        <SelectInput
          items={[
            ...Object.entries(VIDEO_STYLES).map(([key, style]) => ({
              label: `${style.name} - ${style.description}`,
              value: key,
            })),
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ defaultVideoStyle: item.value }))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "autoOpenVideo" || editing === "sarcasmDefault" || editing === "includeMusicDefault" || editing === "skipAudioDefault") {
    const labels: Record<typeof editing, [string, string]> = {
      autoOpenVideo: ["Open rendered videos automatically", "Keep rendered videos closed"],
      sarcasmDefault: ["Sarcasm on by default", "Sarcasm off by default"],
      includeMusicDefault: ["Include background music by default", "Disable background music by default"],
      skipAudioDefault: ["Skip narration audio by default", "Generate narration audio by default"],
    };

    return (
      <>
        <Header />
        <Text color="cyan" bold>Choose Default Behavior</Text>
        <SelectInput
          items={makeBooleanItems(labels[editing][0], labels[editing][1])}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ [editing]: item.value === "true" } as Partial<StudioConfig>))}
        />
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "colorPalette") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Select Color Palette</Text>
        <SelectInput
          items={[
            ...Object.entries(PALETTE_PRESETS).map(([key, palette]) => ({
              label: `${palette.name} - bg ${palette.mainBackground}, accent ${palette.accentColor}`,
              value: key,
            })),
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => (item.value === "cancel" ? closeEditor() : handleConfigUpdate({ colorPalette: item.value }))}
        />
        <Footer onBack={goBack} hint="Choose Custom Palette to use the per-color values below." />
      </>
    );
  }

  if (editing === "customPaletteMenu") {
    return (
      <>
        <Header />
        <Text color="cyan" bold>Custom Palette</Text>
        <Text dimColor>Editing any value below switches the active palette to Custom Palette.</Text>
        <Box marginTop={1} flexDirection="column">
          <Text>Background: {currentConfig.customPalette.mainBackground}</Text>
          <Text>Text: {currentConfig.customPalette.primaryText}</Text>
          <Text>Primary accent: {currentConfig.customPalette.accentColor}</Text>
          <Text>Emphasis: {currentConfig.customPalette.emphasisColor}</Text>
          <Text>Surface: {currentConfig.customPalette.surfaceColor}</Text>
          <Text>Secondary: {currentConfig.customPalette.secondaryColor}</Text>
        </Box>
        <Box marginTop={1}>
          <SelectInput
            items={[
              ...CUSTOM_PALETTE_FIELDS.map((field) => ({
                label: `${COLOR_LABELS[field]}: ${currentConfig.customPalette[field]}`,
                value: `custom:${field}`,
              })),
              { label: "Back to Settings", value: "cancel" },
            ]}
            onSelect={(item) => {
              const value = String(item.value);

              if (value === "cancel") {
                closeEditor();
                return;
              }

              const field = value.replace("custom:", "") as CustomPaletteField;
              beginTextEdit(value as SettingsEditor, currentConfig.customPalette[field]);
            }}
          />
        </Box>
        <Footer onBack={goBack} />
      </>
    );
  }

  if (editing === "seriesName" || editing?.startsWith("custom:")) {
    const title =
      editing === "seriesName"
        ? "Edit Series Name"
        : `Edit ${COLOR_LABELS[editing.replace("custom:", "") as CustomPaletteField]}`;

    return (
      <>
        <Header />
        <Text color="cyan" bold>{title}</Text>
        {editing?.startsWith("custom:") ? <Text dimColor>Enter a hex color like #16425B.</Text> : null}
        <Box marginTop={1}>
          <TextInput value={textValue} onChange={setTextValue} onSubmit={handleTextSubmit} />
        </Box>
        {validationError ? <Text color="redBright">{validationError}</Text> : null}
        <Footer onBack={goBack} hint="Press Enter to save." />
      </>
    );
  }

  const palettePreview = PALETTE_PRESETS[currentConfig.colorPalette] ?? currentConfig.customPalette;
  const sectionTitle = section === "main" ? "Settings" : `Settings / ${section[0].toUpperCase()}${section.slice(1)}`;
  const styleName = VIDEO_STYLES[currentConfig.defaultVideoStyle]?.name ?? currentConfig.defaultVideoStyle;

  return (
    <>
      <Header />
      <Text color="cyan" bold>{sectionTitle}</Text>
      {section === "main" ? (
        <Box marginTop={1} flexDirection="column">
          <Box gap={2}>
            <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column" width={36}>
              <Text bold color="cyan">Video</Text>
              <Text>Style: {styleName}</Text>
              <Text>Format: {currentConfig.defaultFormat}</Text>
              <Text>Quality: {currentConfig.defaultQuality}</Text>
            </Box>
            <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column" width={36}>
              <Text bold color="yellow">Colors</Text>
              <Text>Palette: {palettePreview.name}</Text>
              <Text>Background: {palettePreview.mainBackground}</Text>
              <Text>Accent: {palettePreview.accentColor}</Text>
            </Box>
          </Box>
          <Box marginTop={1} gap={2}>
            <Box borderStyle="round" borderColor="green" paddingX={1} flexDirection="column" width={36}>
              <Text bold color="green">Models</Text>
              <Text>Provider: {currentConfig.llmProvider}</Text>
              <Text>Model: {currentConfig.llmModel}</Text>
              <Text>Ready providers: {readyProviders.length}</Text>
            </Box>
            <Box borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column" width={36}>
              <Text bold color="magenta">Behavior</Text>
              <Text>Music: {currentConfig.includeMusicDefault ? "on" : "off"}</Text>
              <Text>Skip audio: {currentConfig.skipAudioDefault ? "yes" : "no"}</Text>
              <Text>Auto-open: {currentConfig.autoOpenVideo ? "yes" : "no"}</Text>
            </Box>
          </Box>
        </Box>
      ) : null}
      {section === "video" ? (
        <Box marginTop={1} borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column">
          <Text>Style: {styleName}</Text>
          <Text>Type: {currentConfig.defaultVideoType}</Text>
          <Text>Format: {currentConfig.defaultFormat}</Text>
          <Text>Duration: {currentConfig.defaultDuration}s</Text>
          <Text>Quality: {currentConfig.defaultQuality}</Text>
          <Text>Series: {currentConfig.seriesName}</Text>
        </Box>
      ) : null}
      {section === "colors" ? (
        <Box marginTop={1} borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column">
          <Text bold color="yellow">Palette Preview</Text>
          <Text>Preset: {palettePreview.name}</Text>
          <Text>Background {palettePreview.mainBackground} | Text {palettePreview.primaryText}</Text>
          <Text>Accent {palettePreview.accentColor} | Emphasis {palettePreview.emphasisColor}</Text>
          <Text>Surface {palettePreview.surfaceColor} | Secondary {palettePreview.secondaryColor}</Text>
        </Box>
      ) : null}
      {section === "models" ? (
        <Box marginTop={1} borderStyle="round" borderColor="green" paddingX={1} flexDirection="column">
          <Text>Primary provider: {currentConfig.llmProvider}</Text>
          <Text>Primary model: {currentConfig.llmModel}</Text>
          <Text>Ready APIs: {readyProviders.length === 0 ? "none" : readyProviders.map((provider) => provider.provider).join(", ")}</Text>
          {modelsError ? <Text color="yellow">{modelsError}</Text> : null}
        </Box>
      ) : null}
      {section === "behavior" ? (
        <Box marginTop={1} borderStyle="round" borderColor="magenta" paddingX={1} flexDirection="column">
          <Text>Background music: {currentConfig.includeMusicDefault ? "on" : "off"}</Text>
          <Text>Skip audio: {currentConfig.skipAudioDefault ? "yes" : "no"}</Text>
          <Text>Sarcasm default: {currentConfig.sarcasmDefault ? "on" : "off"}</Text>
          <Text>Auto-open render: {currentConfig.autoOpenVideo ? "yes" : "no"}</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <SelectInput
          items={getSectionItems()}
          onSelect={(item) => {
            if (item.value === "back") {
              if (section === "main") {
                onBack();
                return;
              }

              setSection("main");
              return;
            }

            if (section === "main") {
              setSection(item.value as SettingsSection);
              return;
            }

            setEditing(item.value as SettingsEditor);
            setValidationError(null);
          }}
        />
      </Box>
      <Footer
        onBack={section === "main" ? onBack : () => setSection("main")}
        hint={`CLI settings live in ${config.path}. Provider/model changes also update ${projectRoot}\\.project-studio\\config.json`}
      />
    </>
  );
};
