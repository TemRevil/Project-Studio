import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { SceneRenderer }  from "../components/scene/SceneRenderer";
import { BrandMark, PaperTexture, OutroFade, CinematicVignette, FilmGrain } from "../components/ui/index";
import { COLORS } from "../runtime";
import type { RuntimeMedia, VideoScript } from "../runtime";

export const VideoComposition = ({ script, runtimeMedia }: { script: VideoScript; runtimeMedia?: RuntimeMedia }) => {
  const { fps } = useVideoConfig();
  const isKinetic = script.type === "kinetic";
  const narrationFile = runtimeMedia?.narrationFile;
  const musicFile = runtimeMedia?.backgroundMusicFile ?? script.backgroundMusic?.file;
  const musicVolume = narrationFile ? script.backgroundMusic?.duckedVolume ?? 0.08 : script.backgroundMusic?.baseVolume ?? 0.12;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isKinetic ? COLORS.navy : COLORS.smoke,
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

      {script.scenes.map((scene) => {
        const startFrame = Math.round(scene.startSecond * fps);
        const endFrame   = Math.round(scene.endSecond   * fps);
        return (
          <Sequence key={scene.id} from={startFrame} durationInFrames={endFrame - startFrame}>
            <SceneRenderer
              scene={scene}
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
