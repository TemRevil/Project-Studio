import type { AssetManifest, GenerationPlan, GenerationRequest, RendererCapabilitiesManifest, RulesDigest } from "../types";
import { resolveColorPalette, resolveVideoStyle } from "../studio/presets";

const section = (title: string, body: string) => [`## ${title}`, body.trim()].join("\n");

const toJson = (value: unknown) => JSON.stringify(value, null, 2);

const getWordCountTargets = (durationSeconds: number) => {
  const wordsPerSecond = 2.4;
  const totalWords = Math.round(durationSeconds * wordsPerSecond);
  const sceneCount = durationSeconds <= 30 ? 3 : durationSeconds <= 60 ? 5 : 7;
  const wordsPerScene = Math.round(totalWords / sceneCount);
  const sceneDuration = Number((durationSeconds / sceneCount).toFixed(1));

  return {
    wordsPerSecond,
    totalWords,
    sceneCount,
    wordsPerScene,
    sceneDuration,
  };
};

const wordCountTarget = (durationSeconds: number) => {
  const { wordsPerSecond, totalWords, sceneCount, wordsPerScene } = getWordCountTargets(durationSeconds);
  const verificationLines = Array.from({ length: sceneCount }, (_, index) => `Scene ${index + 1}: __ words`);

  return `
WORD COUNT CONTRACT (non-negotiable):
- Target duration: ${durationSeconds} seconds
- Required total narration: ${totalWords} words minimum
- Scenes: ${sceneCount}
- Words per scene: ${wordsPerScene} minimum
- Before finalizing: count every word in every narration line
- If total is under ${totalWords}: add more sentences until you reach it
- Voice speaks at ${wordsPerSecond.toFixed(1)} words/second. Math: ${totalWords} words / ${wordsPerSecond.toFixed(1)} = ${Math.round(totalWords / wordsPerSecond)}s

VERIFICATION STEP (required):
Count your words here before output:
${verificationLines.join("\n")}
Total: __ words (must be >= ${totalWords})
  `;
};

const sceneTimingContract = (durationSeconds: number) => {
  const { sceneCount, wordsPerScene, sceneDuration } = getWordCountTargets(durationSeconds);

  return `
Each scene's narration determines its actual duration. The sync engine measures this precisely.

For a ${durationSeconds}-second video with ${sceneCount} scenes:
- Target words per scene: ${wordsPerScene}
- Target scene duration: about ${sceneDuration}s each
- Words per second (Mistral TTS): about 2.4

If a scene has fewer than ${Math.max(8, wordsPerScene - 5)} words, that beat will run short and the full video will miss the duration target.
Count the words for EACH scene before submitting.
  `;
};

const NARRATION_DEPTH_EXAMPLES = `
TOPIC: "How Attention Mechanisms Work"

SCENE 1 (Hook, 26 words):
"Every word in a sentence affects every other word differently.
Attention mechanisms let the model weigh those relationships.
Before attention, language models read words in order like a typewriter."

SCENE 2 (Problem, 28 words):
"Reading left to right works for sentences. It fails for paragraphs.
By the time the model reads 'bank' at the end, it has forgotten
whether it was about money or a river from the beginning."

SCENE 3 (Mechanism, 30 words):
"Attention creates a weighted map of every word against every other word.
The model learns that 'bank' and 'river' belong together more than 'bank' and 'money'
in this specific sentence, not from rules, but from patterns in billions of examples."

SCENE 4 (Result, 25 words):
"The result is a model that reads the whole sentence at once, not sequentially.
Context from the beginning still matters at the end.
Long documents stopped being a problem."

SCENE 5 (Punchline, 18 words):
"Attention didn't make language models smarter.
It made them stop reading like someone who forgets the beginning of every sentence."
`.trim();

const SKILL_1_ASSET_AWARENESS = `
### SKILL 1 - ASSET AWARENESS
Before generating any script, read the full asset manifest.
For every narration line, find the best matching Lottie animation by keyword.
Never reference a file path that is not in the manifest or ActiveAssetInventory.

ASSET MATCHING LOGIC:
1. Extract nouns from the narration line
2. Search Lottie manifest keywords for matches
3. If match found: use kind "icon" with the Lottie path as label
4. If no match: use kind "label" with text only
5. NEVER invent a path that does not exist
`.trim();

