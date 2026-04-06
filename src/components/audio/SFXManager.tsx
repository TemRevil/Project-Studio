import { Audio, staticFile, Sequence } from "remotion";

export interface SFXCue { file: string; frame: number; volume?: number; durationFrames?: number; }

const SFXCuePlayer = ({ cue }: { cue: SFXCue }) => {
  return (
    <Sequence from={cue.frame} durationInFrames={cue.durationFrames ?? 100}>
      <Audio src={staticFile(cue.file)} volume={cue.volume ?? 0.20} />
    </Sequence>
  );
};

export const SFXManager = ({ cues }: { cues: SFXCue[] }) => (
  <>{cues.map((c, i) => <SFXCuePlayer key={`${c.file}-${c.frame}-${i}`} cue={c} />)}</>
);
