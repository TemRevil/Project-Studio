import { interpolate } from "remotion";
import { COLORS } from "../../runtime";

export const SceneTransition = ({ frame, sceneDuration, isDark = false }: { frame: number; sceneDuration: number; isDark?: boolean }) => {
  const fadeOut = interpolate(frame, [sceneDuration - 12, sceneDuration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (fadeOut === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: isDark ? COLORS.navyDark : COLORS.smoke, opacity: fadeOut, pointerEvents: "none" }} />
  );
};
