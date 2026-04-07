# PLAN.md — Project Studio 2.0
## Full Rebuild Plan for Claude Opus

**READ THIS ENTIRE FILE BEFORE TOUCHING A SINGLE FILE.**
This is the director's bible. Every decision you make traces back to a rule here.

---

## WHO YOU ARE

You are the lead engineer and creative director of Project Studio.
Your name is Lens.
You are rebuilding this system to produce videos that are **professionally synced, emotionally voiced, and visually coherent**.
The current system generates videos where audio and visuals are misaligned, voices are flat, and the output looks like a draft.
Your job is to fix that. Completely.

---

## THE CORE PROBLEM (read this three times)

The current system has one fatal flaw that causes everything else to fail:

**It guesses when words are spoken. It never actually knows.**

The current `entryFrame` calculation is:
```
entryFrame = wordIndex * 12
```
This assumes 2.5 words per second. The actual TTS output may be 1.8 wps or 3.4 wps. The voice pauses on commas. The voice rushes through connectors. The system has no idea. So visuals appear at the wrong time. Always.

**The fix:** Generate audio FIRST. Then transcribe it with Voxtral (STT). Get exact millisecond timestamps for every word. Build the Remotion composition from those timestamps. Not estimates. Timestamps.

This is the entire rebuild in one paragraph.

---

## THE ARCHITECTURE — BEFORE vs AFTER

### BEFORE (broken)
```
Topic → LLM script → TTS audio → Remotion (guesses timing) → MP4
                                              ↑
                                    [sync is wrong here]
```

### AFTER (correct)
```
Topic → LLM script → TTS audio (per scene, emotional) → STT timestamps
                                                              ↓
                                               Remotion (exact frame mapping)
                                                              ↓
                                                            MP4 ✓
```

---

## PHASE 1 — PACKAGES TO ADD/CHANGE

### Add these packages:

```bash
npm install @xenova/transformers          # Whisper.js — local STT for word timestamps
npm install fluent-ffmpeg                 # audio manipulation, trim, normalize
npm install ffmpeg-static                 # bundled ffmpeg binary
npm install sharp                         # image processing for assets
npm install @lottiefiles/toolkit-js       # Lottie color manipulation programmatically
npm install node-fetch                    # for Mistral streaming TTS
npm install p-limit                       # concurrency control for parallel scene audio
npm install cli-progress                  # real progress bars in CLI
npm install boxen                         # styled boxes for CLI output
npm install figlet                        # ASCII art for CLI logo
npm install gradient-string               # color gradients for CLI
npm install conf                          # persistent CLI settings/config storage
npm install open                          # open file in system (open rendered video)
```

### Change these:

- `inquirer` → **keep** but add `@inquirer/prompts` for better UX
- `ink` → **keep** but restructure StudioApp into proper screen components
- `ora` → **keep** for spinners
- Remove `elevenlabs` — replaced by Mistral Voxtral TTS
- Remove `@anthropic-ai/sdk` — not used (Gemini + OpenRouter only)

### Keep these (already correct):
- `remotion` 4.0.290 + all `@remotion/*` packages
- `@google/generative-ai`
- `openai` (for OpenRouter compatibility)
- `@iconify/react`
- `zod`
- `chalk`

---

## PHASE 2 — THE SYNC ENGINE (most important)

### 2.1 Audio Generation — Per Scene, Per Emotion

Current: one TTS call for the whole video, flat delivery.
New: one TTS call per scene, with voice, emotion, speed.

**File:** `src/core/audio.ts` — full rewrite

```typescript
// Each scene gets its own audio file
// scenes/scene-1_voice.mp3
// scenes/scene-2_voice.mp3
// etc.

// Mistral TTS call per scene:
{
  model: "voxtral-mini-tts-2603",
  input: scene.narration,
  voice_id: env.MISTRAL_VOICE_ID,  // temy's cloned voice
  response_format: "mp3",
  // These control delivery:
  speed: scene.speed ?? 1.0,        // 0.8 = slower/serious, 1.1 = faster/excited
}
```

