import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile, Img } from "remotion";
import { spring, interpolate, delayRender, continueRender } from "remotion";
import { Lottie } from "@remotion/lottie";
import React, { useEffect, useState } from "react";
import { COLORS, SHADOWS, SPRING } from "../../runtime";
import type { VisualConfig, TealElementConfig, VideoFormat } from "../../runtime";

const LottieLoader = ({ file, style }: { file: string; style?: React.CSSProperties }) => {
  const [data, setData] = useState<any>(null);
  const [handle] = useState(() => delayRender("Loading Lottie: " + file));

  useEffect(() => {
    fetch(staticFile(file))
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        continueRender(handle);
      })
      .catch((err) => {
        console.error("Failed to load Lottie:", file, err);
        continueRender(handle);
      });
  }, [file, handle]);

  if (!data) return null;
  return <Lottie animationData={data} style={style} />;
};

export const VisualLayer = ({ visual, tealElement }: { visual: VisualConfig; format: VideoFormat; tealElement?: TealElementConfig }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {visual.elements.map((el) => {
        const entry = spring({ frame: frame - el.entryFrame, fps, config: SPRING.default });
        const opacity = Math.max(0, Math.min(1, entry));
        
        const anchor = el.anchor || "center-center";
        const [v, h] = anchor.split("-");
        const translateX = h === "left" ? "0%" : h === "right" ? "-100%" : "-50%";
        const translateY_anchor = v === "top" ? "0%" : v === "bottom" ? "-100%" : "-50%";

        const entryTranslateY = interpolate(entry, [0, 1], [40, 0]);
        const entryScale = interpolate(entry, [0, 1], [0.85, 1]);
        
        const finalScale = entryScale * (el.scale || 1);
        const finalRotate = el.rotate || 0;

        const isTealActive = el.isTeal && tealElement && frame >= tealElement.appearsAtFrame;
        const color = isTealActive ? COLORS.sky : COLORS.kraft;
        const textColor = isTealActive ? COLORS.sky : COLORS.darkText;

        return (
          <div 
            key={el.id} 
            style={{ 
              position: "absolute", 
              left: el.position.x, 
              top: el.position.y, 
              transform: `translate(${translateX}, ${translateY_anchor}) translateY(${entryTranslateY}px) scale(${finalScale}) rotate(${finalRotate}deg)`, 
              opacity,
              zIndex: el.zIndex || 0
            }}
          >
            {el.kind === "lantern" && (
              <div style={{ width: 140, height: 140, borderRadius: "20px 20px 60% 60%", backgroundColor: COLORS.offWhite, boxShadow: isTealActive ? `0 0 0 3px ${COLORS.sky}, ${SHADOWS.sky}` : SHADOWS.card, border: `3px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 36 }}>✦</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: textColor, letterSpacing: "-0.02em" }}>{el.label}</span>
              </div>
            )}
            {el.kind === "library" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 110 - i * 10, height: 22, backgroundColor: i === 0 ? COLORS.kraft : COLORS.smoke, borderRadius: 4, boxShadow: SHADOWS.light, border: `1.5px solid ${COLORS.mauve}` }} />)}
                {el.label && <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.darkText, marginTop: 6 }}>{el.label}</span>}
              </div>
            )}
            {el.kind === "thread" && (
              <div style={{ width: interpolate(entry, [0, 1], [0, 200]), height: 4, backgroundColor: COLORS.sky, borderRadius: 2, boxShadow: SHADOWS.sky }} />
            )}
            {el.kind === "label" && (
              <div style={{ backgroundColor: COLORS.offWhite, borderRadius: 10, padding: "14px 24px", boxShadow: SHADOWS.card, border: `2px solid ${color}` }}>
                <span style={{ fontSize: 32, fontWeight: 700, color: textColor, letterSpacing: "-0.02em" }}>{el.label}</span>
              </div>
            )}
            {el.kind === "card" && (
              <div style={{ backgroundColor: COLORS.offWhite, borderRadius: 12, padding: "20px 28px", boxShadow: SHADOWS.card, border: `1.5px solid ${COLORS.kraft}`, maxWidth: 260 }}>
                <span style={{ fontSize: 18, fontWeight: 500, color: COLORS.darkText, lineHeight: 1.4 }}>{el.label}</span>
              </div>
            )}
            {el.kind === "icon" && el.label && (
              <div style={{ width: 280, height: 280 }}>
                <LottieLoader file={el.label} style={{ width: "100%", height: "100%" }} />
              </div>
            )}
            {el.kind === "image" && el.label && (
              <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: SHADOWS.card, border: `4px solid ${COLORS.offWhite}` }}>
                <Img src={staticFile(el.label)} style={{ width: 400, height: "auto" }} />
              </div>
            )}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
