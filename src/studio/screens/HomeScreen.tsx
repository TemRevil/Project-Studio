import React from "react";
import { Box, Text } from "ink";
import SelectInput from "ink-select-input";
import { Header } from "../components/Header";
import type { DoctorReport } from "../../core/doctor";

interface HomeScreenProps {
  doctor: DoctorReport | null;
  videoCount: number;
  onNavigate: (screen: string) => void;
  onExit: () => void;
  onRefresh: () => void;
}

export const HomeScreen = ({ doctor, videoCount, onNavigate, onExit, onRefresh }: HomeScreenProps) => {
  const items = [
    { label: "Generate Draft", value: "generate" },
    { label: "Settings", value: "settings" },
    { label: "Doctor", value: "doctor" },
    { label: "Assets", value: "assets" },
    { label: "Library", value: "library" },
    { label: "Help", value: "help" },
    { label: "Refresh", value: "refresh" },
    { label: "Exit", value: "exit" },
  ];

  return (
    <>
      <Header />
      <Box marginTop={1} flexDirection="column">
        <Text color="cyan">Interactive studio for Project Studio's production pipeline.</Text>
        <Box marginTop={1} flexDirection="column" paddingX={1}>
          <Text>Production-ready types: {doctor?.productionTypes.join(", ") ?? "Loading..."}</Text>
          <Text>Providers ready: {doctor?.providers.filter((p) => p.ready).length ?? 0}</Text>
          <Text>Voice ready: {doctor?.voiceReady ? "yes" : "no"}</Text>
          <Text>Videos in library: {videoCount}</Text>
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
