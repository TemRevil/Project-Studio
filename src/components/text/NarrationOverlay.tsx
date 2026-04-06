import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { spring } from "remotion";
import { COLORS, SPRING, FORMAT_CONFIG } from "../../runtime";
import type { VideoFormat } from "../../runtime";

function splitLines(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= maxChars) { cur = (cur + " " + w).trim(); }
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

const Word = ({ word, startFrame, fps }: { word: string; startFrame: number; fps: number }) => {
  const frame = useCurrentFrame();
  const s = spring({ frame: frame - startFrame, fps, config: SPRING.snappy });
  return (
    <span style={{ display: "inline-block", marginRight: "0.22em", opacity: Math.max(0, Math.min(1, s)), transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)` }}>
      {word}
    </span>
  );
};

export const NarrationOverlay = ({ text, format, startFrame = 6, sceneDuration }: { text: string; format: VideoFormat; startFrame?: number; sceneDuration: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fmt = FORMAT_CONFIG[format];
  const fadeOutStart = sceneDuration - 10;
  const lines = splitLines(text, format === "reel" ? 28 : 45);
  const entry = spring({ frame: frame - (startFrame - 4), fps, config: SPRING.soft });
  const exitOpacity = interpolate(frame, [fadeOutStart, fadeOutStart + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const containerOpacity = frame < startFrame ? 0 : frame > fadeOutStart ? exitOpacity : Math.max(0, Math.min(1, entry));
  const bottomPos = format === "reel" ? fmt.safeBottom + 80 : fmt.safeBottom + 40;

  return (
    <div style={{ position: "absolute", bottom: bottomPos, left: fmt.safeHorizontal, right: fmt.safeHorizontal + 60, opacity: containerOpacity, zIndex: 20 }}>
      <div style={{ display: "inline-block", backgroundColor: "rgba(231,231,231,0.90)", backdropFilter: "blur(4px)", borderRadius: 12, padding: format === "reel" ? "14px 22px" : "12px 20px", boxShadow: "0px 4px 20px rgba(22,66,91,0.15)", border: "1.5px solid rgba(213,197,200,0.5)", maxWidth: "100%" }}>
        {lines.map((line, li) => (
          <div key={li} style={{ display: "block", lineHeight: 1.35, marginBottom: li < lines.length - 1 ? 4 : 0 }}>
            {line.split(" ").map((word, wi) => (
              <Word key={wi} word={word} startFrame={startFrame + li * 8 + wi} fps={fps} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
