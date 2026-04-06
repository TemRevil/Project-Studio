import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { spring } from "remotion";
import { COLORS, SPRING, FORMAT_CONFIG } from "../../types";
import type { VideoFormat } from "../../types";

// ── BrandMark
export const BrandMark = ({ format, isDark = false }: { format: VideoFormat; isDark?: boolean }) => {
  const bottomOffset = format === "reel" ? 220 : 48;
  const markColor = isDark ? COLORS.sky : COLORS.navy;
  const textColor = isDark ? COLORS.navy : COLORS.smoke;
  return (
    <div style={{ position: "absolute", right: 48, bottom: bottomOffset, opacity: 0.65, zIndex: 100 }}>
      <div style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: markColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: textColor, fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans', system-ui" }}>S</span>
      </div>
    </div>
  );
};

// ── PaperTexture (light mode only)
export const PaperTexture = () => (
  <div style={{
    position: "absolute", inset: 0,
    backgroundImage: `radial-gradient(ellipse at 20% 30%, rgba(22,66,91,0.05) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(22,66,91,0.04) 0%, transparent 60%)`,
    pointerEvents: "none", zIndex: 1,
  }} />
);

// ── OutroFade
export const OutroFade = ({ totalFrames, isDark = false }: { totalFrames: number; isDark?: boolean }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [totalFrames - 18, totalFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (fadeIn === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, backgroundColor: isDark ? "#060e14" : COLORS.navyDark, opacity: fadeIn, zIndex: 90, pointerEvents: "none" }} />
  );
};

// ── WordReveal
export const WordReveal = ({ text, startFrame = 0, style }: { text: string; startFrame?: number; style?: React.CSSProperties }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");
  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.25em" }}>
      {words.map((word, i) => {
        const s = spring({ frame: frame - startFrame - i * 3, fps, config: SPRING.snappy });
        return (
          <span key={i} style={{ display: "inline-block", opacity: Math.max(0, Math.min(1, s)), transform: `translateY(${interpolate(s, [0, 1], [12, 0])}px)`, ...style }}>
            {word}
          </span>
        );
      })}
    </span>
  );
};
