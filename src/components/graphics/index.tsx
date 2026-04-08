import React from "react";
import { useCurrentFrame, useVideoConfig, delayRender, continueRender, cancelRender } from "remotion";
import { spring } from "remotion";
import { Lottie } from "@remotion/lottie";
import { staticFile } from "remotion";
import { SPRING } from "../../runtime";
import { usePaletteColors } from "../ui/PaletteTheme";

// ── AnimatedArrow — self-drawing SVG arrow
export const AnimatedArrow = ({ fromX, fromY, toX, toY, startFrame = 0, color, strokeWidth = 3 }: {
  fromX: number; fromY: number; toX: number; toY: number; startFrame?: number; color?: string; strokeWidth?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePaletteColors();
  const stroke = color ?? colors.sky;
  const s = spring({ frame: frame - startFrame, fps, config: SPRING.default });
  const progress = Math.max(0, Math.min(1, s));
  const endX = fromX + (toX - fromX) * progress;
  const endY = fromY + (toY - fromY) * progress;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width="100%" height="100%">
      <defs>
        <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>
      {progress > 0.05 && (
        <line x1={fromX} y1={fromY} x2={endX} y2={endY} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" markerEnd={progress > 0.9 ? "url(#ah)" : undefined} />
      )}
    </svg>
  );
};

// ── DrawingLine — line that draws itself
export const DrawingLine = ({ x1, y1, x2, y2, startFrame = 0, color, strokeWidth = 2, dashed = false }: {
  x1: number; y1: number; x2: number; y2: number; startFrame?: number; color?: string; strokeWidth?: number; dashed?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePaletteColors();
  const stroke = color ?? colors.mauve;
  const s = spring({ frame: frame - startFrame, fps, config: { stiffness: 120, damping: 20 } });
  const progress = Math.max(0, Math.min(1, s));
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width="100%" height="100%">
      {progress > 0.02 && (
        <line x1={x1} y1={y1} x2={x1 + (x2 - x1) * progress} y2={y1 + (y2 - y1) * progress} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={dashed ? "8 6" : undefined} opacity={0.8} />
      )}
    </svg>
  );
};

// ── HandwritingPath — SVG path that draws itself like handwriting
export const HandwritingPath = ({ d, pathLength, startFrame = 0, color, strokeWidth = 3, duration = 60 }: {
  d: string; pathLength: number; startFrame?: number; color?: string; strokeWidth?: number; duration?: number;
}) => {
  const frame = useCurrentFrame();
  const colors = usePaletteColors();
  const stroke = color ?? colors.navy;
  const t = Math.max(0, Math.min(1, (frame - startFrame) / duration));
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  return (
    <svg style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }} width="100%" height="100%">
      <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={pathLength} strokeDashoffset={pathLength * (1 - eased)} />
    </svg>
  );
};

// ── LottieAsset — plays .json Lottie from /attachments/lottie/
export const LottieAsset = ({ file, width = 200, height = 200, loop = false, style }: {
  file: string; width?: number; height?: number; loop?: boolean; style?: React.CSSProperties;
}) => {
  const [animationData, setAnimationData] = React.useState<any>(null);
  const [handle] = React.useState(() => delayRender(`Loading Lottie: ${file}`));

  React.useEffect(() => {
    fetch(staticFile(`lottie/${file}`))
      .then((res) => res.json())
      .then((data) => {
        setAnimationData(data);
        continueRender(handle);
      })
      .catch((err) => {
        console.error(`Failed to load Lottie ${file}:`, err);
        cancelRender(err);
      });
  }, [file, handle]);

  if (!animationData) return null;

  return (
    <div style={{ width, height, ...style }}>
      <Lottie animationData={animationData} loop={loop} style={{ width, height }} />
    </div>
  );
};
