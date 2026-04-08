import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, staticFile } from "remotion";
import { spring, interpolate, delayRender, continueRender } from "remotion";
import { Lottie } from "@remotion/lottie";
import { FORMAT_CONFIG, SPRING } from "../../runtime";
import type { SceneConfig, VideoFormat, WordTimestamp } from "../../runtime";
import { usePaletteColors } from "../ui/PaletteTheme";

interface WordProps { word: string; startFrame: number; color?: string; variant?: "slam"|"slideUp"|"fadeIn"; style?: React.CSSProperties; }

export const KineticWord = ({ word, startFrame, color, variant = "slam", style }: WordProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = usePaletteColors();
  const s = spring({
    frame: frame - startFrame,
    fps,
    config: variant === "slam"
      ? { stiffness: 500, damping: 18, mass: 0.5 }
      : variant === "slideUp"
        ? { stiffness: 180, damping: 20 }
        : { stiffness: 120, damping: 20 },
  });
  const opacity = Math.max(0, Math.min(1, variant === "slam" ? interpolate(s, [0, 0.3], [0, 1]) : s));
  const translateY = variant === "slam" ? interpolate(s, [0, 1], [-72, 0]) : variant === "slideUp" ? interpolate(s, [0, 1], [30, 0]) : 0;
  const scale = variant === "slam" ? interpolate(s, [0, 0.7, 1], [1.3, 0.95, 1]) : 1;
  return <span style={{ display: "inline-block", transform: `translateY(${translateY}px) scale(${scale})`, opacity, color: color ?? colors.smoke, ...style }}>{word}</span>;
};

interface LineProps { text: string; startFrame: number; fontSize?: number; fontWeight?: number; color?: string; accentWord?: string; redWord?: string; variant?: "slam"|"slideUp"|"fadeIn"; }

export const KineticLine = ({ text, startFrame, fontSize = 72, fontWeight = 700, color, accentWord, redWord, variant = "slam", wordTimestamps }: LineProps & { wordTimestamps?: WordTimestamp[] }) => {
  const words = text.split(" ");
  const pulse = 1 + Math.sin(useCurrentFrame() * 0.12) * 0.02;
  const colors = usePaletteColors();
  
  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize, fontWeight, lineHeight: 1.1, letterSpacing: "-0.03em", textAlign: "center", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `${fontSize * 0.18}px` }}>
      {words.map((word, i) => {
        const isAccent = accentWord && word.toLowerCase() === accentWord.toLowerCase();
        const isRed    = redWord && word.toLowerCase() === redWord.toLowerCase();
        const wordColor = isRed ? colors.red : isAccent ? colors.sky : color;
        
        const normalizedWord = word.toLowerCase().replace(/[^\w]/g, "");
        const priorOccurrences = words
          .slice(0, i)
          .filter((candidate) => candidate.toLowerCase().replace(/[^\w]/g, "") === normalizedWord).length;
        const matchingTimestamps = wordTimestamps?.filter(
          (timestamp) => timestamp.word.toLowerCase().replace(/[^\w]/g, "") === normalizedWord
        ) ?? [];
        const ts = matchingTimestamps[priorOccurrences];
        const staggerFrames = variant === "slam" ? 4 : 3;
        const wordStart = ts ? (ts.frame ?? Math.round(ts.start * 30)) : (startFrame + i * staggerFrames);

        return (
          <span key={i} style={{ display: "inline-block", transform: `scale(${isAccent ? pulse : 1})` }}>
            <KineticWord word={word} startFrame={wordStart} color={wordColor} variant={variant}
              style={{ textShadow: isAccent ? `0 0 40px ${colors.shadowSky}` : isRed ? `0 0 30px rgba(237,28,36,0.5)` : "none" }} />
          </span>
        );
      })}
    </div>
  );
};

