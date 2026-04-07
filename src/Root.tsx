import { Composition, registerRoot } from "remotion";
import { VideoComposition } from "./compositions/VideoComposition";
import { FORMAT_CONFIG } from "./runtime";
import type { RuntimeMedia, VideoScript } from "./runtime";

const defaultScript: VideoScript = {
  version: 3,
  status: "draft",
  topic: "RAG Explained",
  slug: "rag-explained",
  type: "kinetic",
  format: "reel",
  durationSeconds: 30,
  sarcasm: true,
  mode: "preview",
  quality: "production",
  scenes: [
    {
      id: "scene-1",
      startSecond: 0,
      endSecond: 10,
      narration: "Your LLM is very confident. It's also making things up.",
      speed: 1.0,
      wordTimestamps: [],
      audioDurationSeconds: 0,
      visual: {
        type: "kinetic",
        background: "dark",
        elements: [
          { id: "hero-1", kind: "hero", label: "Very confident.", position: { x: "50%", y: "45%" }, entryFrame: 0 },
          { id: "support-1", kind: "support", label: "Also completely wrong.", position: { x: "50%", y: "60%" }, entryFrame: 18, isRed: true },
        ],
      },
      sfxCues: [{ id: "scene-1-click", file: "vfx/click.mp3", frame: 0, volume: 0.15, durationFrames: 8 }],
    },
    {
      id: "scene-2",
      startSecond: 10,
      endSecond: 20,
      narration: "RAG gives it a library card. Now it looks things up first.",
      speed: 1.0,
      wordTimestamps: [],
      audioDurationSeconds: 0,
      visual: {
        type: "kinetic",
        background: "dark",
        elements: [
          { id: "hero-2", kind: "hero", label: "RAG.", position: { x: "50%", y: "40%" }, entryFrame: 0, isTeal: true },
          { id: "support-2", kind: "support", label: "Retrieval-Augmented Generation.", position: { x: "50%", y: "56%" }, entryFrame: 12 },
        ],
      },
      tealElement: { kind: "line", appearsAtFrame: 8 },
      sfxCues: [{ id: "scene-2-click", file: "vfx/click.mp3", frame: 0, volume: 0.15, durationFrames: 8 }],
    },
    {
      id: "scene-3",
      startSecond: 20,
      endSecond: 30,
      narration: "Didn't make it smarter. Just gave it a library card.",
      speed: 1.0,
      wordTimestamps: [],
      audioDurationSeconds: 0,
      visual: {
        type: "kinetic",
        background: "dark",
        elements: [
          { id: "hero-3", kind: "hero", label: "Library card.", position: { x: "50%", y: "45%" }, entryFrame: 0, isTeal: true },
          { id: "annotation-1", kind: "annotation", label: "That's it. That's the whole thing.", position: { x: "50%", y: "62%" }, entryFrame: 20 },
        ],
      },
      sfxCues: [{ id: "scene-3-click", file: "vfx/click.mp3", frame: 0, volume: 0.15, durationFrames: 8 }],
    },
  ],
};

const defaultRuntimeMedia: RuntimeMedia = {};

export const RemotionRoot = () => {
  const fmt = FORMAT_CONFIG[defaultScript.format];
  return (
    <Composition
      id="StudioVideo"
      component={VideoComposition}
      durationInFrames={defaultScript.durationSeconds * fmt.fps}
      fps={fmt.fps}
      width={fmt.width}
      height={fmt.height}
      defaultProps={{ script: defaultScript, runtimeMedia: defaultRuntimeMedia }}
      calculateMetadata={({ props }) => {
        const script = (props.script as VideoScript | undefined) ?? defaultScript;
        const runtimeMedia = (props.runtimeMedia as RuntimeMedia | undefined) ?? defaultRuntimeMedia;
        const format = FORMAT_CONFIG[script.format];
        return {
          fps: format.fps,
          width: format.width,
          height: format.height,
          durationInFrames: Math.max(1, Math.round(script.durationSeconds * format.fps)),
          props: {
            script,
            runtimeMedia,
          },
        };
      }}
    />
  );
};

registerRoot(RemotionRoot);