**Emotion → speed mapping:**
```
"excited"    → speed: 1.05, slight upward pitch feel
"confident"  → speed: 1.0  (default)
"serious"    → speed: 0.92
"calm"       → speed: 0.88
"sarcastic"  → speed: 0.95, slight pause before punchline
```

Since Voxtral TTS uses voice-as-instruction (no emotion tags), control delivery through:
1. **Punctuation in narration** — add "..." for pause, "—" for hard stop
2. **Speed parameter** — maps to emotion
3. **Voice reference** — temy's voice clone carries his natural delivery

### 2.2 Word Timestamp Extraction — The Sync Engine

**File:** `src/core/sync.ts` — new file

After generating each scene's audio, run Voxtral STT (transcribe) to get word-level timestamps.

```typescript
// Call Mistral Voxtral transcription
POST https://api.mistral.ai/v1/audio/transcriptions
{
  model: "voxtral-small-2507",  // fast STT model
  file: audioFile,
  response_format: "verbose_json",  // returns timestamps
  timestamp_granularities: ["word"]  // word-level precision
}

// Response gives:
{
  words: [
    { word: "RAG", start: 0.0,  end: 0.32 },
    { word: "gives", start: 0.35, end: 0.58 },
    { word: "the", start: 0.60, end: 0.68 },
    { word: "LLM", start: 0.70, end: 0.98 },
    ...
  ]
}
```

Then convert to frames:
```typescript
const wordToFrame = (startSeconds: number, fps: number) =>
  Math.round(startSeconds * fps)

// scene-2 word timestamps:
{ word: "RAG",    frame: 0  }  // appears at exact frame 0
{ word: "gives",  frame: 10 }  // appears at exact frame 10
{ word: "LLM",    frame: 21 }  // appears at exact frame 21
```

**This replaces ALL `entryFrame` estimates in the JSON.**
The LLM no longer guesses timing. Timestamps come from actual audio.

### 2.3 The Updated Pipeline

**File:** `src/core/pipeline.ts` — updated

```
STEP 1: Generate script JSON (LLM)
STEP 2: Generate per-scene audio (Mistral TTS) — parallel with p-limit(3)
STEP 3: Transcribe each scene audio (Mistral STT) — parallel
STEP 4: Map word timestamps → entryFrame for every visual element
STEP 5: Reconcile scene durations from actual audio lengths
STEP 6: Recolor all Lottie files for this video
STEP 7: Render with Remotion
STEP 8: Save everything to videos/[slug]/
```

---

## PHASE 3 — LLM SCRIPT GENERATION (what to fix)

### 3.1 The Problem With Current Prompts

The current prompts ask the LLM to make a `VideoScript` JSON with `entryFrame` values.
Those values are meaningless because the LLM doesn't know when words are spoken.
After the rebuild, `entryFrame` values in the LLM-generated JSON are IGNORED.
They get replaced by the sync engine in Phase 2.

So the LLM's job is NOT to calculate timing.
The LLM's job is:
1. Write narration that works as a script
2. Decide which visual CONCEPT to show for each beat of the narration
3. Choose which assets to use (from the manifest)
4. Set the emotional delivery of each scene

### 3.2 What the LLM Needs to Know (inject into every prompt)

**The LLM must receive:**

```
A. ASSET MANIFEST — what files actually exist in /attachments/
   Every Lottie file, every music file, every SFX file, every character PNG.
   With descriptions from their .json companion files (created by the Asset Architect).
   
B. RENDERER CAPABILITIES — what Remotion can actually render
   Supported element kinds, animation types, position presets.
   What is production-ready vs experimental.
   
C. SYNC RULES — how timing works
   LLM sets conceptual timing hints ("appears when narrator says X word").
   System converts to exact frames using STT timestamps.
   LLM should specify WHICH WORD triggers each element, not which frame.
   
D. COLOR PALETTE — locked
   Navy, Sky, Red, Smoke, Mauve. One Sky per scene. One Red per video.
   
E. TONE RULES — temy's voice
   From tone.md. Non-negotiable.
```

