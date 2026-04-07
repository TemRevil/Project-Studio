import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Header, Footer } from "../components/Header";
import { config, updateConfig, type StudioConfig } from "../config";

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen = ({ onBack }: SettingsScreenProps) => {
  const [currentConfig, setCurrentConfig] = React.useState<StudioConfig>(config.store);
  const [editing, setEditing] = React.useState<keyof StudioConfig | null>(null);

  const getMenuItems = () => {
    return [
      { label: `LLM Provider: ${currentConfig.llmProvider}`, value: "llmProvider" },
      { label: `LLM Model: ${currentConfig.llmModel}`, value: "llmModel" },
      { label: `Default Type: ${currentConfig.defaultVideoType}`, value: "defaultVideoType" },
      { label: `Default Format: ${currentConfig.defaultFormat}`, value: "defaultFormat" },
      { label: `Default Duration: ${currentConfig.defaultDuration}s`, value: "defaultDuration" },
      { label: `Auto-open Video: ${currentConfig.autoOpenVideo ? "Yes" : "No"}`, value: "autoOpenVideo" },
      { label: `Sarcasm Default: ${currentConfig.sarcasmDefault ? "Yes" : "No"}`, value: "sarcasmDefault" },
      { label: "Back to Home", value: "back" },
    ];
  };

  const handleSelect = (value: string) => {
    if (value === "back") {
      onBack();
      return;
    }
    setEditing(value as keyof StudioConfig);
  };

  const handleUpdate = (key: keyof StudioConfig, val: string | number | boolean) => {
    updateConfig({ [key]: val } as any);
    setCurrentConfig(config.store);
    setEditing(null);
  };

  if (editing === "llmProvider") {
    return (
      <>
        <Header />
        <Text color="cyan">Select LLM Provider</Text>
        <SelectInput
          items={[
            { label: "Gemini", value: "gemini" },
            { label: "OpenRouter", value: "openrouter" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => item.value === "cancel" ? setEditing(null) : handleUpdate("llmProvider", item.value)}
        />
      </>
    );
  }

  if (editing === "defaultVideoType") {
    return (
      <>
        <Header />
        <Text color="cyan">Select Default Video Type</Text>
        <SelectInput
          items={[
            { label: "Kinetic", value: "kinetic" },
            { label: "Motion", value: "motion" },
            { label: "Slides", value: "slides" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => item.value === "cancel" ? setEditing(null) : handleUpdate("defaultVideoType", item.value)}
        />
      </>
    );
  }

  if (editing === "defaultFormat") {
    return (
      <>
        <Header />
        <Text color="cyan">Select Default Format</Text>
        <SelectInput
          items={[
            { label: "Reel", value: "reel" },
            { label: "Video", value: "video" },
            { label: "Square", value: "square" },
            { label: "Cancel", value: "cancel" },
          ]}
          onSelect={(item) => item.value === "cancel" ? setEditing(null) : handleUpdate("defaultFormat", item.value)}
        />
      </>
    );
  }

  if (editing === "defaultDuration") {
    return (
      <>
        <Header />
        <Text color="cyan">Select Default Duration</Text>
        <SelectInput
          items={[
            { label: "30s", value: 30 },
            { label: "60s", value: 60 },
            { label: "90s", value: 90 },
            { label: "Cancel", value: -1 },
          ]}
          onSelect={(item) => item.value === -1 ? setEditing(null) : handleUpdate("defaultDuration", item.value)}
        />
      </>
    );
  }

  if (editing === "autoOpenVideo" || editing === "sarcasmDefault") {
    return (
      <>
        <Header />
        <Text color="cyan">Set {editing}</Text>
        <SelectInput
          items={[
            { label: "Yes", value: 1 },
            { label: "No", value: 0 },
            { label: "Cancel", value: -1 },
          ]}
          onSelect={(item) => item.value === -1 ? setEditing(null) : handleUpdate(editing, item.value === 1)}
        />
      </>
    );
  }

  return (
    <>
      <Header />
      <Text color="cyan" bold>Settings</Text>
      <Box marginTop={1}>
        <SelectInput items={getMenuItems()} onSelect={(item) => handleSelect(item.value)} />
      </Box>
      <Footer hint="Config is persisted in ~/.config/project-studio-v2/" />
    </>
  );
};
