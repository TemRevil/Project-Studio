# PLAN.md — Project Studio 2.1
## Targeted Fix + Enhancement Plan

**This plan is the result of reviewing the current codebase after the 2.0 rebuild.**
**Read every section. Do fixes in the exact order listed.**

---

## CURRENT STATE ASSESSMENT

The 2.0 rebuild was significant. What's already working:
- ✅ Per-scene TTS audio generation (Mistral)
- ✅ STT sync engine (`src/core/sync.ts`) — architecture is correct
- ✅ `triggersOnWord` system in types and generation
- ✅ `SyncedWordReveal` component
- ✅ CLI with screen navigation (HomeScreen, SettingsScreen)
- ✅ `voiceDirection` system with emotion/speed
- ✅ Settings with `conf` persistence
- ✅ Header with gradient logo
- ✅ `wordTimestamps` in schema and runtime

What is broken or incomplete:
- ❌ STT fails with 400 — wrong model name in `sync.ts`
- ❌ Mistral TTS rejects `speed` field — not in their API schema
- ❌ `npm start` fails — Remotion entrypoint not registered properly
- ❌ FFmpeg crashes at 70% — memory `malloc` failure on Windows
- ❌ Error JSON files committed to repo (`error_trace.json`, `final_trace.json`, `mistral_error.json`)
- ❌ Camera movements are flat — kinetic videos have no cinematic movement between scenes
- ❌ LLM generates placeholder content — "looks simple, it usually isn't" generic output
- ❌ No color palette in CLI settings
- ❌ No video style selection in generate wizard
- ❌ Music asset missing causes silent render failure instead of warning

---

## FIX 1 — REPO CLEANUP (do this first)

### 1.1 Remove committed error logs

Delete these files from the repo:
- `error_trace.json`
- `final_trace.json`
- `mistral_error.json`

### 1.2 Update `.gitignore`

Add these lines to `.gitignore`:
```
# Error traces and debug logs
*_trace.json
mistral_error.json
error_*.json
*.log
*.error.json

# Runtime and temp files
attachments/runtime/
output/
.remotion/

# Videos and audio outputs
videos/
*.mp4
*.mp3

# IDE
.cursor/
.windsurf/
.vscode/
```

---

## FIX 2 — REMOTION ENTRYPOINT (npm start broken)

**Problem:** `npm start` fails with "No Remotion entrypoint was found."

**Root cause:** `remotion.config.ts` exists but Remotion can't find the root automatically on some setups.

**Fix in `remotion.config.ts`:**
```typescript
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setAudioCodec('aac');
Config.setConcurrency(1);   // IMPORTANT: reduce from null to 1 (fixes FFmpeg malloc)
Config.setPublicDir('attachments');
Config.setEntryPoint('./src/Root.tsx');  // ADD THIS LINE
```

**Also update `package.json` scripts:**
```json
"start": "remotion studio src/Root.tsx",
"preview": "remotion studio src/Root.tsx",
```

---

## FIX 3 — MISTRAL TTS: REMOVE `speed` PARAMETER

**Problem:** Mistral TTS API returns 422 with `"Extra inputs are not permitted"` for the `speed` field.

**File:** `src/core/audio.ts`

Remove `speed` from the TTS request body entirely. Mistral Voxtral does NOT accept a speed parameter.

Control pacing ONLY through punctuation in the narration text:

```typescript
const applyPunctuationForEmotion = (text: string, direction?: VoiceDirection): string => {
  if (!direction) return text;
  let narration = text;

  // Map emotion → punctuation style (no speed param)
  switch (direction.emotion) {
    case "sarcastic":
      // Add slight pause before punchlines via ellipsis
      narration = narration.replace(/\. /g, "... ");
      break;
    case "serious":
      // Shorter sentences feel more serious; add periods for natural breathing
      narration = narration.replace(/,/g, ".");
      break;
    case "excited":
      // Remove hesitation pauses
      narration = narration.replace(/\.\.\./g, ".");
      break;
    case "calm":
      // Add commas for breathing
      if (!narration.includes(",")) {
        const words = narration.split(" ");
        if (words.length > 5) {
          const mid = Math.floor(words.length / 2);
          words[mid] = words[mid] + ",";
          narration = words.join(" ");
        }
      }
      break;
  }

  if (direction.pauseBeforeMs > 200) narration = "... " + narration;
  if (direction.pauseAfterMs > 200) narration = narration.trimEnd() + " ...";

  return narration;
};
```

