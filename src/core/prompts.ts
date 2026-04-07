import type { AssetManifest, GenerationPlan, GenerationRequest, RendererCapabilitiesManifest, RulesDigest } from "../types";

const section = (title: string, body: string) => [`## ${title}`, body.trim()].join("\n");

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

// ── The 8 Lens Skills (injected into every prompt) ──

const SKILL_1_ASSET_AWARENESS = `
### SKILL 1 — ASSET AWARENESS
Before generating any script, read the full asset manifest.
For every narration line, find the best matching Lottie animation by keyword.
Never reference a file path that isn't in the manifest.

ASSET MATCHING LOGIC:
1. Extract nouns from the narration line
2. Search Lottie manifest keywords for matches
3. If match found: use kind "icon" with the Lottie path as label
4. If no match: use kind "label" with text only
5. NEVER invent a path that doesn't exist
`.trim();

const SKILL_2_NARRATION_QUALITY = `
### SKILL 2 — NARRATION QUALITY
- Every scene narration must stand alone
- The last line of every video must be a closed door. Not a question. A statement.
- No sentence longer than 12 words. If a concept needs more: split across two scenes.
- Narration rhythm: read it out loud. If you breathe in the same spot twice: one sentence is too long. Split it.
`.trim();

const SKILL_3_VISUAL_STORYTELLING = `
### SKILL 3 — VISUAL STORYTELLING
For each narration line, ask: "What is the ONE image that represents what I just said?"
Not two images. Not a diagram. One image.
Build the visual around that one image.
Supporting elements (annotations, labels) support the ONE image. They do not compete with it.
`.trim();

const SKILL_4_EMOTIONAL_VOICE_DIRECTION = `
### SKILL 4 — EMOTIONAL VOICE DIRECTION
Set voice direction for each scene based on narration content:
- Problem revealed → emotion: "serious", speed: 0.92
- Fix delivered → emotion: "confident", speed: 1.0
- Punchline → emotion: "sarcastic", speed: 0.95, pauseBeforeMs: 400
- Building excitement → emotion: "excited", speed: 1.05
- Explaining steps → emotion: "calm", speed: 0.90

Punctuation controls micro-pauses:
"." → natural pause | "..." → 200ms pause | "—" → hard restart | "," → breathe, continue
`.trim();

const SKILL_5_SYNC_AWARENESS = `
### SKILL 5 — SYNC AWARENESS
Your 'triggersOnWord' values get resolved by the sync engine. Write them as natural descriptions:
{ "triggersOnWord": "retrieval" }  ← resolves to exact frame when "retrieval" is spoken
{ "triggersOnWord": "wrong" }      ← resolves to exact frame when "wrong" is spoken

For decorative/background elements with no word trigger:
{ "triggersOnWord": null, "entryFrame": 0 }  ← appears at scene start

DO NOT estimate entryFrame values. Set entryFrame to 0 for all triggered elements — the sync engine overrides them.
`.trim();

const SKILL_6_KINETIC_ARCHITECTURE = `
### SKILL 6 — SCENE ARCHITECTURE (kinetic)
Every kinetic scene follows this template:
LAYER 1 (z: 1) — Background Lottie/icon, opacity 0.15-0.25, scale 1.5-2.0, no text
LAYER 2 (z: 4) — Hero text, center/upper-center, LARGE, slams in at word 0  
LAYER 3 (z: 4) — Support text, lower-center, SMALL, appears 0.3s after hero settles
LAYER 4 (z: 5) — Sky accent on ONE word in hero or support, pulses gently
`.trim();

const SKILL_7_MOTION_ARCHITECTURE = `
### SKILL 7 — MOTION SCENE ARCHITECTURE
BEAT 1: Left node appears (problem/input)
BEAT 2: Right node appears (result/output)
BEAT 3: Arrow/thread draws between them (sky color)
BEAT 4: Center concept appears ON the thread
BEAT 5: Center concept highlights when narrator says its keyword
All timings from triggersOnWord, not frame estimates.
`.trim();

const SKILL_8_COMPLEXITY_HONESTY = `
### SKILL 8 — COMPLEXITY HONESTY
If a requested visual cannot be produced with available Remotion components:
1. Say so in a "productionNotes" field
2. Describe the effect in plain terms
3. Produce the closest viable alternative automatically
Never approximate a complex effect without flagging it.
`.trim();

const ALL_SKILLS = [
  SKILL_1_ASSET_AWARENESS,
  SKILL_2_NARRATION_QUALITY,
  SKILL_3_VISUAL_STORYTELLING,
  SKILL_4_EMOTIONAL_VOICE_DIRECTION,
  SKILL_5_SYNC_AWARENESS,
  SKILL_6_KINETIC_ARCHITECTURE,
  SKILL_7_MOTION_ARCHITECTURE,
  SKILL_8_COMPLEXITY_HONESTY,
].join("\n\n");

