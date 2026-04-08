import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { FORMAT_CONFIG, SPRING, toRgba } from "../../runtime";
import type { SceneConfig, VideoFormat } from "../../runtime";
import { NarrationOverlay } from "../text/NarrationOverlay";
import { usePaletteTheme } from "../ui/PaletteTheme";

const SlidePoint = ({ text, entryFrame, isActive, format }: { text: string; entryFrame: number; isActive: boolean; format: VideoFormat }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, shadows } = usePaletteTheme();
  const entry = spring({ frame: frame - entryFrame, fps, config: SPRING.default });
  const barWidth = spring({ frame: frame - entryFrame - 4, fps, config: SPRING.snappy });
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, opacity: Math.max(0, Math.min(1, interpolate(entry, [0, 0.4], [0, 1]))), transform: `translateX(${interpolate(entry, [0, 1], [-60, 0])}px)`, marginBottom: format === "reel" ? 20 : 16 }}>
      <div style={{ width: isActive ? interpolate(barWidth, [0, 1], [0, 5]) : 2, minHeight: 44, backgroundColor: isActive ? colors.sky : colors.mauve, borderRadius: 3, flexShrink: 0, alignSelf: "stretch", boxShadow: isActive ? shadows.sky : "none" }} />
      <div style={{ backgroundColor: colors.smoke, borderRadius: 10, padding: format === "reel" ? "14px 18px" : "12px 16px", flex: 1, boxShadow: isActive ? shadows.card : shadows.light, border: `1.5px solid ${isActive ? colors.mauve : toRgba(colors.mauve, 0.4)}` }}>
        <span style={{ fontSize: format === "reel" ? 36 : 28, fontWeight: isActive ? 600 : 400, color: isActive ? colors.navy : colors.skyDark, fontFamily: "'DM Sans', system-ui", lineHeight: 1.4 }}>{text}</span>
      </div>
    </div>
  );
};

export const SlidesScene = ({ scene, format, sceneDuration }: { scene: SceneConfig; format: VideoFormat; sceneDuration: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fmt = FORMAT_CONFIG[format];
  const { colors, shadows } = usePaletteTheme();
  const titleEl  = scene.visual.elements.find(el => el.kind === "label" && el.id.includes("title"));
  const pointEls = scene.visual.elements.filter(el => el.kind === "card");
  const cardEntry = spring({ frame: frame - 4, fps, config: SPRING.soft });
  const activeIdx = pointEls.reduce((acc, el, i) => frame >= el.entryFrame ? i : acc, -1);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: fmt.safeTop + 80, left: 80, right: 80, bottom: format === "reel" ? fmt.safeBottom + 220 : fmt.safeBottom + 120, backgroundColor: colors.mauveLight, borderRadius: 20, boxShadow: shadows.card, border: `1.5px solid ${colors.mauve}`, opacity: Math.max(0, Math.min(1, cardEntry)), transform: `translateY(${interpolate(cardEntry, [0, 1], [40, 0])}px)`, padding: format === "reel" ? "36px 32px" : "32px 36px", overflow: "hidden", display: "flex", flexDirection: "column", gap: 24 }}>
        {titleEl && <div style={{ fontSize: format === "reel" ? 48 : 38, fontWeight: 700, color: colors.navy, fontFamily: "'DM Sans', system-ui", letterSpacing: "-0.03em", lineHeight: 1.2, paddingBottom: 16, borderBottom: `2px solid ${colors.mauve}` }}>{titleEl.label}</div>}
        <div style={{ flex: 1 }}>
          {pointEls.map((el, i) => <SlidePoint key={el.id} text={el.label ?? ""} entryFrame={el.entryFrame} isActive={i === activeIdx} format={format} />)}
        </div>
      </div>
      <NarrationOverlay text={scene.narration} format={format} sceneDuration={sceneDuration} />
    </AbsoluteFill>
  );
};