const SKILL_2_NARRATION_QUALITY = `
### SKILL 2 - NARRATION QUALITY
- Every scene narration must stand alone
- The last line of every video must be a closed door, not a question
- No sentence longer than 12 words. If a concept needs more, split it into 2-3 sentences.
- Narration rhythm: read it out loud. If you breathe in the same spot twice, split the sentence.
`.trim();

const SKILL_3_VISUAL_STORYTELLING = `
### SKILL 3 - VISUAL STORYTELLING
For each narration line, ask: "What is the ONE image that represents what I just said?"
Not two images. Not a diagram. One image.
Build the visual around that one image.
Supporting elements support the ONE image. They do not compete with it.
`.trim();

const SKILL_4_EMOTIONAL_VOICE_DIRECTION = `
### SKILL 4 - EMOTIONAL VOICE DIRECTION
Set voice direction for each scene based on narration content:
- Problem revealed -> emotion: "serious", speed: 0.92
- Fix delivered -> emotion: "confident", speed: 1.0
- Punchline -> emotion: "sarcastic", speed: 0.95, pauseBeforeMs: 400
- Building excitement -> emotion: "excited", speed: 1.05
- Explaining steps -> emotion: "calm", speed: 0.90

Punctuation controls micro-pauses:
"." -> natural pause | "..." -> 200ms pause | "-" -> hard restart | "," -> breathe, continue
`.trim();

const SKILL_5_SYNC_AWARENESS = `
### SKILL 5 - SYNC AWARENESS
Your triggersOnWord values get resolved by the sync engine. Write them as natural descriptions:
{ "triggersOnWord": "retrieval" }  <- resolves to exact frame when "retrieval" is spoken
{ "triggersOnWord": "wrong" }      <- resolves to exact frame when "wrong" is spoken

For decorative or background elements with no word trigger:
{ "triggersOnWord": null, "entryFrame": 0 }  <- appears at scene start

Do not estimate entryFrame values. Set entryFrame to 0 for all triggered elements. The sync engine overrides them.
`.trim();

const SKILL_6_KINETIC_ARCHITECTURE = `
### SKILL 6 - SCENE ARCHITECTURE (kinetic)
Every kinetic scene follows this template:
LAYER 1 (z: 1) - Background Lottie/icon, opacity 0.15-0.25, scale 1.5-2.0, no text
LAYER 2 (z: 4) - Hero text, center or upper-center, large, slams in at word 0
LAYER 3 (z: 4) - Support text, lower-center, small, appears after the hero settles
LAYER 4 (z: 5) - Sky accent on ONE word in hero or support, pulses gently
`.trim();

const SKILL_7_MOTION_ARCHITECTURE = `
### SKILL 7 - MOTION SCENE ARCHITECTURE
BEAT 1: Left node appears (problem or input)
BEAT 2: Right node appears (result or output)
BEAT 3: Arrow or thread draws between them (sky color)
BEAT 4: Center concept appears on the thread
BEAT 5: Center concept highlights when narrator says its keyword
All timings come from triggersOnWord, not frame estimates.
`.trim();

const SKILL_8_COMPLEXITY_HONESTY = `
### SKILL 8 - COMPLEXITY HONESTY
If a requested visual cannot be produced with available Remotion components:
1. Say so in a productionNotes field
2. Describe the effect in plain terms
3. Produce the closest viable alternative automatically
Never approximate a complex effect without flagging it.
`.trim();

