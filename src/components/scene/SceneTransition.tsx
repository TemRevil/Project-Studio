import { interpolate } from "remotion";
import { usePaletteColors } from "../ui/PaletteTheme";

export const SceneTransition = ({ frame, sceneDuration, isDark = false }: { frame: number; sceneDuration: number; isDark?: boolean }) => {
  const fadeOut = interpolate(frame, [sceneDuration - 12, sceneDuration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const colors = usePaletteColors();
  if (fadeOut === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: isDark ? colors.navyDark : colors.smoke, opacity: fadeOut, pointerEvents: "none" }} />
  );
};
