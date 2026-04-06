import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, staticFile } from "remotion";
import { COLORS, FORMAT_CONFIG, SPRING } from "../../runtime";
import type { VideoFormat } from "../../runtime";

// ── BrandMark — The persistent series logo/mark
export const BrandMark = ({ format, isDark = false }: { format: VideoFormat; isDark?: boolean }) => {
  const fmt = FORMAT_CONFIG[format];
  const bottom = format === "reel" ? 220 : 48;
  
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        right: fmt.safeHorizontal,
        opacity: 0.6,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
      >
        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: COLORS.sky }} />
        <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.2em", color: isDark ? COLORS.smoke : COLORS.navy, textTransform: "uppercase" }}>
          PROJECT STUDIO
        </span>
      </div>
  );
};

// ── PaperTexture — Global grainy surface
export const PaperTexture = () => {
  // A subtle subtle paper texture pattern encoded as an SVG
  const paperSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E`;
  
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "multiply",
        opacity: 0.25,
        backgroundImage: `url("${paperSvg}")`,
      }}
    />
  );
};

// ── OutroFade — Vignette or simple fade out
export const OutroFade = ({ totalFrames, isDark = false }: { totalFrames: number; isDark?: boolean }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [totalFrames - 15, totalFrames - 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        backgroundColor: isDark ? COLORS.navy : COLORS.smoke,
        opacity,
      }}
    />
  );
};

export const CinematicVignette = ({ opacity = 0.45 }: { opacity?: number }) => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${opacity}) 100%)`,
        zIndex: 999,
      }}
    />
  );
};

export const FilmGrain = ({ opacity = 0.05 }: { opacity?: number }) => {
  const frame = useCurrentFrame();
  const grainSvg = `data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E`;

  // Animate the noise by translating it each frame
  const xOffset = (frame % 3) * 50;
  const yOffset = ((frame + 1) % 3) * 50;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        mixBlendMode: "overlay",
        backgroundSize: "250px 250px",
        backgroundPosition: `${xOffset}px ${yOffset}px`,
        backgroundImage: `url("${grainSvg}")`,
        zIndex: 1000,
      }}
    />
  );
};

// ── WordReveal — Staggered text reveal for narration
export const WordReveal = ({ text, startFrame, framesPerWord = 3, color = COLORS.navy }: { 
  text: string; startFrame: number; framesPerWord?: number; color?: string 
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", rowGap: 8, columnGap: 12 }}>
      {words.map((word, i) => {
        const s = spring({ frame: frame - (startFrame + i * framesPerWord), fps: 30, config: SPRING.punch });
        const opacity = interpolate(s, [0, 1], [0, 1]);
        const translateY = interpolate(s, [0, 1], [15, 0]);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              transform: `translateY(${translateY}px)`,
              fontSize: 32,
              fontWeight: 700,
              color,
              lineHeight: 1.2
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
