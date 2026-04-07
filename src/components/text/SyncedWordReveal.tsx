import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { spring } from "remotion";
import { COLORS, SPRING } from "../../runtime";
import type { WordTimestamp } from "../../runtime";

interface SyncedWordRevealProps {
  timestamps: WordTimestamp[];
  highlightColor?: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  style?: React.CSSProperties;
}

/**
 * SyncedWordReveal — Exact-frame word reveal from STT timestamps.
 * 
 * Each word appears at the exact frame derived from the Voxtral STT
 * transcription. The currently-spoken word highlights in sky blue.
 * This replaces all estimated word timing in the NarrationOverlay.
 */
export const SyncedWordReveal = ({
  timestamps,
  highlightColor = COLORS.sky,
  fontSize = 26,
  fontWeight = 600,
  color = COLORS.smoke,
  style,
}: SyncedWordRevealProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!timestamps || timestamps.length === 0) return null;

  return (
    <span
      style={{
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize,
        fontWeight,
        lineHeight: 1.4,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      {timestamps.map((wt, i) => {
        const wordFrame = wt.frame ?? Math.round(wt.start * fps);
        const wordEndFrame = wt.endFrame ?? Math.round(wt.end * fps);

        const isVisible = frame >= wordFrame;
        const isActive = frame >= wordFrame && frame <= wordEndFrame;

        // Spring animation for word entry
        const s = spring({
          frame: frame - wordFrame,
          fps,
          config: SPRING.snappy,
        });

        const opacity = isVisible ? Math.max(0, Math.min(1, s)) : 0;
        const translateY = isVisible
          ? interpolate(s, [0, 1], [8, 0])
          : 8;

        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity,
              color: isActive ? highlightColor : color,
              transform: `translateY(${translateY}px)`,
              marginRight: "0.22em",
              transition: "color 0.1s ease",
            }}
          >
            {wt.word}
          </span>
        );
      })}
    </span>
  );
};

/**
 * SyncedNarrationOverlay — Full narration overlay using exact STT timestamps.
 * 
 * Replaces NarrationOverlay when word timestamps are available.
 * Falls back to the standard NarrationOverlay behavior when timestamps are empty.
 */
export const SyncedNarrationOverlay = ({
  timestamps,
  format,
  sceneDuration,
}: {
  timestamps: WordTimestamp[];
  format: "reel" | "video" | "square";
  sceneDuration: number;
}) => {
  const frame = useCurrentFrame();

  if (!timestamps || timestamps.length === 0) return null;

  const fadeOutStart = sceneDuration - 10;
  const exitOpacity = interpolate(
    frame,
    [fadeOutStart, fadeOutStart + 8],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const containerOpacity = frame > fadeOutStart ? exitOpacity : 1;

  const bottomPos = format === "reel" ? 280 : 120;
  const horizontalPad = format === "reel" ? 60 : 80;

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomPos,
        left: horizontalPad,
        right: horizontalPad + 60,
        opacity: containerOpacity,
        zIndex: 20,
      }}
    >
      <div
        style={{
          display: "inline-block",
          backgroundColor: "rgba(231,231,231,0.90)",
          backdropFilter: "blur(4px)",
          borderRadius: 12,
          padding: format === "reel" ? "14px 22px" : "12px 20px",
          boxShadow: "0px 4px 20px rgba(22,66,91,0.15)",
          border: "1.5px solid rgba(213,197,200,0.5)",
          maxWidth: "100%",
        }}
      >
        <SyncedWordReveal timestamps={timestamps} />
      </div>
    </div>
  );
};