### 3.3 The New JSON Format — Word-Triggered Timing

Instead of:
```json
{ "entryFrame": 42 }
```

The LLM generates:
```json
{ "triggersOnWord": "database", "entryDelayMs": 50 }
```

The sync engine finds "database" in the STT timestamps, converts to frame, adds the delay offset.

This means the LLM can write naturally:
> "Show the database icon when I say 'database'"

And the system handles the exact frame. No guessing.

### 3.4 Scene-Level Voice Direction

Each scene in the JSON must have:
```json
{
  "id": "scene-1",
  "narration": "Your LLM. Confident. Also making things up.",
  "voiceDirection": {
    "emotion": "sarcastic",
    "speed": 0.95,
    "pauseBeforeMs": 0,
    "pauseAfterMs": 300,
    "emphasis": ["Confident", "making things up"]
  }
}
```

Pause is injected as SSML breaks in the TTS call.
Emphasis words get slight re-reads if STT confidence is low.

### 3.5 Asset Matching in Prompts

The LLM receives the full asset manifest and must reference assets by their actual relative path:
```json
{
  "kind": "icon",
  "label": "lottie/wired/wired-lineal-19-magnifier.json",  ← actual path from manifest
  "triggersOnWord": "search"
}
```

If no matching asset exists for a concept, the LLM uses `"kind": "label"` or `"kind": "hero"` instead.
It NEVER invents a path that doesn't exist in the manifest.

---

## PHASE 4 — THE ASSET SYSTEM

### 4.1 Asset Architect (already exists, improve it)

**File:** `attachments/New/initializing.md` — already built, keep it.

When temy drops files into `attachments/New/`, the system:
1. Runs ffprobe on audio files
2. Moves to correct folder
3. Creates `.json` companion with description, duration, mood, bestFor
4. Removes from New/

Add to package.json scripts:
```json
"init-assets": "tsx src/scripts/initializeAssets.ts"
```

### 4.2 Automatic Lottie Recoloring

**File:** `src/scripts/recolorLotties.ts` — already exists, run it on every video generation

Add to pipeline:
```typescript
// Before render, after script is finalized:
await recolorAllLotties(projectRoot)
```

Also add a `scripts.recolor` npm command for manual runs.

### 4.3 Asset Intelligence for the LLM

Build a rich manifest with Lottie descriptions:
```json
{
  "relativePath": "lottie/wired/wired-lineal-19-magnifier.json",
  "label": "Magnifier / Search",
  "description": "Animated magnifying glass. Loop animation. Use for: search, lookup, find, query, retrieve.",
  "keywords": ["search", "find", "lookup", "query", "retrieve", "database", "scan"],
  "palette": "recolored",
  "durationSeconds": 2.4,
  "loop": true
}
```

The LLM uses `keywords` to match narration words to assets automatically.

---

## PHASE 5 — THE CLI (full rebuild)

### 5.1 Logo + Header

On every startup, show:
```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║    ██████╗ ███████╗                               ║
║    ██╔══██╗██╔════╝                               ║
║    ██████╔╝███████╗                               ║
║    ██╔═══╝ ╚════██║                               ║
║    ██║     ███████║                               ║
║    ╚═╝     ╚══════╝   STUDIO  1.0                ║
║                                                   ║
║    AI Video Production System                     ║
║    by temy                                        ║
╚═══════════════════════════════════════════════════╝
```
Use `figlet` for the PS text and `gradient-string` for color.

### 5.2 Screen Structure (Ink)

```
StudioApp
├── HomeScreen         → main menu
├── GenerateScreen     → wizard: topic → type → format → duration → emotion → confirm
├── DraftReviewScreen  → show scenes, narration, assets, approve/edit
├── PipelineScreen     → live pipeline progress with step-by-step status
├── LibraryScreen      → all videos, play/re-render/delete
├── AssetsScreen       → inventory, missing, initialize new
├── DoctorScreen       → system health, provider status, voice check
├── SettingsScreen     → persistent config (provider choice, default type/format, voice)
└── HelpScreen         → quick reference for all commands
```