// ── Plan prompt ──

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
    section("Skills (follow these exactly)", ALL_SKILLS),
    section("Request", toJson(request)),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Generation instructions",
      [
        "Create a cinematic, professional-grade production plan.",
        "MANDATORY: Diverse Asset Usage. If the AssetManifest contains Lottie files (json) or specific VFX (whooshes, pops, rustles), you MUST use them.",
        "MANDATORY: Do not default to 'click.mp3' for everything. Match the SFX to the visual intent.",
        "MANDATORY: Visual flair. Use 'icon' kind for Lottie animations and 'image' for high-quality background/supporting visuals.",
        "MANDATORY: Multi-Voice Casting. Use different voice IDs (Stella, Benjamin, Marlowe, Leila) for different beats.",
        "MANDATORY: Spatial Complexity. Utilize 'anchor', 'scale', 'rotate', and 'zIndex' for every element.",
        "MANDATORY: Each scene MUST have a 'voiceDirection' object with emotion, speed, pauseBeforeMs, pauseAfterMs, emphasis.",
        "Respect the locked tone, brand, and color rules.",
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
        '      "narration": "string (max 12 words per sentence)",',
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

// ── Script prompt ──

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
    section("Skills (follow these exactly)", ALL_SKILLS),
    section("Request", toJson(request)),
    section("ApprovedPlan", toJson(plan)),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Output requirements",
      [
        "Generate a high-fidelity VideoScript v3.",
        "CRITICAL: Use 'triggersOnWord' instead of guessing 'entryFrame' values.",
        "Set entryFrame to 0 for all elements. The sync engine will override with exact STT timestamps.",
        "MANDATORY: Each scene MUST have a 'voiceDirection' object: { emotion, speed, pauseBeforeMs, pauseAfterMs, emphasis }",
        "MANDATORY: Use the AssetManifest. Search for Lottie animations matching the topic.",
        "MANDATORY: Professional Soundscape. Mix various VFX from the manifest.",
        "MANDATORY: Cinematic Motion. Use 'anchor', 'rotate', 'zIndex' for premium feel.",
        "MANDATORY: Emotional Narration. Pick voiceId from: Stella (bright), Benjamin (warm), Marlowe (deep), Leila (clear).",
        "If kind is 'icon', label MUST be the relative path to a Lottie .json file from the manifest.",
        "Only use supported visual element kinds: hero, support, annotation, card, label, thread, arrow, icon, lantern, library, image.",
        "Background icon elements should have opacity: 0.15-0.25, scale: 1.5-2.0, zIndex: 1.",
      ].join("\n"),
    ),
    section(
      "Required JSON shape (v3)",
      [
        "{",
        '  "version": 3,',
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
        '      "narration": "Max 12 words. Direct. Punchy.",',
        '      "voiceId": "Stella|Benjamin|Marlowe|Leila",',
        '      "emotion": "excited|confident|serious|calm|sarcastic",',
        '      "speed": 1.0,',
        '      "voiceDirection": {',
        '        "emotion": "confident",',
        '        "speed": 1.0,',
        '        "pauseBeforeMs": 0,',
        '        "pauseAfterMs": 200,',
        '        "emphasis": ["keyword"]',
        "      },",
        '      "wordTimestamps": [],',
        '      "audioDurationSeconds": 0,',
        '      "visual": {',
        '        "type": "kinetic|flow|diagram|text-only|icon|image",',
        '        "background": "light|dark|navy",',
        '        "elements": [',
        "          {",
        '            "id": "bg-icon",',
        '            "kind": "icon",',
        '            "label": "lottie/wired/some-file.json",',
        '            "position": { "x": "50%", "y": "40%" },',
        '            "anchor": "center-center",',
        '            "scale": 2.0,',
        '            "rotate": 15,',
        '            "zIndex": 1,',
        '            "entryFrame": 0,',
        '            "triggersOnWord": null,',
        '            "opacity": 0.20',
        "          },",
        "          {",
        '            "id": "hero",',
        '            "kind": "hero",',
        '            "label": "Hero text.",',
        '            "position": { "x": "50%", "y": "42%" },',
        '            "anchor": "center-center",',
        '            "scale": 1.0,',
        '            "zIndex": 4,',
        '            "entryFrame": 0,',
        '            "triggersOnWord": "keyword",',
        '            "isTeal": true',
        "          }",
        "        ]",
        "      },",
        '      "sfxCues": [{ "id": "cue-id", "file": "vfx/whoosh_soft.mp3", "frame": 0, "triggersOnWord": null, "volume": 0.15, "durationFrames": 12 }]',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
    ),
  ].join("\n\n");
};
