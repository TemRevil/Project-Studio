import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import type { DoctorReport } from "../../core/doctor";
import { config } from "../config";
import { Header } from "../components/Header";
import { PALETTE_PRESETS, VIDEO_STYLES } from "../presets";

interface HomeScreenProps {
  doctor: DoctorReport | null;
  videoCount: number;
  onNavigate: (screen: string) => void;
  onExit: () => void;
  onRefresh: () => void;
}

export const HomeScreen = ({ doctor, videoCount, onNavigate, onExit, onRefresh }: HomeScreenProps) => {
  const items = [
    { label: "Generate", value: "generate" },
    { label: "Settings", value: "settings" },
    { label: "Doctor", value: "doctor" },
    { label: "Assets", value: "assets" },
    { label: "Library", value: "library" },
    { label: "Help", value: "help" },
    { label: "Refresh", value: "refresh" },
    { label: "Exit", value: "exit" },
  ];

  const palette = PALETTE_PRESETS[config.store.colorPalette] ?? config.store.customPalette;
  const style = VIDEO_STYLES[config.store.defaultVideoStyle] ?? VIDEO_STYLES["kinetic-fast"];
  const readyProviders = doctor?.providers.filter((provider) => provider.ready).length ?? 0;

  return (
    <>
      <Header />
      <Box flexDirection="column">
        <Text color="cyan">A friendlier terminal cockpit for creating, tuning, and rendering short-form videos.</Text>
        <Box marginTop={1} gap={2}>
          <Box borderStyle="round" borderColor="cyan" paddingX={1} flexDirection="column" width={40}>
            <Text bold color="cyan">Workspace Health</Text>
            <Text>Production types: {doctor?.productionTypes.join(", ") ?? "Loading..."}</Text>
            <Text>Providers ready: {readyProviders}</Text>
            <Text>Voice ready: {doctor?.voiceReady ? "yes" : "no"}</Text>
            <Text>Videos in library: {videoCount}</Text>
          </Box>
          <Box borderStyle="round" borderColor="yellow" paddingX={1} flexDirection="column" width={44}>
            <Text bold color="yellow">Creative Defaults</Text>
            <Text>Style: {style.name}</Text>
            <Text>Format: {config.store.defaultFormat}</Text>
            <Text>Quality: {config.store.defaultQuality}</Text>
            <Text>Palette: {palette.name}</Text>
            <Text dimColor>
              Accent {palette.accentColor} | Text {palette.primaryText}
            </Text>
          </Box>
        </Box>
      </Box>
      <Box marginTop={1}>
        <SelectInput
          items={items}
          onSelect={(item) => {
            switch (item.value) {
              case "refresh":
                onRefresh();
                break;
              case "exit":
                onExit();
                break;
              default:
                onNavigate(item.value);
            }
          }}
        />
      </Box>
    </>
  );
};
