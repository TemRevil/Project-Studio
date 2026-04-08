import type { RendererCapabilitiesManifest } from "../types";
import {
  PRODUCTION_VIDEO_TYPES,
  EXPERIMENTAL_VIDEO_TYPES,
  SAFE_POSITIONS,
  VISUAL_ELEMENT_KINDS,
  VISUAL_TYPES,
  RendererCapabilitiesManifestSchema,
} from "../types";

export const buildRendererCapabilitiesManifest = (): RendererCapabilitiesManifest =>
  RendererCapabilitiesManifestSchema.parse({
    version: 2,
    productionTypes: [...PRODUCTION_VIDEO_TYPES],
    experimentalTypes: [...EXPERIMENTAL_VIDEO_TYPES],
    visualElementKinds: [...VISUAL_ELEMENT_KINDS],
    visualTypes: [...VISUAL_TYPES],
    safePositions: Object.entries(SAFE_POSITIONS).map(([name, value]) => ({
      name,
      x: value.x,
      y: value.y,
      useCase: value.useCase,
    })),
    supportedTransitions: {
      kinetic: ["slide-from-left", "slide-from-right", "outro-fade"],
      motion: ["wipe-from-right", "wipe-from-bottom-right", "camera-push"],
      slides: ["fade", "point-reveal", "outro-fade"],
    },
    syncEngine: {
      version: 1,
      features: [
        "Per-scene TTS audio generation (Voxtral)",
        "Word-level STT transcription with millisecond timestamps",
        "triggersOnWord → entryFrame resolution",
        "Automatic scene duration reconciliation from actual audio lengths",
        "50ms visual-before-audio buffer for natural feel",
        "9-frame linger after audio ends",
      ],
    },
    limitations: [
      "Production mode supports kinetic, motion, and slides only.",
      "Animation, images, and hybrid remain experimental until dedicated schemas and renderers are complete.",
      "Character animation is expression-based only; there is no lip sync or rigging.",
      "Motion connectors support straight lines and threads, not curved path-following.",
      "v3 timing requires Mistral TTS+STT. Without audio, estimated timing is used as fallback.",
      "triggersOnWord matching is case-insensitive substring match — ambiguous words may resolve to wrong timestamp.",
    ],
  });