**Update `generateSceneAudio` — remove speed from request body:**
```typescript
const response = await axios.post(
  "https://api.mistral.ai/v1/audio/speech",
  {
    model: MISTRAL_TTS_MODEL,
    input: narrationText,
    voice_id: voiceId,
    response_format: "mp3",
    // DO NOT include speed — not supported by Mistral TTS API
  },
  { ... }
);
```

Also remove `speed` from `EMOTION_SPEED_MAP` usage in audio.ts — it's unused now. Keep it in types for future use when/if Mistral adds it.

---

## FIX 4 — STT MODEL NAME (sync fails with 400)

**Problem:** `sync.ts` uses `mistral-small-latest` as the STT model. That's a chat model, not the transcription model.

**File:** `src/core/sync.ts`

```typescript
// WRONG (causes 400):
const MISTRAL_STT_MODEL = "mistral-small-latest";

// CORRECT:
const MISTRAL_STT_MODEL = "voxtral-mini-2507";
```

The correct Mistral transcription models are:
- `voxtral-mini-2507` — fast, good for short clips
- `voxtral-small-2507` — more accurate (use this if mini fails)

Also, the STT endpoint may need the `language` field. Update the form:
```typescript
form.append("file", fs.createReadStream(audioPath), {
  filename: path.basename(audioPath),
  contentType: "audio/mpeg",
});
form.append("model", MISTRAL_STT_MODEL);
form.append("response_format", "verbose_json");
// Remove timestamp_granularities if it causes issues — try without first
```

If `verbose_json` with word timestamps isn't supported yet, fall back to `json` format and use word-level estimation from the full transcript:
```typescript
// Fallback if word timestamps not in response:
if (!data.words || data.words.length === 0) {
  // Parse full transcript and estimate word positions from duration
  const words = data.text.trim().split(/\s+/);
  const duration = await getAudioDurationSeconds(audioPath);
  const avgWordDuration = duration / words.length;
  return words.map((word, i) => ({
    word,
    start: i * avgWordDuration,
    end: (i + 1) * avgWordDuration,
    frame: Math.round(i * avgWordDuration * FPS),
    endFrame: Math.round((i + 1) * avgWordDuration * FPS),
  }));
}
```

---

## FIX 5 — FFMPEG MEMORY CRASH (render fails at 70%)

**Problem:** `x264 [error]: malloc of size 11744448 failed` on Windows at ~70% render.

This is a known issue with Remotion + h264 on Windows with high concurrency. 

**Fix 1 — `remotion.config.ts`:**
```typescript
Config.setConcurrency(1);   // Single thread — solves the malloc
```

**Fix 2 — `src/core/rendering.ts`:**
```typescript
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  concurrency: 1,          // Override to 1 for stability
  outputLocation,
  inputProps: { script: parsedScript, runtimeMedia },
  onProgress: ({ progress }) => onProgress?.({ stage: "Rendering video", progress }),
  // Add these for Windows stability:
  chromiumOptions: {
    disableWebSecurity: false,
    gl: "angle",             // Better GPU compatibility on Windows
  },
  jpegQuality: 80,           // Slightly lower quality = less memory pressure
});
```

**Fix 3 — Music asset failure is fatal when it shouldn't be:**

In `src/core/pipeline.ts`, the music warning is currently thrown as an error in some paths. Fix it to always be non-fatal:

```typescript
// In buildDraftPackage, change this:
if (!project.assetManifest.categories.music.some((asset) => asset.relativePath === script.backgroundMusic?.file)) {
  warnings.push("No background music asset is available. The render will proceed without music.");
}

// And in VideoComposition, ensure musicFile being null doesn't crash:
// Already handled — just verify backgroundMusic is optional in the schema
```

---

## FIX 6 — CAMERA AND SCENE TRANSITIONS (the kinetic videos need life)

**The problem:** Kinetic scenes just hard-cut with no camera movement. The reference videos temy showed have:
- Scenes that slide/slam in from off-screen
- Text that moves across the canvas with velocity
- Perspective-like zoom effects on transitions

### 6.1 Scene Entry Types (new in `KineticScene.tsx`)

Add scene entry animation variants. Each scene chooses one:

```typescript
export type SceneEntryVariant = 
  | "slam-from-top"    // entire scene drops in from above
  | "slam-from-bottom" // scene rises from below
  | "slam-from-left"   // scene flies in from left
  | "slam-from-right"  // scene flies in from right
  | "zoom-in"          // scene scales from 0.8 → 1.0 with spring
  | "instant"          // no entry (for smash cut effect)

// In SceneConfig:
entryVariant?: SceneEntryVariant;
```

### 6.2 Update `SceneRenderer.tsx` — Camera Wrapper

Wrap every scene in a camera container that applies entry animation:

```tsx
export const SceneCamera = ({ 
  children, 
  sceneDuration, 
  entryVariant = "slam-from-bottom",
  isDark = false
}: { 
  children: React.ReactNode;
  sceneDuration: number;
  entryVariant?: SceneEntryVariant;
  isDark?: boolean;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entry spring — fast settle (kinetic feel)
  const entrySpring = spring({
    frame,
    fps,
    config: { stiffness: 380, damping: 28, mass: 0.7 }
  });

  // Slow push-in across scene duration (cinematic lean)
  const pushIn = interpolate(frame, [0, sceneDuration], [1.0, 1.04], {
    extrapolateRight: "clamp"
  });

  // Exit pull-back (last 10 frames)
  const exitScale = interpolate(
    frame,
    [sceneDuration - 10, sceneDuration],
    [1.04, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cameraScale = frame > sceneDuration - 10 ? exitScale : pushIn;

  // Entry offset based on variant
  const entryOffset = (() => {
    const progress = interpolate(entrySpring, [0, 1], [1, 0]);
    const distance = 80; // px
    switch (entryVariant) {
      case "slam-from-top":    return { x: 0, y: -distance * progress };
      case "slam-from-bottom": return { x: 0, y: distance * progress };
      case "slam-from-left":   return { x: -distance * progress, y: 0 };
      case "slam-from-right":  return { x: distance * progress, y: 0 };
      case "zoom-in":          return { x: 0, y: 0 };
      case "instant":          return { x: 0, y: 0 };
      default:                 return { x: 0, y: 0 };
    }
  })();

  const entryZoom = entryVariant === "zoom-in"
    ? interpolate(entrySpring, [0, 1], [0.85, 1.0])
    : 1.0;

  return (
    <AbsoluteFill style={{
      transform: `
        translateX(${entryOffset.x}px) 
        translateY(${entryOffset.y}px) 
        scale(${cameraScale * entryZoom})
      `,
      transformOrigin: "center center",
    }}>
      {children}
    </AbsoluteFill>
  );
};
```

### 6.3 Scene Entry Rotation (kinetic only)

For kinetic videos, alternate scene entry direction per scene index:
```typescript
const getEntryVariant = (sceneIndex: number, totalScenes: number): SceneEntryVariant => {
  if (sceneIndex === 0) return "slam-from-bottom"; // First scene: rises
  const variants: SceneEntryVariant[] = [
    "slam-from-left",
    "slam-from-right",
    "slam-from-top",
    "slam-from-bottom",
  ];
  return variants[sceneIndex % variants.length];
};
```

The LLM can also set `entryVariant` in the script JSON to override this default.

### 6.4 Text Slam Improvement

Current: hero text slams in as a block. 

Better: hero text slams in word by word with slight stagger and velocity:

```tsx
// In KineticScene.tsx KineticLine component
// For "slam" variant:
// Word 0 → entryFrame
// Word 1 → entryFrame + 4 (1/8 second after)
// Word 2 → entryFrame + 8
// Each word slams from slightly above (not just scale)

const wordEntryFrame = (wordIndex: number, baseFrame: number) => 
  baseFrame + (wordIndex * 4); // 4-frame stagger = fast kinetic feel

// The slam spring for each word:
const slamConfig = { stiffness: 500, damping: 18, mass: 0.5 }; // Very fast
```

### 6.5 Add to `SceneConfig` schema in `types.ts`:
```typescript
// In SceneConfigSchema:
entryVariant: z.enum([
  "slam-from-top", "slam-from-bottom", "slam-from-left", 
  "slam-from-right", "zoom-in", "instant"
]).optional(),
```

---

## FIX 7 — LLM CONTENT QUALITY (most important)

**The problem:** The LLM generates placeholder content like "looks simple, it usually isn't" instead of real educational content. This is because the prompts don't give the LLM enough context about what REAL content looks like.

### 7.1 The Missing Skill — SKILL 9: REAL CONTENT CREATION

