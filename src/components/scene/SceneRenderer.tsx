import { AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame } from "remotion";
import { VisualLayer }      from "./VisualLayer";
import { SceneTransition }  from "./SceneTransition";
import { MotionScene }      from "./MotionScene";
import { SlidesScene }      from "./SlidesScene";
import { KineticScene }     from "./KineticScene";
import { Character }        from "../character/Character";
import { NarrationOverlay } from "../text/NarrationOverlay";
import { SFXManager } from "../audio/SFXManager";
import { COLORS } from "../../runtime";
import type { RuntimeMedia, SceneConfig, VideoFormat, VideoType } from "../../runtime";

export const SceneRenderer = ({ scene, format, videoType, sceneDuration, runtimeMedia }: { scene: SceneConfig; format: VideoFormat; videoType: VideoType; sceneDuration: number; runtimeMedia?: RuntimeMedia }) => {
  const frame = useCurrentFrame();
  const isKinetic = videoType === "kinetic";
  const isDark = isKinetic;

  const pushIn   = interpolate(frame, [0, sceneDuration], [1.0, 1.035], { extrapolateRight: "clamp" });
  const pullBack = interpolate(frame, [sceneDuration - 8, sceneDuration], [1.035, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cameraScale = frame > sceneDuration - 8 ? pullBack : pushIn;
  const drift = interpolate(frame, [0, sceneDuration], [0, -12], { extrapolateRight: "clamp" });
  const entryOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const sfxCues = scene.sfxCues ?? [];
  const sceneAudio = runtimeMedia?.sceneNarrationFiles?.[scene.id];

  // Kinetic — no camera, no parallax, just full frame
  if (isKinetic) {
    return (
        <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <KineticScene scene={scene} format={format} sceneDuration={sceneDuration} />
        <SceneTransition frame={frame} sceneDuration={sceneDuration} isDark />
      </AbsoluteFill>
    );
  }

  if (videoType === "motion") {
      return (
        <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <AbsoluteFill style={{ transform: `scale(${cameraScale})`, transformOrigin: "center center" }}>
          <MotionScene scene={scene} format={format} sceneDuration={sceneDuration} />
        </AbsoluteFill>
        <SceneTransition frame={frame} sceneDuration={sceneDuration} />
      </AbsoluteFill>
    );
  }

  if (videoType === "slides") {
      return (
        <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <AbsoluteFill style={{ transform: `scale(${cameraScale})`, transformOrigin: "center center" }}>
          <SlidesScene scene={scene} format={format} sceneDuration={sceneDuration} />
        </AbsoluteFill>
        <SceneTransition frame={frame} sceneDuration={sceneDuration} />
      </AbsoluteFill>
    );
  }

  // Animation / images / hybrid — parallax
  const showCharacter = (videoType === "animation" || videoType === "hybrid") && scene.character !== undefined;
  return (
    <AbsoluteFill style={{ opacity: entryOpacity }}>
      {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
      {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
      <AbsoluteFill style={{ transform: `scale(${cameraScale})`, transformOrigin: "center center" }}>
        <AbsoluteFill style={{ transform: `translateX(${drift * 0.3}px)`, backgroundColor: COLORS.smoke }} />
        <AbsoluteFill style={{ transform: `translateX(${drift * 0.6}px)` }}>
          <VisualLayer visual={scene.visual} format={format} tealElement={scene.tealElement} />
          {showCharacter && scene.character && (
            <Character expression={scene.character.expression} position={scene.character.position} entryFrame={scene.character.entryFrame ?? 0} />
          )}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${drift * 1.0}px)` }} />
      </AbsoluteFill>
      <NarrationOverlay text={scene.narration} format={format} sceneDuration={sceneDuration} wordTimestamps={scene.wordTimestamps} />
      <SceneTransition frame={frame} sceneDuration={sceneDuration} />
    </AbsoluteFill>
  );
};
