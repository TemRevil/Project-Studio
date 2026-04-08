import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SceneRenderer }  from "../components/scene/SceneRenderer";
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

      {script.scenes.map((scene, sceneIndex) => {
        const startFrame = Math.round(scene.startSecond * fps);
        const endFrame   = Math.round(scene.endSecond   * fps);
        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={endFrame - startFrame}>
            <SceneRenderer
              scene={scene}
              sceneIndex={sceneIndex}
              format={script.format}
              videoType={script.type}
              sceneDuration={endFrame - startFrame}
              runtimeMedia={runtimeMedia}
            />
          </Sequence>
        );
      })}

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