const SKILL_9_REAL_CONTENT = `
### SKILL 9 - REAL CONTENT CREATION + WORD COUNT CONTRACT

WORD COUNT CONTRACT (MANDATORY - CHECK BEFORE OUTPUT)
The duration target is set by the request. Your narration MUST fill that duration.

30s -> minimum 72 words total (24 words x 3 scenes)
45s -> minimum 108 words total (27 words x 4 scenes)
60s -> minimum 144 words total (29 words x 5 scenes)
90s -> minimum 216 words total (31 words x 7 scenes)

Count every word in every narration before submitting.
If total is under the minimum, add more sentences until you hit the target.
One sentence is never enough. Each scene needs 2-3 complete sentences.

CONTENT STANDARD:
Every narration line must be specific to THIS topic.
If a line could appear in a video about ANY tech topic, rewrite it.

PER-SCENE NARRATION STRUCTURE:
Sentence 1: State the core fact
Sentence 2: Add the consequence or cause
Sentence 3: Add the concrete detail that makes it stick

THE SCENE ARC:

Scene 1 - HOOK (contradiction or surprising fact)
  Formula: "[Common belief]. [The contradiction]. [Why you should care]."
  Word target: 20-28 words

Scene 2 - THE PROBLEM (make the pain real)
  Formula: "[What breaks]. [How it breaks]. [Who gets hurt by this]."
  Word target: 22-30 words

Scene 3 - THE MECHANISM (explain HOW, not just WHAT)
  Formula: "[What the solution actually does]. [The specific technical insight]. [Why that matters]."
  Word target: 24-32 words

Scene 4 - THE RESULT (concrete outcome)
  Formula: "[Before]. [After]. [The number or comparison that proves it]."
  Word target: 20-28 words

Scene 5 - THE PUNCHLINE (closed observation, not a call to action)
  Formula: "[The reframe]. [The counterintuitive insight]."
  Word target: 16-22 words

BANNED PHRASES (auto-reject if found):
- "It's important to note..."
- "This technology enables..."
- "[Topic] has revolutionized..."
- "In conclusion..."
- Any sentence under 8 words unless it is the final punchline beat
- Any narration that could apply to any other tech topic

HOOK FORMATS - Pick ONE per video:

Type A - Contradiction:
"[Widely held belief]. [The thing that breaks it]. [The implication]."

Type B - Surprising Number:
"[Specific number] [what it measures]. [The unexpected part of that number].
[What it reveals about the system]."

Type C - The Wrong Assumption:
"Everyone thinks [common belief]. That is not how [topic] actually works.
Here is what is happening under the hood."

Type D - The Specific Failure:
"[Specific scenario where the old approach fails].
[Why it fails exactly]. [What fills the gap]."
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
  SKILL_9_REAL_CONTENT,
].join("\n\n");

export const buildPlanPrompt = ({
  request,
  capabilities,
  assets,
  rules,
  activeAssetInventory,
}: {
  request: GenerationRequest;
  capabilities: RendererCapabilitiesManifest;
  assets: AssetManifest;
  rules: RulesDigest;
  activeAssetInventory: string;
}) => {
  const palette = resolveColorPalette(request.paletteKey, request.customPalette);
  const style = resolveVideoStyle(request.videoStyle);

  return [
    "You are Lens, the production planner for Project Studio.",
    "Your job is to create a production-safe scene plan that only uses renderer capabilities that exist today.",
    "Return ONLY valid JSON.",
    "Do not use markdown fences.",
    "",
    section("Skills (follow these exactly)", ALL_SKILLS),
    section("WordCountContract", wordCountTarget(request.durationSeconds)),
    section("ActiveAssetInventory", activeAssetInventory),
    section("NarrationDepthExamples", NARRATION_DEPTH_EXAMPLES),
    section("SceneTimingContract", sceneTimingContract(request.durationSeconds)),
    section("Request", toJson(request)),
    section(
      "TopicContext",
      `
The topic is: "${request.topic}"

Before generating, think:
1. What is the single most important thing to know about this topic?
2. What is the common wrong assumption people have about this topic?
3. What is the simplest real-world analogy that explains it?
4. What is the "aha moment", the one insight that makes it click?

Build your script around the aha moment. Everything else serves that moment.
      `,
    ),
    section(
      "VideoStyle",
      `
Active style: "${style.name}"
Tone: ${style.toneHint}
Pacing: ${style.pacingHint}
      `,
    ),
    section(
      "ActiveColorPalette",
      `
The active color palette for this video is: "${palette.name}"
- Main background (kinetic dark bg): ${palette.mainBackground}
- Primary text (on dark): ${palette.primaryText}
- Accent color (ONE element per scene): ${palette.accentColor}
- Emphasis color (ONE per video): ${palette.emphasisColor}
- Surface color (cards, light bg): ${palette.surfaceColor}
- Secondary color (borders, mid-layer): ${palette.secondaryColor}