### 5.3 Generate Wizard

Step 1: Topic input (text input)
Step 2: Video type (select: kinetic / motion / slides / animation)
Step 3: Format (select: reel / video / square)
Step 4: Duration (select: 30s / 60s / 90s)
Step 5: Overall emotion (select: energetic / calm / technical / sarcastic)
Step 6: Sarcasm (toggle)
Step 7: Confirm or add notes

Each step shows a preview of what's been chosen so far.

### 5.4 Pipeline Screen

Real-time progress with step status icons:
```
╔══════════════════════════════╗
║  Generating: "How RAG Works" ║
╠══════════════════════════════╣
║  ✓  Script generated         ║
║  ✓  Scene 1 audio            ║
║  ✓  Scene 2 audio            ║
║  ↻  Scene 3 audio...         ║
║  ·  Word timestamps          ║
║  ·  Lottie recoloring        ║
║  ·  Remotion render          ║
╚══════════════════════════════╝
   Progress: ████████░░░░ 64%
```

### 5.5 Settings Screen (persistent with `conf`)

Settings stored in `~/.project-studio/config.json`:
```
- Primary LLM Provider (gemini / openrouter)
- Primary LLM Model
- Default video type
- Default format
- Default duration
- Series name
- Auto-open video after render (toggle)
- Sarcasm default (on/off)
```

---

## PHASE 6 — REMOTION COMPONENTS (what to fix)

### 6.1 The Word-Reveal Sync Component

**New component:** `src/components/text/SyncedWordReveal.tsx`

Instead of estimating timing, this component reads from a timestamps array passed as a prop:

```tsx
interface WordTimestamp {
  word: string
  frame: number        // exact frame from STT
  endFrame: number     // when word ends (for highlighting)
}

const SyncedWordReveal = ({
  timestamps,
  highlightColor = COLORS.sky,
  style
}: {
  timestamps: WordTimestamp[]
  highlightColor?: string
  style?: CSSProperties
}) => {
  const frame = useCurrentFrame()
  
  return (
    <span>
      {timestamps.map((wt, i) => {
        const isVisible = frame >= wt.frame
        const isActive  = frame >= wt.frame && frame <= wt.endFrame
        return (
          <span key={i} style={{
            opacity: isVisible ? 1 : 0,
            color: isActive ? highlightColor : 'inherit',
            transition: 'opacity 0.05s',
            marginRight: '0.2em'
          }}>
            {wt.word}
          </span>
        )
      })}
    </span>
  )
}
```

### 6.2 Element Sync — triggersOnWord

All visual elements get an `appearsAtFrame` calculated from STT timestamps:

```typescript
// After STT transcription:
const resolveElementFrames = (elements, wordTimestamps, fps) => {
  return elements.map(el => {
    if (el.triggersOnWord) {
      const match = wordTimestamps.find(w => 
        w.word.toLowerCase().includes(el.triggersOnWord.toLowerCase())
      )
      return {
        ...el,
        entryFrame: match 
          ? Math.round(match.start * fps) + (el.entryDelayMs ? Math.round(el.entryDelayMs / (1000/fps)) : 0)
          : el.entryFrame ?? 0
      }
    }
    return el
  })
}
```

### 6.3 Scene Duration from Audio

Each scene's `durationInFrames` must come from the actual audio file length, not the script JSON:

```typescript
const sceneFrames = Math.round(audioDurationSeconds * fps) + BUFFER_FRAMES
// BUFFER_FRAMES = 9 (0.3s at 30fps) — visual lingers briefly after audio ends
```

### 6.4 Kinetic Scene Improvements

Current kinetic is just text slamming. Real kinetic videos (like your references) have:
- **Background depth layer** — blurred, subtle, abstract shape or icon at low opacity
- **Text position variety** — not always center. Sometimes left-aligned, sometimes right.
- **Scale contrast** — hero is BIG, support is small. The ratio matters.
- **Timing rhythm** — hero appears, pause 0.3s, support follows. Not simultaneous.

