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
      kinetic: ["hard-cut", "outro-fade"],
      motion: ["fade", "camera-push", "scene-fade"],
      slides: ["slide-up", "point-reveal", "scene-fade"],
    },
    limitations: [
      "Production mode supports kinetic, motion, and slides only.",
      "Animation, images, and hybrid remain experimental until dedicated schemas and renderers are complete.",
      "Character animation is expression-based only; there is no lip sync or rigging.",
      "Motion connectors support straight lines and threads, not curved path-following.",
      "The renderer expects safe-position layouts and deterministic timing.",
    ],
  });
