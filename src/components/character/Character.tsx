import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { spring, interpolate } from "remotion";
import { SPRING } from "../../runtime";
import type { CharacterExpression } from "../../runtime";

const EXPRESSIONS: Record<CharacterExpression, string> = {
  idle: "characters/idle.png", talking: "characters/talking.png",
  thinking: "characters/thinking.png", surprised: "characters/surprised.png",
  pointing: "characters/pointing.png", laughing: "characters/laughing.png",
  explaining: "characters/explaining.png", shrug: "characters/shrug.png",
};

const POSITIONS = { left: "15%", center: "50%", right: "72%" };

export const Character = ({ expression, position, entryFrame = 0, scale = 1 }: {
  expression: CharacterExpression; position: "left" | "center" | "right"; entryFrame?: number; scale?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame: frame - entryFrame, fps, config: SPRING.character });
  const talkFrame = Math.floor(frame / 4) % 2;
  const activeExpression = expression === "talking" && talkFrame === 1 ? "idle" : expression;
  return (
    <div style={{
      position: "absolute", left: POSITIONS[position], bottom: "8%",
      transform: `translateX(-50%) translateY(${interpolate(entry, [0, 1], [80, 0])}px) scale(${entry * scale})`,
      opacity: Math.max(0, Math.min(1, entry)), zIndex: 10,
    }}>
      <Img src={staticFile(EXPRESSIONS[activeExpression])}
        style={{ height: 520, width: "auto", filter: "drop-shadow(0px 8px 20px rgba(22,66,91,0.22))" }}
        onError={() => {}} />
    </div>
  );
};