Add to `KineticScene.tsx`:
```tsx
// Stagger: support text appears 9 frames (0.3s) after hero settles
const heroSettleFrame = 8  // spring settles around frame 8
const supportStartFrame = heroEl.entryFrame + heroSettleFrame + 9
```

---

## PHASE 7 — THE LLM SKILLS SYSTEM (plan.md rules for the LLM)

This section defines how the LLM is prompted for every video.
Think of these as the "skills" injected into the system prompt.

### SKILL 1 — ASSET AWARENESS

Before generating any script, the LLM reads the full asset manifest.
For every narration line, it finds the best matching Lottie animation by keyword.
It never references a file path that isn't in the manifest.

```
ASSET MATCHING LOGIC:
1. Extract nouns from the narration line
2. Search Lottie manifest keywords for matches
3. If match found: use kind "icon" with the Lottie path
4. If no match: use kind "label" with text only
5. Never invent a path
```

### SKILL 2 — NARRATION QUALITY

Narration must follow tone.md exactly. But also:
- Every scene narration must stand alone. If you remove scenes 1 and 2, scene 3 still makes sense.
- The last line of every video must be a closed door. Not a question. A statement.
- No sentence longer than 12 words. If a concept needs more: split it across two scenes.

Narration rhythm test (apply before finalizing):
> Read the narration out loud. If you breathe in the same spot twice: one sentence is too long. Split it.

### SKILL 3 — VISUAL STORYTELLING

For each narration line, the LLM asks:
> "What is the ONE image that represents what I just said?"

Not two images. Not a diagram. One image.
Then it builds the visual around that one image.

The supporting elements (annotations, labels) support the ONE image.
They do not compete with it.

### SKILL 4 — EMOTIONAL VOICE DIRECTION

The LLM sets voice direction for each scene based on the narration content:

```
Narration reveals a problem → emotion: "serious", speed: 0.92
Narration delivers the fix  → emotion: "confident", speed: 1.0
Narration is the punchline  → emotion: "sarcastic", speed: 0.95, pauseBeforeMs: 400
Narration builds excitement → emotion: "excited", speed: 1.05
Narration explains steps    → emotion: "calm", speed: 0.90
```

Punctuation in narration controls micro-pauses:
- `"."` → natural pause (STT handles)
- `"..."` → add 200ms before next word in TTS
- `"—"` → hard stop, restart energy
- `","` → breathe, continue

### SKILL 5 — SYNC AWARENESS

The LLM knows its `triggersOnWord` values get resolved by the sync engine.
So it writes them as natural descriptions, not frame numbers:

```json
{ "triggersOnWord": "retrieval" }  ← resolves to exact frame
{ "triggersOnWord": "wrong"     }  ← resolves to exact frame
{ "triggersOnWord": "library"   }  ← resolves to exact frame
```

For elements with no specific word trigger (background layers, decorative):
```json
{ "triggersOnWord": null, "entryFrame": 0 }  ← appears at scene start
```

### SKILL 6 — SCENE ARCHITECTURE (kinetic)

Every kinetic scene follows this exact template:

```
LAYER 1 (z: 1)  — Background Lottie/icon, opacity 0.15-0.25, scale 1.5-2.0, no text
LAYER 2 (z: 4)  — Hero text, center/upper-center, LARGE, slams in at word 0
LAYER 3 (z: 4)  — Support text, lower-center, SMALL, appears 0.3s after hero settles
LAYER 4 (z: 5)  — Sky accent on ONE word in hero or support, pulses gently
```

The background Lottie creates depth without competing.
The hero text is the message.
The support is the context.
The sky accent is the memory hook.

### SKILL 7 — MOTION SCENE ARCHITECTURE

Motion scenes show systems and flows:

```
BEAT 1: Left node appears (problem/input)
BEAT 2: Right node appears (result/output)
BEAT 3: Arrow/thread draws between them (left to right, sky color)
BEAT 4: Center concept appears ON the thread, slightly above it
BEAT 5: Center concept highlights (sky) when narrator says its keyword
```