IMPORTANT: Use these exact hex values in the JSON. Never use palette nicknames in the output.
      `,
    ),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Generation instructions",
      [
        "Create a cinematic, professional-grade production plan.",
        "MANDATORY: Diverse Asset Usage. If the asset inventory contains Lottie files or specific VFX, use them intentionally.",
        "MANDATORY: Match the SFX to the visual intent. Do not default to click.mp3 for everything.",
        "MANDATORY: Visual flair. Use kind 'icon' for Lottie animations and 'image' for supporting visuals when they exist.",
        "MANDATORY: Multi-Voice Casting. Use different voice IDs (Stella, Benjamin, Marlowe, Leila) for different beats.",
        "MANDATORY: Spatial Complexity. Utilize anchor, scale, rotate, and zIndex for every element.",
        "MANDATORY: Each scene MUST have a voiceDirection object with emotion, speed, pauseBeforeMs, pauseAfterMs, emphasis.",
        "MANDATORY: Each scene narration must be 2-3 complete sentences and satisfy the word-count contract.",
        "If no asset matches a concept, use kind 'label' or kind 'hero'. Never invent a file path.",
        "Respect the locked tone, brand, and color rules.",
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
        '      "narration": "2-3 sentences, specific, must satisfy the word-count contract",',
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
  activeAssetInventory,
}: {
  request: GenerationRequest;
  plan: GenerationPlan;
  capabilities: RendererCapabilitiesManifest;
  assets: AssetManifest;
  rules: RulesDigest;
  activeAssetInventory: string;
}) => {
  const palette = resolveColorPalette(request.paletteKey, request.customPalette);
  const style = resolveVideoStyle(request.videoStyle);

  return [
    "You are Lens, the production script generator for Project Studio.",
    "Return ONLY valid JSON with exact fields and safe values.",
    "Do not wrap the response in markdown fences.",
    "",
    section("Skills (follow these exactly)", ALL_SKILLS),
    section("WordCountContract", wordCountTarget(request.durationSeconds)),
    section("ActiveAssetInventory", activeAssetInventory),
    section("NarrationDepthExamples", NARRATION_DEPTH_EXAMPLES),
    section("SceneTimingContract", sceneTimingContract(request.durationSeconds)),
    section("Request", toJson(request)),
    section(
      "TopicContext",
      `
The topic is: "${request.topic}"

Before generating, think:
1. What is the single most important thing to know about this topic?
2. What is the common wrong assumption people have about this topic?
3. What is the simplest real-world analogy that explains it?
4. What is the "aha moment", the one insight that makes it click?

Build your script around the aha moment. Everything else serves that moment.
      `,
    ),
    section(
      "VideoStyle",
      `
Active style: "${style.name}"
Tone: ${style.toneHint}
Pacing: ${style.pacingHint}
      `,
    ),
    section(
      "ActiveColorPalette",
      `
The active color palette for this video is: "${palette.name}"
- Main background (kinetic dark bg): ${palette.mainBackground}
- Primary text (on dark): ${palette.primaryText}
- Accent color (ONE element per scene): ${palette.accentColor}
- Emphasis color (ONE per video): ${palette.emphasisColor}
- Surface color (cards, light bg): ${palette.surfaceColor}
- Secondary color (borders, mid-layer): ${palette.secondaryColor}

IMPORTANT: Use these exact hex values in the JSON. Never use palette nicknames in the output.
      `,
    ),
    section("ApprovedPlan", toJson(plan)),
    section("RendererCapabilitiesManifest", toJson(capabilities)),
    section("AssetManifest", toJson(assets)),
    section("RulesDigest", toJson(rules)),
    section(
      "Output requirements",
      [
        "Generate a high-fidelity VideoScript v3.",
        "CRITICAL: Use triggersOnWord instead of guessing entryFrame values.",
        "Set entryFrame to 0 for all elements. The sync engine will override with exact STT timestamps.",
        "MANDATORY: Each scene MUST have a voiceDirection object: { emotion, speed, pauseBeforeMs, pauseAfterMs, emphasis }.",
        "MANDATORY: Use the ActiveAssetInventory and AssetManifest. Never invent a file path.",
        "MANDATORY: Professional Soundscape. Mix various VFX from the manifest when they exist.",
        "MANDATORY: Cinematic Motion. Use anchor, rotate, and zIndex for premium feel.",
        "MANDATORY: Emotional Narration. Pick voiceId from Stella, Benjamin, Marlowe, or Leila.",
        "MANDATORY: Each scene narration must be 2-3 complete sentences with a concrete fact, consequence, and memorable detail.",
        "Count the words scene by scene before you output. If the total misses the contract, expand the narration.",
        "If kind is 'icon', label MUST be the relative path to a Lottie .json file from the manifest.",
        "If no asset matches a concept, use kind 'label' or kind 'hero'.",
        "Only use supported visual element kinds: hero, support, annotation, card, label, thread, arrow, icon, lantern, library, image.",
        "Background icon elements should have opacity 0.15-0.25, scale 1.5-2.0, and zIndex 1.",
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
        '      "narration": "2-3 sentences. Specific. Must meet the scene word target.",',
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
        '            "label": "lottie/wired/example.json",',
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
