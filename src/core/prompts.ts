import type { AssetManifest, GenerationPlan, GenerationRequest, RendererCapabilitiesManifest, RulesDigest } from "../types";

const section = (title: string, body: string) => [`## ${title}`, body.trim()].join("\n");

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

export const buildPlanPrompt = ({
  request,
  capabilities,
  assets,
  rules,
}: {
  request: GenerationRequest;
  capabilities: RendererCapabilitiesManifest;
  assets: AssetManifest;
  rules: RulesDigest;
}) => {
  return [
    "You are Lens, the production planner for Project Studio.",
    "Your job is to create a production-safe scene plan that only uses renderer capabilities that exist today.",
    "Return ONLY valid JSON.",
    "Do not use markdown fences.",
    "",
    section("Request", toJson(request)),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Generation instructions",
      [
        "Create a cinematic, professional-grade production plan.",
        "MANDATORY: Diverse Asset Usage. If the AssetManifest contains Lottie files (json) or specific VFX (whooshes, pops, rustles), you MUST use them to elevate the quality.",
        "MANDATORY: Do not default to 'click.mp3' for everything. Match the SFX to the visual intent (e.g., use a whoosh for a slide-in, a pop for a reveal).",
        "MANDATORY: Visual flair. Use 'icon' kind for Lottie animations and 'image' for high-quality background/supporting visuals.",
        "MANDATORY: Multi-Voice Casting. Use different voice IDs (Stella, Benjamin, Marlowe, Leila) for different beats to create a conversational, dynamic narration flow.",
        "MANDATORY: Spatial Complexity. Utilize 'anchor', 'scale', 'rotate', and 'zIndex' for every element to create depth and motion (e.g., tilt a card, stack elements, or anchor text to corners).",
        "Respect the locked tone, brand, and color rules.",
        "For production mode, you MUST utilize kinetic, motion, or slides behavior creatively. Even in kinetic videos, add background icons or floating Lottie elements for a 'modern SaaS' aesthetic.",
        "Each scene must have one narration line and a rich visual layer.",
      ].join("\n"),
    ),
    section(
      "Required JSON shape",
      [
        "{",
        '  "version": 2,',
        '  "slug": "kebab-case",',
        '  "request": { ...same request... },',
        '  "creativeDirection": {',
        '    "hook": "string",',
        '    "toneSummary": "string",',
        '    "notes": ["string"]',
        "  },",
        '  "scenes": [',
        "    {",
        '      "id": "scene-1",',
        '      "objective": "string",',
        '      "narration": "string",',
        '      "visualType": "kinetic|flow|diagram|text-only|icon|image",',
        '      "startSecond": 0,',
        '      "endSecond": 10,',
        '      "keyTerms": ["string"],',
        '      "accentKeyword": "string",',
        '      "visualIntent": "string",',
        '      "assetNeeds": ["relative paths to lottie/*.json, vfx/*.mp3, or descriptive needs"]',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
    ),
  ].join("\n\n");
};

export const buildScriptPrompt = ({
  request,
  plan,
  capabilities,
  assets,
  rules,
}: {
  request: GenerationRequest;
  plan: GenerationPlan;
  capabilities: RendererCapabilitiesManifest;
  assets: AssetManifest;
  rules: RulesDigest;
}) => {
  return [
    "You are Lens, the production script generator for Project Studio.",
    "Return ONLY valid JSON with exact fields and safe values.",
    "Do not wrap the response in markdown fences.",
    "",
    section("Request", toJson(request)),
    section("ApprovedPlan", toJson(plan)),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Output requirements",
      [
        "Generate a high-fidelity VideoScript v2.",
        "MANDATORY: Use the AssetManifest to its full extent. Search for Lottie animations that match the topic and use them in 'icon' elements.",
        "MANDATORY: Professional Soundscape. Mix various VFX from the manifest. A professional video has layers of sound (whooshes on entry, pops on highlight).",
        "MANDATORY: Cinematic Motion. Do NOT just center elements. Use 'anchor' (top-left, bottom-right, etc.) and 'rotate' (e.g. -2 to 4 degrees) to create a premium, hand-crafted feel. Use 'zIndex' to manage overlapping layers properly.",
        "MANDATORY: Emotional Narration. For each scene, specify an 'emotion' (e.g. excited, confident, serious) and pick a 'voiceId' from the cast: Stella (bright), Benjamin (warm), Marlowe (deep), Leila (clear).",
        "If a visual element kind is 'icon', the 'label' field MUST contain the relative path to a Lottie .json file (e.g., lottie/wired/wired-lineal-19-magnifier.json).",
        "If a visual element kind is 'image', the 'label' field MUST contain the relative path to an image file.",
        "For kinetic scenes, mix 'hero' text with supporting 'icon' elements (Lotties) in the background to achieve a cinematic depth.",
        "Only use supported visual element kinds: hero, support, annotation, card, label, thread, arrow, icon, lantern, library, image.",
        "Keep the scene timing strictly equal to narration duration. Coordinate start/end seconds.",
      ].join("\n"),
    ),
    section(
      "Required JSON shape",
      [
        "{",
        '  "version": 2,',
        '  "status": "draft",',
        '  "topic": "string",',
        '  "slug": "kebab-case",',
        '  "type": "kinetic|motion|slides",',
        '  "format": "reel|video|square",',
        '  "durationSeconds": 30,',
        '  "sarcasm": true,',
        '  "mode": "production|preview",',
        '  "quality": "production|balanced|fast",',
        '  "scenes": [',
        "    {",
        '      "id": "scene-1",',
        '      "startSecond": 0,',
        '      "endSecond": 10,',
        '      "narration": "string",',
        '      "voiceId": "Stella|Benjamin|Marlowe|Leila",',
        '      "emotion": "excited|confident|neutral|serious|calm",',
        '      "speed": 1.0,',
        '      "visual": {',
        '        "type": "kinetic|flow|diagram|text-only|icon|image",',
        '        "background": "light|dark|navy",',
        '        "elements": [',
        "          {",
        '            "id": "element-id",',
        '            "kind": "hero|support|annotation|card|label|thread|arrow|icon|lantern|library|image",',
        '            "label": "Text for labels/cards OR relative path for icon/image",',
        '            "position": { "x": "50%", "y": "45%" },',
        '            "anchor": "top-left|top-center|top-right|center-left|center-center|center-right|bottom-left|bottom-center|bottom-right",',
        '            "scale": 1.0,',
        '            "rotate": 0,',
        '            "zIndex": 1,',
        '            "entryFrame": 0,',
        '            "isTeal": true,',
        '            "isRed": false',
        "          }",
        "        ]",
        "      },",
        '      "tealElement": { "kind": "line|thread|glow|border|text", "appearsAtFrame": 12 },',
        '      "sfxCues": [{ "id": "cue-id", "file": "vfx/whoosh.mp3", "frame": 0, "volume": 0.15, "durationFrames": 12 }]',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
    ),
  ].join("\n\n");
};
