import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { FORMAT_CONFIG, SPRING } from "../../runtime";
import type { SceneConfig, VideoFormat } from "../../runtime";
import { NarrationOverlay } from "../text/NarrationOverlay";
import { AnimatedArrow, DrawingLine } from "../graphics";
import { usePaletteTheme } from "../ui/PaletteTheme";

const FlowNode = ({ label, entryFrame, x, y, isTeal = false }: { label: string; entryFrame: number; x: string; y: string; isTeal?: boolean; }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, shadows } = usePaletteTheme();
  const entry = spring({ frame: frame - entryFrame, fps, config: SPRING.default });
  const scale = interpolate(entry, [0, 1], [0.6, 1]);
  const opacity = Math.max(0, Math.min(1, interpolate(entry, [0, 0.3], [0, 1])));
  const pulse = isTeal && entry > 0.9 ? 1 + Math.sin(frame * 0.08) * 0.015 : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${scale * pulse})`, opacity, display: "flex", alignItems: "center", justifyContent: "center", width: 140, height: 72, borderRadius: 12, backgroundColor: isTeal ? colors.sky : colors.offWhite, border: `2.5px solid ${isTeal ? colors.skyDark : colors.kraft}`, boxShadow: isTeal ? shadows.sky : shadows.card }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: isTeal ? colors.navy : colors.darkText, letterSpacing: "-0.02em", textAlign: "center", padding: "0 12px", lineHeight: 1.3, fontFamily: "'DM Sans', system-ui" }}>{label}</span>
    </div>
  );
};

export const MotionScene = ({ scene, format, sceneDuration }: { scene: SceneConfig; format: VideoFormat; sceneDuration: number }) => {
  const frame = useCurrentFrame();
  const fmt = FORMAT_CONFIG[format];
  const { colors } = usePaletteTheme();
  const nodes = scene.visual.elements.filter(el => el.kind !== "thread" && el.kind !== "arrow");
  const threads = scene.visual.elements.filter(el => el.kind === "thread" || el.kind === "arrow");
  const toCanvasPoint = (x: string, y: string) => ({
    x: (parseFloat(x) / 100) * fmt.width,
    y: (parseFloat(y) / 100) * fmt.height,
  });
  return (
    <AbsoluteFill style={{ backgroundColor: colors.smoke }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 20%, ${colors.shadowSky}, transparent 38%)` }} />
      {threads.map((el, index) => {
        const from = nodes[index] ?? nodes[0];
        const to = nodes[index + 1] ?? nodes[nodes.length - 1];
        if (!from || !to) return null;
        const start = toCanvasPoint(from.position.x, from.position.y);
        const end = toCanvasPoint(to.position.x, to.position.y);
        return el.kind === "arrow" ? (
          <AnimatedArrow
            key={el.id}
            fromX={start.x}
            fromY={start.y}
            toX={end.x}
            toY={end.y}
            startFrame={el.entryFrame}
            color={el.isTeal && scene.tealElement != null && frame >= scene.tealElement.appearsAtFrame ? colors.sky : colors.mauve}
          />
        ) : (
          <DrawingLine
            key={el.id}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            startFrame={el.entryFrame}
            color={el.isTeal && scene.tealElement != null && frame >= scene.tealElement.appearsAtFrame ? colors.sky : colors.mauve}
            strokeWidth={4}
          />
        );
      })}
      {nodes.map(el => (
        <FlowNode key={el.id} label={el.label ?? el.id} entryFrame={el.entryFrame} x={el.position.x} y={el.position.y}
          isTeal={el.isTeal && scene.tealElement != null && frame >= scene.tealElement.appearsAtFrame} />
      ))}
      <NarrationOverlay text={scene.narration} format={format} sceneDuration={sceneDuration} />
    </AbsoluteFill>
  );
};
