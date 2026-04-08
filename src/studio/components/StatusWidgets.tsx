import React from "react";
import { Text } from "ink";

const DOT_FRAMES = ["   ", ".  ", ".. ", "..."];
const SPINNER_FRAMES = ["-", "\\", "|", "/"];

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const useAnimationFrame = (intervalMs = 120) => {
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFrame((current) => current + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return frame;
};

export const AnimatedDots = ({ label, color = "yellow" }: { label: string; color?: string }) => {
  const frame = useAnimationFrame(220);
  return <Text color={color}>{label}{DOT_FRAMES[frame % DOT_FRAMES.length]}</Text>;
};

export const Spinner = ({ label, color = "cyan" }: { label: string; color?: string }) => {
  const frame = useAnimationFrame(90);
  return <Text color={color}>[{SPINNER_FRAMES[frame % SPINNER_FRAMES.length]}] {label}</Text>;
};

export const ProgressBar = ({
  progress,
  width = 26,
  label,
  color = "green",
}: {
  progress: number;
  width?: number;
  label?: string;
  color?: string;
}) => {
  const safeProgress = clamp(progress);
  const filled = Math.round(safeProgress * width);
  const empty = Math.max(0, width - filled);
  const bar = `${"#".repeat(filled)}${"-".repeat(empty)}`;
  const percent = `${Math.round(safeProgress * 100)}%`;

  return (
    <Text color={color}>
      {label ? `${label} ` : ""}
      [{bar}] {percent}
    </Text>
  );
};
