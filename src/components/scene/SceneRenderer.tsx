import { AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { VisualLayer }      from "./VisualLayer";
import { SceneTransition }  from "./SceneTransition";
import { MotionScene }      from "./MotionScene";
import { SlidesScene }      from "./SlidesScene";
import { KineticScene }     from "./KineticScene";
import { Character }        from "../character/Character";
import { NarrationOverlay } from "../text/NarrationOverlay";
import { SFXManager } from "../audio/SFXManager";
import type { RuntimeMedia, SceneConfig, SceneEntryVariant, VideoFormat, VideoType } from "../../runtime";
import { usePaletteColors } from "../ui/PaletteTheme";

const getDefaultEntryVariant = (sceneIndex: number, videoType: VideoType): SceneEntryVariant => {
  if (videoType !== "kinetic") {
    return "zoom-in";
  }

  if (sceneIndex === 0) {
    return "slam-from-bottom";
  }

  const variants: SceneEntryVariant[] = [
    "slam-from-left",
    "slam-from-right",
    "slam-from-top",
    "slam-from-bottom",
  ];

  return variants[sceneIndex % variants.length];
};

const SceneCamera = ({
  children,
  sceneDuration,
  entryVariant = "slam-from-bottom",
}: {
  children: React.ReactNode;
  sceneDuration: number;
  entryVariant?: SceneEntryVariant;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrySpring = entryVariant === "instant"
    ? 1
    : spring({
        frame,
        fps,
        config: { stiffness: 380, damping: 28, mass: 0.7 },
      });

  const pushIn = interpolate(frame, [0, sceneDuration], [1.0, 1.04], {
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(frame, [Math.max(0, sceneDuration - 10), sceneDuration], [1.04, 1.0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cameraScale = frame > sceneDuration - 10 ? exitScale : pushIn;
  const progress = interpolate(entrySpring, [0, 1], [1, 0]);
  const distance = 80;

  const entryOffset = (() => {
    switch (entryVariant) {
      case "slam-from-top":
        return { x: 0, y: -distance * progress };
      case "slam-from-bottom":
        return { x: 0, y: distance * progress };
      case "slam-from-left":
        return { x: -distance * progress, y: 0 };
      case "slam-from-right":
        return { x: distance * progress, y: 0 };
      default:
        return { x: 0, y: 0 };
    }
  })();

  const entryZoom = entryVariant === "zoom-in"
    ? interpolate(entrySpring, [0, 1], [0.85, 1.0])
    : 1;

  return (
    <AbsoluteFill
      style={{
        transform: `translateX(${entryOffset.x}px) translateY(${entryOffset.y}px) scale(${cameraScale * entryZoom})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const SceneRenderer = ({
  scene,
  format,
  videoType,
  sceneDuration,
  runtimeMedia,
  sceneIndex,
}: {
  scene: SceneConfig;
  format: VideoFormat;
  videoType: VideoType;
  sceneDuration: number;
  runtimeMedia?: RuntimeMedia;
  sceneIndex: number;
}) => {
  const frame = useCurrentFrame();
  const isKinetic = videoType === "kinetic";
  const colors = usePaletteColors();
  const entryVariant = scene.entryVariant ?? getDefaultEntryVariant(sceneIndex, videoType);
  const drift = interpolate(frame, [0, sceneDuration], [0, -12], { extrapolateRight: "clamp" });
  const entryOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  const sfxCues = scene.sfxCues ?? [];
  const sceneAudio = runtimeMedia?.sceneNarrationFiles?.[scene.id];

  if (isKinetic) {
    return (
      <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <SceneCamera sceneDuration={sceneDuration} entryVariant={entryVariant}>
          <KineticScene scene={scene} format={format} sceneDuration={sceneDuration} />
        </SceneCamera>
        <SceneTransition frame={frame} sceneDuration={sceneDuration} isDark />
      </AbsoluteFill>
    );
  }

  if (videoType === "motion") {
    return (
      <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <SceneCamera sceneDuration={sceneDuration} entryVariant={entryVariant}>
          <MotionScene scene={scene} format={format} sceneDuration={sceneDuration} />
        </SceneCamera>
        <SceneTransition frame={frame} sceneDuration={sceneDuration} />
      </AbsoluteFill>
    );
  }

  if (videoType === "slides") {
    return (
      <AbsoluteFill style={{ opacity: entryOpacity }}>
        {sfxCues.length > 0 ? <SFXManager cues={sfxCues} /> : null}
        {sceneAudio ? <Audio src={staticFile(sceneAudio)} /> : null}
        <SceneCamera sceneDuration={sceneDuration} entryVariant={entryVariant}>
          <SlidesScene scene={scene} format={format} sceneDuration={sceneDuration} />
        </SceneCamera>
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
      <SceneCamera sceneDuration={sceneDuration} entryVariant={entryVariant}>
        <AbsoluteFill style={{ transform: `translateX(${drift * 0.3}px)`, backgroundColor: colors.smoke }} />
        <AbsoluteFill style={{ transform: `translateX(${drift * 0.6}px)` }}>
          <VisualLayer visual={scene.visual} format={format} tealElement={scene.tealElement} />
          {showCharacter && scene.character && (
            <Character expression={scene.character.expression} position={scene.character.position} entryFrame={scene.character.entryFrame ?? 0} />
          )}
        </AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${drift * 1.0}px)` }} />
      </SceneCamera>
      <NarrationOverlay text={scene.narration} format={format} sceneDuration={sceneDuration} wordTimestamps={scene.wordTimestamps} />
      <SceneTransition frame={frame} sceneDuration={sceneDuration} />
    </AbsoluteFill>
  );
};
