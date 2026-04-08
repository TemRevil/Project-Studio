import type { ReactElement } from "react";
import { AbsoluteFill, Audio, staticFile, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { SceneRenderer } from "../components/scene/SceneRenderer";
import { BrandMark, PaperTexture, OutroFade, CinematicVignette, FilmGrain } from "../components/ui/index";
import type { RuntimeMedia, VideoScript } from "../runtime";
import { usePaletteColors } from "../components/ui/PaletteTheme";
import { PaletteThemeProvider } from "../components/ui/PaletteTheme";

const VideoCompositionInner = ({ script, runtimeMedia }: { script: VideoScript; runtimeMedia?: RuntimeMedia }) => {
  const { fps } = useVideoConfig();
  const colors = usePaletteColors();
  const isKinetic = script.type === "kinetic";
  const narrationFile = runtimeMedia?.narrationFile;
  const musicFile = runtimeMedia?.backgroundMusicFile ?? script.backgroundMusic?.file;
  const musicVolume = narrationFile ? script.backgroundMusic?.duckedVolume ?? 0.08 : script.backgroundMusic?.baseVolume ?? 0.12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isKinetic ? colors.navy : colors.smoke,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      {!isKinetic && <PaperTexture />}

      {narrationFile && (
        <Audio src={staticFile(narrationFile)} volume={runtimeMedia?.sceneNarrationFiles ? 0 : 1} />
      )}

      {musicFile && (
        <Audio src={staticFile(musicFile)} volume={musicVolume} />
      )}

      <TransitionSeries>
        {script.scenes.flatMap((scene, sceneIndex) => {
          const startFrame = Math.round(scene.startSecond * fps);
          const endFrame = Math.round(scene.endSecond * fps);
          const sceneDuration = Math.max(1, endFrame - startFrame);
          let transitionNode: ReactElement | null = null;

          if (sceneIndex < script.scenes.length - 1) {
            if (script.type === "kinetic") {
              transitionNode = (
                <TransitionSeries.Transition
                  key={`${scene.id}-transition`}
                  presentation={slide({ direction: sceneIndex % 2 === 0 ? "from-left" : "from-right" })}
                  timing={springTiming({ durationInFrames: 14, config: { damping: 200, stiffness: 380 } })}
                />
              );
            } else if (script.type === "motion") {
              transitionNode = (
                <TransitionSeries.Transition
                  key={`${scene.id}-transition`}
                  presentation={wipe({ direction: sceneIndex % 2 === 0 ? "from-right" : "from-bottom-right" })}
                  timing={springTiming({ durationInFrames: 18, config: { damping: 220, stiffness: 320 } })}
                />
              );
            } else {
              transitionNode = (
                <TransitionSeries.Transition
                  key={`${scene.id}-transition`}
                  presentation={fade({ shouldFadeOutExitingScene: true })}
                  timing={linearTiming({ durationInFrames: 12 })}
                />
              );
            }
          }

          return [
            (
              <TransitionSeries.Sequence key={`${scene.id}-sequence`} durationInFrames={sceneDuration} name={scene.id}>
                <SceneRenderer
                  scene={scene}
                  sceneIndex={sceneIndex}
                  format={script.format}
                  videoType={script.type}
                  sceneDuration={sceneDuration}
                  runtimeMedia={runtimeMedia}
                />
              </TransitionSeries.Sequence>
            ),
            transitionNode,
          ];
        })}
      </TransitionSeries>

      <BrandMark format={script.format} isDark={isKinetic} />
      <CinematicVignette opacity={isKinetic ? 0.6 : 0.3} />
      <FilmGrain opacity={isKinetic ? 0.08 : 0.04} />
      <OutroFade totalFrames={script.durationSeconds * fps} isDark={isKinetic} />
    </AbsoluteFill>
  );
};

export const VideoComposition = ({
  script,
  runtimeMedia,
  paletteKey,
  customPalette,
}: {
  script: VideoScript;
  runtimeMedia?: RuntimeMedia;
  paletteKey?: string;
  customPalette?: VideoScript["customPalette"];
}) => {
  return (
    <PaletteThemeProvider
      paletteKey={paletteKey ?? script.paletteKey}
      customPalette={customPalette ?? script.customPalette}
    >
      <VideoCompositionInner script={script} runtimeMedia={runtimeMedia} />
    </PaletteThemeProvider>
  );
};
