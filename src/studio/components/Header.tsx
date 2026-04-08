import React from "react";
import { Box, Text } from "ink";
import boxen from "boxen";
import gradient from "gradient-string";

const PS_LOGO = [
  "PROJECT STUDIO",
  "Interactive AI video pipeline cockpit",
  "Draft, sync, render, and tune the visual system from one CLI.",
].join("\n");

export const Header = () => {
  const styled = boxen(gradient(["#60a5fa", "#f59e0b", "#fb7185"]).multiline(PS_LOGO), {
    padding: { top: 0, bottom: 0, left: 2, right: 3 },
    borderColor: "yellow",
    borderStyle: "round",
  });

  return (
    <Box marginBottom={1}>
      <Text>{styled}</Text>
    </Box>
  );
};

export const Footer = ({ onBack, hint }: { onBack?: () => void; hint?: string }) => (
  <Box marginTop={1} flexDirection="column">
    {hint ? <Text color="gray" italic>{hint}</Text> : null}
    {onBack ? (
      <Text color="dim">Arrow keys move. Enter selects. Esc goes back. Ctrl+C exits.</Text>
    ) : (
      <Text color="dim">Arrow keys move. Enter selects. Ctrl+C exits.</Text>
    )}
  </Box>
);