All timings from triggersOnWord, not frame estimates.

### SKILL 8 — COMPLEXITY HONESTY

If a requested visual cannot be produced with the available Remotion components:
1. Say so explicitly: "This cannot be auto-generated."
2. Describe the effect in plain terms
3. Tell temy which tool to use manually
4. Produce the closest viable alternative automatically

Never approximate a complex effect without telling temy it's an approximation.

---

## PHASE 8 — THE FULL FILE CHANGES

### Files to REWRITE completely:

| File | Why |
|---|---|
| `src/core/audio.ts` | Per-scene TTS + STT timestamps |
| `src/core/sync.ts` | NEW — word timestamp engine |
| `src/core/pipeline.ts` | New step order: TTS → STT → frame mapping → render |
| `src/core/generation.ts` | New JSON format with `triggersOnWord` |
| `src/core/prompts.ts` | New prompt system with 8 skills injected |
| `src/studio/StudioApp.tsx` | Full screen system with logo, settings, library |
| `src/components/text/NarrationOverlay.tsx` | Use SyncedWordReveal |
| `src/Root.tsx` | Support new script v3 with timestamps |
| `establish.md` | Updated for new pipeline |

### Files to ADD:

| File | What it does |
|---|---|
| `src/core/sync.ts` | STT call + timestamp extraction + frame mapping |
| `src/components/text/SyncedWordReveal.tsx` | Word reveal from exact timestamps |
| `src/scripts/initializeAssets.ts` | Asset Architect runner |
| `src/scripts/recolorLotties.ts` | Already exists, add CLI hook |
| `src/scripts/testRender.ts` | Quick 10-frame test render to verify setup |
| `src/studio/screens/*.tsx` | Individual screen components |
| `plan.md` | This file |

### Files to UPDATE (not rewrite):

| File | What changes |
|---|---|
| `src/types.ts` | Add `triggersOnWord`, `voiceDirection`, timestamps schema |
| `src/runtime.ts` | Add `wordTimestamps` to SceneConfig |
| `src/core/rules.ts` | Add 8 skill blocks to rules digest |
| `src/core/assets.ts` | Add keyword search + Lottie description reading |
| `src/core/capabilities.ts` | Add `syncEngine: "voxtral-stt"` to manifest |
| `package.json` | Add new packages |
| `.env.example` | Already correct (Gemini + Mistral) |
| `remotion.config.ts` | Already correct |
| `rules/audio/voice.md` | Update for Voxtral TTS, per-scene |
| `rules/sync.md` | Update for STT-based timing |
| `establish.md` | Update step 3 for new pipeline |

### Files to DELETE:

| File | Why |
|---|---|
| `src/scripts/render.ts` | Merge into CLI |
| `src/scripts/generate.ts` | Replaced by CLI pipeline |

---

## PHASE 9 — IMPLEMENTATION ORDER

Do these in this exact order. Each phase builds on the previous.

### Step 1 — Install packages
```bash
npm install @xenova/transformers fluent-ffmpeg ffmpeg-static sharp \
  @lottiefiles/toolkit-js p-limit cli-progress boxen figlet \
  gradient-string conf open @inquirer/prompts
```

### Step 2 — Update `src/types.ts`
Add `triggersOnWord`, `wordTimestamps`, `voiceDirection` to SceneConfig and VisualElement schemas.
Add `SyncedScript` version 3 type.

### Step 3 — Build `src/core/sync.ts`
- `generateSceneAudio(scene)` — calls Mistral TTS per scene with voice direction
- `transcribeSceneAudio(audioPath)` — calls Voxtral STT, returns WordTimestamp[]
- `resolveElementFrames(elements, timestamps, fps)` — maps triggersOnWord → entryFrame
- `reconcileSceneDurations(script, audioDurations)` — sets real scene lengths

### Step 4 — Update `src/core/audio.ts`
Use the new sync.ts functions. Remove old single-file TTS.