const LottieLoader = ({ file, style }: { file: string; style?: React.CSSProperties }) => {
  const [data, setData] = React.useState<any>(null);
  const [handle] = React.useState(() => delayRender("Loading Lottie: " + file));

  React.useEffect(() => {
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

export const KineticScene = ({ scene, format, sceneDuration }: { scene: SceneConfig; format: VideoFormat; sceneDuration: number }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const fmt = FORMAT_CONFIG[format];
  const colors = usePaletteColors();
  const heroEl      = scene.visual.elements.find(el => el.kind === "hero");
  const supportEl   = scene.visual.elements.find(el => el.kind === "support");
  const annotEl     = scene.visual.elements.find(el => el.kind === "annotation");
  const heroSize    = format === "reel" ? 88 : 72;
  const supportSize = format === "reel" ? 48 : 40;
  const annotSize   = format === "reel" ? 30 : 24;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.navy }}>
      <div style={{ 
        position: "absolute", 
        top: fmt.safeTop + 60, 
        bottom: fmt.safeBottom + (format === "reel" ? 220 : 80), 
        left: fmt.safeHorizontal, 
        right: fmt.safeHorizontal, 
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        gap: format === "reel" ? 16 : 12, 
        zIndex: 4 
      }}>
        {heroEl && (
          <div style={{ transform: `scale(${heroEl.scale ?? 1}) rotate(${heroEl.rotate ?? 0}deg)`, zIndex: heroEl.zIndex ?? 4 }}>
              <KineticLine text={heroEl.label ?? ""} startFrame={heroEl.entryFrame} fontSize={heroSize} fontWeight={700}
                accentWord={heroEl.isTeal ? heroEl.label : undefined}
                redWord={heroEl.isRed ? heroEl.label : undefined} variant="slam" wordTimestamps={scene.wordTimestamps} />
          </div>
        )}

        {supportEl && (
          <div style={{ transform: `scale(${supportEl.scale ?? 1}) rotate(${supportEl.rotate ?? 0}deg)`, zIndex: supportEl.zIndex ?? 4 }}>
              <KineticLine text={supportEl.label ?? ""} startFrame={supportEl.entryFrame} fontSize={supportSize} fontWeight={500}
                color={`rgba(231,231,231,0.78)`}
              accentWord={supportEl.isTeal ? supportEl.label?.split(" ").pop() : undefined}
              redWord={supportEl.isRed ? supportEl.label?.split(" ").pop() : undefined} variant="slideUp" wordTimestamps={scene.wordTimestamps} />
          </div>
        )}

        {annotEl && (
          <div style={{ transform: `scale(${annotEl.scale ?? 1}) rotate(${annotEl.rotate ?? 0}deg)`, zIndex: annotEl.zIndex ?? 4 }}>
            <KineticLine text={annotEl.label ?? ""} startFrame={annotEl.entryFrame} fontSize={annotSize} fontWeight={400}
              color={`rgba(231,231,231,0.42)`} variant="fadeIn" wordTimestamps={scene.wordTimestamps} />
          </div>
        )}
      </div>

      {/* Decorative Assets (Icons/Lotties/Images) */}
      {scene.visual.elements.filter(el => ["icon", "image"].includes(el.kind)).map(el => {
        const s = spring({ frame: frame - el.entryFrame, fps, config: SPRING.default });
        const opacity = interpolate(s, [0, 1], [0, el.kind === "icon" ? 0.4 : 1]); 
        const baseScale = el.scale ?? (el.kind === "icon" ? 1.2 : 1);
        const springScale = interpolate(s, [0, 1], [0.5, baseScale]);
        
        const anchorStyles: React.CSSProperties = {
          position: "absolute",
          zIndex: el.zIndex ?? 1,
        };

        const anchor = el.anchor || "center-center";
        const [v, h] = anchor.split("-");

        if (v === "top") anchorStyles.top = 100;
        else if (v === "bottom") anchorStyles.bottom = 100;
        else anchorStyles.top = "50%";

        if (h === "left") anchorStyles.left = 100;
        else if (h === "right") anchorStyles.right = 100;
        else anchorStyles.left = "50%";

        const translate = (v === "center" && h === "center") ? "translate(-50%, -50%)" : 
                          (v === "center") ? "translateY(-50%)" :
                          (h === "center") ? "translateX(-50%)" : "none";

        return (
          <div key={el.id} style={{ 
            ...anchorStyles,
            transform: `${translate} scale(${springScale}) rotate(${el.rotate ?? 0}deg)`, 
            opacity, 
            width: 400, 
            height: 400 
          }}>
             {el.kind === "icon" ? (
               <LottieLoader file={el.label ?? ""} style={{ width: "100%", height: "100%" }} />
             ) : (
               <div style={{ borderRadius: 20, overflow: "hidden", border: `2px solid ${colors.offWhite}` }}>
                 <img src={staticFile(el.label ?? "")} style={{ width: "100%", height: "auto" }} />
               </div>
             )}
          </div>
        );
      })}

      {/* Sky underline at teal moment */}
      {scene.tealElement && frame >= scene.tealElement.appearsAtFrame && (
        <div style={{ position: "absolute", left: "15%", right: "15%", height: 2, top: "52%", backgroundColor: colors.sky, opacity: interpolate(frame, [scene.tealElement.appearsAtFrame, scene.tealElement.appearsAtFrame + 12], [0, 0.35], { extrapolateRight: "clamp" }), zIndex: 2 }} />
      )}
    </AbsoluteFill>
  );
};