Add this as Skill 9 to `src/core/prompts.ts`:

```typescript
const SKILL_9_REAL_CONTENT = `
### SKILL 9 — REAL CONTENT CREATION (MOST IMPORTANT)

You are creating SHORT-FORM EDUCATIONAL CONTENT for developers and tech people.
The person watching has maybe 30 seconds. Every word has to EARN ITS PLACE.

THE GOLDEN RULE: If someone asks "What is RAG?", write what RAG ACTUALLY IS.
Not "RAG is important." Not "RAG looks simple."
ACTUAL CONTENT: what it does, why it matters, the one thing that makes it click.

HOOK FORMULA (scene 1 MUST follow this):
Pick one of these proven formats:
- CONTRADICTION: "Your LLM memorized the internet. It still doesn't know what happened last Tuesday."
- PROBLEM FIRST: "Every LLM hallucinates. RAG is the only known fix that actually works."
- SURPRISING FACT: "The model isn't getting smarter. It's getting a library card."
- DIRECT CHALLENGE: "You've been using AI wrong. Here's why."

SCENE CONTENT RULES:
Scene 1 → Hook (makes viewer stop scrolling — 5 seconds max)
Scene 2 → Problem (here's why this matters or hurts)
Scene 3 → Solution (here's the fix — the core concept)
Scene 4 → How it works (one mechanism, explained simply)
Scene 5 → Why it matters (the payoff — the so what)

NARRATION WRITING RULES:
1. Write like you're explaining to a smart friend, not a classroom
2. Use concrete nouns: "database", "LLM", "query" — not "the system", "it", "this"
3. Every scene narration should be completable with a specific visual
4. Never use passive voice in narration
5. If it sounds like a textbook: rewrite it
6. The last scene MUST be a closed observation, not a call to action

BANNED CONTENT:
- "It's important to understand..."
- Generic filler phrases
- Lists that could be in any video ("First... Second... Third...")
- Anything that could apply to ANY topic (not specific to the user's topic)
- Abstract descriptions with no concrete anchor

EXAMPLE — Good vs Bad:

Topic: "What is RAG"
BAD Scene 1: "RAG stands for Retrieval-Augmented Generation. It's important in AI."
GOOD Scene 1: "Your LLM finished training in 2023. It has no idea what happened since."

BAD Scene 2: "RAG solves the problem of hallucination."
GOOD Scene 2: "It hallucinates because it's guessing. RAG stops the guessing."

BAD Scene 3: "RAG retrieves relevant information."
GOOD Scene 3: "Before answering, it searches your data. Then it reads. Then it talks."

GOOD PUNCHLINE (last scene):
"The model didn't get smarter. You gave it a library card."
`.trim();
```

### 7.2 Add topic context injection

Before sending to the LLM, inject the actual topic context so the LLM knows what it's talking about:

In `buildScriptPrompt` and `buildPlanPrompt`, add:

```typescript
section("TopicContext", `
The topic is: "${request.topic}"

Before generating, think:
1. What is the single most important thing to know about this topic?
2. What is the common WRONG ASSUMPTION people have about this topic?
3. What is the simplest real-world analogy that explains it?
4. What is the "aha moment" — the one insight that makes it click?

Build your script around the AAAA moment. Everything else serves that moment.
`),
```

### 7.3 Better script examples in prompt

Replace the current JSON shape example with a real example in the prompt:

```typescript
section("EXAMPLE OF GOOD CONTENT (follow this pattern)", `
Topic: "What is RAG"

Scene 1 (Hook): 
  narration: "Your LLM finished training in 2023. It has no idea what happened since."
  emotion: "sarcastic"
  hero: "Training cutoff."
  support: "It stopped learning the day it launched."

Scene 2 (Problem):
  narration: "So when you ask about recent events, it guesses. Confidently."
  emotion: "serious"  
  hero: "Confident."
  support: "Also completely wrong."

Scene 3 (Solution):
  narration: "RAG fixes that. Before answering, it searches your docs first."
  emotion: "confident"
  hero: "Search first."
  support: "Then answer."

Scene 4 (Mechanism):
  narration: "Query goes in. Database lookup happens. Relevant chunks go back to the LLM."
  emotion: "calm"
  [flow diagram: Query → Vector DB → Context → LLM → Answer]

Scene 5 (Punchline):
  narration: "The model didn't get smarter. You gave it a library card."
  emotion: "sarcastic"
  hero: "Library card."
  support: "That's it. That's RAG."
`),
```

---

## FIX 8 — COLOR PALETTE IN CLI SETTINGS

The CLI settings screen (`src/studio/screens/SettingsScreen.tsx`) needs a color palette section.

### 8.1 Update `src/studio/config.ts`:

```typescript
export interface ColorPalette {
  name: string;                    // e.g. "Navy & Sky" (temy default)
  mainBackground: string;          // Used for dark kinetic bg
  primaryText: string;             // Text on dark bg
  accentColor: string;             // THE one accent (sky)
  emphasisColor: string;           // ONE use per video (red)
  surfaceColor: string;            // Light surfaces, cards
  secondaryColor: string;          // Borders, mid-layer
}

export const PALETTE_PRESETS: Record<string, ColorPalette> = {
  "navy-sky": {
    name: "Navy & Sky (Default)",
    mainBackground: "#16425b",
    primaryText: "#e7e7e7",
    accentColor: "#81c3d7",
    emphasisColor: "#ed1c24",
    surfaceColor: "#e7e7e7",
    secondaryColor: "#d5c5c8",
  },
  "dark-gold": {
    name: "Dark & Gold",
    mainBackground: "#1a1a2e",
    primaryText: "#eaeaea",
    accentColor: "#f0c040",
    emphasisColor: "#e05252",
    surfaceColor: "#f0f0f0",
    secondaryColor: "#c8b89a",
  },
  "forest-cream": {
    name: "Forest & Cream",
    mainBackground: "#1e3a2f",
    primaryText: "#f5f0e8",
    accentColor: "#7ec8a0",
    emphasisColor: "#e05252",
    surfaceColor: "#f5f0e8",
    secondaryColor: "#c8b89a",
  },
  "mono-red": {
    name: "Monochrome & Red",
    mainBackground: "#111111",
    primaryText: "#f0f0f0",
    accentColor: "#ff4444",
    emphasisColor: "#ff8800",
    surfaceColor: "#f0f0f0",
    secondaryColor: "#888888",
  },
  "custom": {
    name: "Custom...",
    mainBackground: "#16425b",
    primaryText: "#e7e7e7",
    accentColor: "#81c3d7",
    emphasisColor: "#ed1c24",
    surfaceColor: "#e7e7e7",
    secondaryColor: "#d5c5c8",
  }
};

export interface StudioConfig {
  // ... existing fields ...
  colorPalette: string;            // key from PALETTE_PRESETS
  customPalette: ColorPalette;     // used when colorPalette === "custom"
}
```

### 8.2 Pass palette to LLM

In `buildPlanPrompt` and `buildScriptPrompt`, inject the current color palette:

```typescript
// Get from config
const palette = PALETTE_PRESETS[config.colorPalette] ?? PALETTE_PRESETS["navy-sky"];

section("ActiveColorPalette", `
The active color palette for this video is: "${palette.name}"
- Main background (kinetic dark bg): ${palette.mainBackground}
- Primary text (on dark): ${palette.primaryText}
- Accent color (ONE element per scene): ${palette.accentColor}  ← this is "sky"
- Emphasis color (ONE per video): ${palette.emphasisColor}  ← this is "red"  
- Surface color (cards, light bg): ${palette.surfaceColor}
- Secondary color (borders, mid-layer): ${palette.secondaryColor}

IMPORTANT: Use these exact hex values in the JSON. Never use the preset names like "sky" or "navy" — use the actual hex codes from this palette. The palette can change between videos.
`),
```

### 8.3 Update `COLORS` in `src/runtime.ts` to be dynamic

```typescript
// Instead of hardcoded COLORS object, read from a palette file at runtime:
// src/runtime.ts
export const getActivePalette = (): typeof COLORS => {
  // During Remotion render, read from input props
  // Fallback to default palette
  return COLORS; // default — override via inputProps.palette in VideoComposition
};
```

---

## FIX 9 — VIDEO STYLE SELECTION IN WIZARD

Add a style selection step to the generate wizard.

### 9.1 Add styles to config

```typescript
export interface VideoStyle {
  name: string;
  description: string;
  defaultType: VideoType;
  defaultSarcasm: boolean;
  toneHint: string;   // injected into LLM prompt
  pacingHint: string; // injected into LLM prompt
}

export const VIDEO_STYLES: Record<string, VideoStyle> = {
  "kinetic-fast": {
    name: "Kinetic Fast (Default)",
    description: "Bold text, hard cuts, Instagram native feel",
    defaultType: "kinetic",
    defaultSarcasm: true,
    toneHint: "Fast, punchy, confident. Short sentences. Hard cuts. No fluff.",
    pacingHint: "3 scenes max for 30s. Each scene is ONE idea. No scene longer than 10 words narration.",
  },
  "explainer": {
    name: "Explainer",
    description: "Clear, structured, educational",
    defaultType: "slides",
    defaultSarcasm: false,
    toneHint: "Clear, structured, patient. Build understanding step by step.",
    pacingHint: "Allow scenes to breathe. Each scene can be 12-15 seconds for 30s total.",
  },
  "system-diagram": {
    name: "System Diagram",
    description: "Flow-based, technical, architecture-focused",
    defaultType: "motion",
    defaultSarcasm: false,
    toneHint: "Technical, precise, visual-first. Let the diagram do the work.",
    pacingHint: "Scenes are beats of the flow. Build the diagram progressively.",
  },
  "story": {
    name: "Story / Narrative",
    description: "Problem → conflict → resolution arc",
    defaultType: "kinetic",
    defaultSarcasm: true,
    toneHint: "Narrative arc. Start with a problem, end with an insight. Story structure.",
    pacingHint: "Act 1 (hook+problem): 40%. Act 2 (mechanism): 35%. Act 3 (payoff): 25%.",
  },
};
```

### 9.2 Add style step to generate wizard in `StudioApp.tsx`

Insert between "type" and "format" steps:

```tsx
if (generateStep === "style") {
  return (
    <>
      <Header />
      <Text color="cyan" bold>Video Style</Text>
      <SelectInput
        items={Object.entries(VIDEO_STYLES).map(([key, style]) => ({
          label: `${style.name} — ${style.description}`,
          value: key,
        }))}
        onSelect={(i) => {
          setVideoStyle(i.value);
          setType(VIDEO_STYLES[i.value].defaultType);
          setGenerateStep("format");
        }}
      />
      <Footer onBack={() => setGenerateStep("topic")} />
    </>
  );
}
```

### 9.3 Inject style into LLM prompt

```typescript
// In buildScriptPrompt, add:
const style = VIDEO_STYLES[request.videoStyle ?? "kinetic-fast"];
section("VideoStyle", `
Active style: "${style.name}"
Tone: ${style.toneHint}
Pacing: ${style.pacingHint}
`),
```

---

## FIX 10 — SCHEMA FIXES (`RendererCapabilitiesManifestSchema`)

The current `RendererCapabilitiesManifestSchema` in `src/types.ts` does NOT include the `syncEngine` field that `src/core/capabilities.ts` tries to add. This causes a Zod validation error.

**Fix in `src/types.ts`:**

```typescript
export const RendererCapabilitiesManifestSchema = z.object({
  version: z.literal(2),
  productionTypes: z.array(z.enum(PRODUCTION_VIDEO_TYPES)).min(1),
  experimentalTypes: z.array(z.enum(EXPERIMENTAL_VIDEO_TYPES)),
  visualElementKinds: z.array(z.enum(VISUAL_ELEMENT_KINDS)).min(1),
  visualTypes: z.array(z.enum(VISUAL_TYPES)).min(1),
  safePositions: z.array(z.object({
    name: nonEmptyString,
    x: nonEmptyString,
    y: nonEmptyString,
    useCase: nonEmptyString,
  })),
  supportedTransitions: z.record(z.array(nonEmptyString)),
  // ADD THIS:
  syncEngine: z.object({
    version: z.number(),
    features: z.array(z.string()),
  }).optional(),
  limitations: z.array(nonEmptyString),
});
```

---

## FIX 11 — VIDEO STYLE AND PALETTE IN `GenerationRequest`

Add to `GenerationRequestSchema` in `src/types.ts`:

```typescript
export const GenerationRequestSchema = z.object({
  topic: nonEmptyString,
  takeaway: z.string().trim().optional(),
  type: z.enum(VIDEO_TYPES),
  format: z.enum(VIDEO_FORMATS),
  durationSeconds: z.number().int().positive().max(90),
  sarcasm: z.boolean(),
  mode: z.enum(GENERATION_MODES).default("production"),
  quality: z.enum(QUALITY_MODES).default("production"),
  operator: OperatorOptionsSchema.default({}),
  // ADD THESE:
  videoStyle: z.string().optional(),    // key from VIDEO_STYLES
  paletteKey: z.string().optional(),    // key from PALETTE_PRESETS
});
```

---

## FIX 12 — `entryVariant` IN SCHEMA

Add to `SceneConfigSchema` in `src/types.ts`:

```typescript
entryVariant: z.enum([
  "slam-from-top", "slam-from-bottom", "slam-from-left",
  "slam-from-right", "zoom-in", "instant"
]).optional(),
```

And to `runtime.ts` `SceneConfig` interface:
```typescript
entryVariant?: "slam-from-top" | "slam-from-bottom" | "slam-from-left" | "slam-from-right" | "zoom-in" | "instant";
```

---

## IMPLEMENTATION ORDER

Do exactly in this order:

1. **FIX 1** — Delete error log files, update `.gitignore`
2. **FIX 2** — Fix Remotion entrypoint + `npm start`
3. **FIX 3** — Remove `speed` from Mistral TTS call
4. **FIX 4** — Fix STT model name to `voxtral-mini-2507`
5. **FIX 5** — Fix FFmpeg malloc with `concurrency: 1`
6. **FIX 10** — Fix schema mismatch (syncEngine field)
7. **FIX 11** — Add `videoStyle` + `paletteKey` to request schema
8. **FIX 12** — Add `entryVariant` to scene schema
9. **FIX 6** — Add camera movements (SceneCamera, entryVariant)
10. **FIX 7** — Add Skill 9 (real content creation) to prompts
11. **FIX 8** — Add color palette to config and settings screen
12. **FIX 9** — Add video style to config and generate wizard

**After each fix: run `npm run check` to verify TypeScript.**

**Test order:**
1. `npm start` — should open Remotion Studio
2. `npm run generate -- --topic "What is RAG" --type kinetic --duration 30 --skip-audio --dry-run` — should produce a script without crashing
3. `npm run generate -- --topic "What is RAG" --type kinetic --duration 30` — full pipeline with audio
4. `npm run studio` — should show the full CLI with screens

---

## APPENDIX A — SKILL INJECTION ORDER IN PROMPTS

All 9 skills, in this order, injected into both plan and script prompts:

```
SKILL 1 — ASSET AWARENESS         (never invent paths)
SKILL 2 — NARRATION QUALITY       (max 12 words per sentence)
SKILL 3 — VISUAL STORYTELLING     (one image per scene)
SKILL 4 — EMOTIONAL VOICE DIR     (emotion → punctuation)
SKILL 5 — SYNC AWARENESS          (triggersOnWord, not entryFrame)
SKILL 6 — KINETIC ARCHITECTURE    (4-layer structure)
SKILL 7 — MOTION ARCHITECTURE     (5-beat flow diagram)
SKILL 8 — COMPLEXITY HONESTY      (flag what you can't do)
SKILL 9 — REAL CONTENT CREATION   (actual educational value)
```

Skill 9 must come last so it's freshest in the model's attention window.

---

## APPENDIX B — LLM MODEL RECOMMENDATION

The current default is `gemini-2.5-flash`. For content quality (Skill 9), this is the right balance of speed and quality.

However, for the **plan generation step** (which sets the creative direction), consider using `gemini-2.5-pro` when available. The plan step is the most creative step; flash is fine for script generation which is more structured.

Update settings to allow separate models for plan vs script:
```typescript
export interface StudioConfig {
  // ...
  planModel: string;     // "gemini-2.5-pro" — creative direction
  scriptModel: string;   // "gemini-2.5-flash" — structured generation
}
```

---

## APPENDIX C — WHAT TO NOT CHANGE

These are working correctly. Do not touch:
- `src/core/storage.ts` — correct
- `src/core/providers.ts` — correct  
- `src/core/rules.ts` — correct
- `src/core/doctor.ts` — correct
- `src/components/text/SyncedWordReveal.tsx` — correct
- `src/scripts/recolorLotties.ts` — correct
- All files in `rules/` — correct
- `src/Root.tsx` — mostly correct (just add entrypoint to config)

---

**Version:** Plan 2.1  
**Author:** Lens  
**For:** AI IDE (Cursor/Windsurf) — targeted fixes  
**Status:** Apply in exact order. Test after each fix group.