### Step 5 — Update `src/core/prompts.ts`
Inject all 8 skills. Add asset manifest with keyword descriptions. Remove entryFrame instructions (replaced by triggersOnWord).

### Step 6 — Update `src/core/generation.ts`
New JSON format. triggersOnWord instead of entryFrame. voiceDirection on each scene.

### Step 7 — Update `src/core/pipeline.ts`
New step order: script → TTS (parallel) → STT (parallel) → frame mapping → lottie recolor → render

### Step 8 — Build `src/components/text/SyncedWordReveal.tsx`
Exact-frame word reveal from timestamp arrays.

### Step 9 — Update Remotion components
NarrationOverlay, KineticScene, MotionScene to use exact timestamps.

### Step 10 — Rebuild CLI (StudioApp)
Logo → Screens → Settings → Library → Pipeline progress

### Step 11 — Test with a 30s kinetic video
Topic: "What is RAG?" — verify sync, verify emotional delivery, verify Lottie colors.

### Step 12 — Update establish.md + rules files

---

## PHASE 10 — QUESTIONS TO ASK TEMY BEFORE IMPLEMENTING

Before writing any code, ask temy these:

1. **Mistral API key** — do you have one set up for Voxtral TTS AND Voxtral STT?
   (They use the same key but different endpoints)

2. **Voice clone** — is your voice cloned on Mistral already?
   If not: go to studio.mistral.ai → Voice → Clone → upload 10 seconds of your voice → copy the voice ID → put in `.env` as `MISTRAL_VOICE_ID`

3. **Lottie library** — how many Lottie files do you have in `/attachments/lottie/`?
   If zero: run `npm run init-assets` after downloading a starter pack from LottieFiles.com

4. **GPU/CPU** — are you running this on a machine with at least 8GB RAM?
   The Whisper STT (fallback) needs RAM. Remotion render needs RAM.

5. **Node version** — confirm `node --version` is >= 18.

---

## PHASE 11 — ALTERNATIVE APPROACHES (Lens's opinion)

If you want to go even further, here are three directions beyond this plan:

### Alternative A — Pre-recorded voice segments (highest quality)
Record temy's actual voice for each video. Auto-transcribe with Voxtral STT. Build Remotion around real recordings. Zero TTS artifacts. The videos sound like real temy, not AI temy.

How: add a `record-scene` command that opens the mic, records, saves to `/attachments/recordings/[slug]/[scene-id].mp3`.

### Alternative B — SRT caption file → frame mapping
Instead of Voxtral STT, use ffmpeg to force an SRT subtitle file from Whisper locally (`@xenova/transformers`). More control, works offline, no API cost. Slower.

### Alternative C — Abandon Remotion for motion rendering, use CanvasKit
For complex animations (character rigging, path following), Remotion's React-DOM renderer has limits. Skia CanvasKit via `@remotion/skia` enables real GPU-accelerated drawing. Worth adding for the character animations specifically.

**Recommendation:** Implement the main plan first. Add Alternative C for `animation` type videos when character expressions need to be smoother.

---

## WHAT THE OUTPUT SHOULD LOOK LIKE

After this rebuild, a 30-second kinetic video should have:

- Voice that pauses on commas, rushes on excitement, slows on sarcasm
- Every word on screen appears within ±1 frame of when it's spoken
- Background Lottie animations in brand colors (auto-recolored)
- Hero text: large, slams in, bounces to settle
- Support text: follows hero by 0.3s, slides up
- Sky accent: pulses on the ONE keyword per scene
- One Red word in the entire video — the punchline
- Hard cuts between scenes (kinetic type)
- Brand mark: bottom right, always visible
- Outro fade: smooth, 0.6s

That's professional. That's what the reference videos look like.

---

## HOW TO USE THIS PLAN

1. Read the entire plan (you already are — good)
2. Ask temy the Phase 10 questions
3. Install Phase 1 packages
4. Work through Phase 9 steps in order
5. Test at Step 11 before proceeding
6. Never skip a step

When you're confused about a decision, check the rules in Phase 7.
When you're confused about timing, everything traces to Phase 2.
When you're confused about the CLI, check Phase 5.

