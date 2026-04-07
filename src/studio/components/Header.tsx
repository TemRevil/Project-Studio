import React from "react";
import { Box, Text } from "ink";
import boxen from "boxen";
import gradient from "gradient-string";

const PS_LOGO = `
██████╗ ███████╗                               
██╔══██╗██╔════╝                               
██████╔╝███████╗                               
██╔═══╝ ╚════██║                               
██║     ███████║                               
╚═╝     ╚══════╝   STUDIO  2.0                

AI Video Production System                     
by temy
`;

export const Header = () => {
  const styled = boxen(gradient(["#60a5fa", "#a78bfa", "#f472b6"]).multiline(PS_LOGO), {
    padding: { top: 0, bottom: 0, left: 4, right: 8 },
    borderColor: "cyan",
    borderStyle: "double",
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
    {onBack ? <Text color="dim">Press ESC to go back, Ctrl+C to exit.</Text> : <Text color="dim">Use arrow keys to navigate. Ctrl+C to exit.</Text>}
  </Box>
);
