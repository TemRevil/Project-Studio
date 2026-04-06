import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { COLORS, SHADOWS, SPRING, FORMAT_CONFIG } from "../../runtime";
import type { SceneConfig, VideoFormat } from "../../runtime";
import { NarrationOverlay } from "../text/NarrationOverlay";

const SlidePoint = ({ text, entryFrame, isActive, format }: { text: string; entryFrame: number; isActive: boolean; format: VideoFormat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame: frame - entryFrame, fps, config: SPRING.default });
  const barWidth = spring({ frame: frame - entryFrame - 4, fps, config: SPRING.snappy });
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, opacity: Math.max(0, Math.min(1, interpolate(entry, [0, 0.4], [0, 1]))), transform: `translateX(${interpolate(entry, [0, 1], [-60, 0])}px)`, marginBottom: format === "reel" ? 20 : 16 }}>
      <div style={{ width: isActive ? interpolate(barWidth, [0, 1], [0, 5]) : 2, minHeight: 44, backgroundColor: isActive ? COLORS.sky : COLORS.mauve, borderRadius: 3, flexShrink: 0, alignSelf: "stretch", boxShadow: isActive ? SHADOWS.sky : "none" }} />
      <div style={{ backgroundColor: COLORS.smoke, borderRadius: 10, padding: format === "reel" ? "14px 18px" : "12px 16px", flex: 1, boxShadow: isActive ? SHADOWS.card : SHADOWS.light, border: `1.5px solid ${isActive ? COLORS.mauve : "rgba(213,197,200,0.4)"}` }}>
        <span style={{ fontSize: format === "reel" ? 36 : 28, fontWeight: isActive ? 600 : 400, color: isActive ? COLORS.navy : COLORS.skyDark, fontFamily: "'DM Sans', system-ui", lineHeight: 1.4 }}>{text}</span>
      </div>
    </div>
  );
};

export const SlidesScene = ({ scene, format, sceneDuration }: { scene: SceneConfig; format: VideoFormat; sceneDuration: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fmt = FORMAT_CONFIG[format];
  const titleEl  = scene.visual.elements.find(el => el.kind === "label" && el.id.includes("title"));
  const pointEls = scene.visual.elements.filter(el => el.kind === "card");
  const cardEntry = spring({ frame: frame - 4, fps, config: SPRING.soft });
  const activeIdx = pointEls.reduce((acc, el, i) => frame >= el.entryFrame ? i : acc, -1);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: fmt.safeTop + 80, left: 80, right: 80, bottom: format === "reel" ? fmt.safeBottom + 220 : fmt.safeBottom + 120, backgroundColor: COLORS.mauveLight, borderRadius: 20, boxShadow: SHADOWS.card, border: `1.5px solid ${COLORS.mauve}`, opacity: Math.max(0, Math.min(1, cardEntry)), transform: `translateY(${interpolate(cardEntry, [0, 1], [40, 0])}px)`, padding: format === "reel" ? "36px 32px" : "32px 36px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 24 }}>
        {titleEl && <div style={{ fontSize: format === "reel" ? 48 : 38, fontWeight: 700, color: COLORS.navy, fontFamily: "'DM Sans', system-ui", letterSpacing: "-0.03em", lineHeight: 1.2, paddingBottom: 16, borderBottom: `2px solid ${COLORS.mauve}` }}>{titleEl.label}</div>}
        <div style={{ flex: 1 }}>
          {pointEls.map((el, i) => <SlidePoint key={el.id} text={el.label ?? ""} entryFrame={el.entryFrame} isActive={i === activeIdx} format={format} />)}
        </div>
      </div>
      <NarrationOverlay text={scene.narration} format={format} sceneDuration={sceneDuration} />
    </AbsoluteFill>
  );
};