The answer is always in this file. If it isn't, ask Lens.

---

## APPENDIX A — NEW JSON FORMAT (v3)

```json
{
  "version": 3,
  "status": "draft",
  "topic": "How RAG Works",
  "slug": "how-rag-works",
  "type": "kinetic",
  "format": "reel",
  "durationSeconds": 30,
  "sarcasm": true,
  "mode": "production",
  "quality": "production",
  "scenes": [
    {
      "id": "scene-1",
      "narration": "Your LLM is confident. It's also frequently fictional.",
      "voiceDirection": {
        "emotion": "sarcastic",
        "speed": 0.95,
        "pauseAfterMs": 200
      },
      "wordTimestamps": [],
      "audioDurationSeconds": 0,
      "visual": {
        "type": "kinetic",
        "background": "dark",
        "elements": [
          {
            "id": "bg-icon",
            "kind": "icon",
            "label": "lottie/wired/wired-lineal-19-magnifier.json",
            "position": { "x": "50%", "y": "40%" },
            "anchor": "center-center",
            "scale": 2.0,
            "rotate": 15,
            "zIndex": 1,
            "triggersOnWord": null,
            "entryFrame": 0,
            "opacity": 0.20
          },
          {
            "id": "hero",
            "kind": "hero",
            "label": "Very confident.",
            "position": { "x": "50%", "y": "42%" },
            "anchor": "center-center",
            "scale": 1.0,
            "zIndex": 4,
            "triggersOnWord": "confident",
            "isTeal": true
          },
          {
            "id": "support",
            "kind": "support",
            "label": "Also frequently fictional.",
            "position": { "x": "50%", "y": "62%" },
            "anchor": "center-center",
            "zIndex": 4,
            "triggersOnWord": "fictional",
            "isRed": true
          }
        ]
      },
      "sfxCues": [
        {
          "id": "scene-1-click",
          "file": "vfx/click.mp3",
          "triggersOnWord": null,
          "frame": 0,
          "volume": 0.15
        }
      ]
    }
  ]
}
```

After sync engine runs, `wordTimestamps` and `entryFrame` get populated from STT.

---

## APPENDIX B — VOXTRAL API QUICK REFERENCE

**TTS (text to speech):**
```
POST https://api.mistral.ai/v1/audio/speech
Authorization: Bearer {MISTRAL_API_KEY}
{
  "model": "voxtral-mini-tts-2603",
  "input": "narration text here",
  "voice_id": "{MISTRAL_VOICE_ID}",
  "response_format": "mp3"
}
Response: binary MP3
```

**STT (speech to text with timestamps):**
```
POST https://api.mistral.ai/v1/audio/transcriptions
Authorization: Bearer {MISTRAL_API_KEY}
Content-Type: multipart/form-data
{
  "model": "voxtral-small-2507",
  "file": <mp3 binary>,
  "response_format": "verbose_json",
  "timestamp_granularities": ["word"]
}
Response: {
  "text": "full transcript",
  "words": [
    { "word": "confident", "start": 0.82, "end": 1.15 }
  ]
}
```

---

## APPENDIX C — THE SYNC MATH

```typescript
const FPS = 30
const BUFFER_MS = 50  // visual appears 50ms before word for feel

// Convert word start time to frame
const wordStartFrame = (startSec: number) =>
  Math.max(0, Math.round((startSec - BUFFER_MS/1000) * FPS))

// Scene duration from audio
const sceneFrames = (audioDurationSec: number) =>
  Math.round(audioDurationSec * FPS) + 9  // 9 frame (0.3s) linger

// Verify sync in test render:
// If frame X shows word "database" and audio says "database" at X ± 2 frames: PASS
// If diff > 2 frames: re-check STT response parsing
```

---

**Version:** Plan 2.0
**Author:** Lens
**For:** Claude Opus — Project Studio rebuild
**Stack:** Remotion 4 + Gemini/OpenRouter + Mistral Voxtral TTS/STT + Ink CLI
