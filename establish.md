# ESTABLISH.md — Project Studio 2.0
## Read this first. Always. Before anything else.

---

## WHAT YOU ARE SETTING UP

Project Studio is temy's personal AI video production system.
It works like Adobe After Effects — but instead of manual editing, an AI generates and renders everything.
Every video made in this system is saved permanently in /videos.
The system never resets. Old videos stay. New videos stack on top.

---

## STEP 0 — UNDERSTAND THE FULL STRUCTURE

```
ProjectStudio/
│
├── establish.md              ← YOU ARE HERE — read before anything
├── package.json              ← all npm dependencies
├── tsconfig.json
├── remotion.config.ts
├── .env.example              ← copy to .env and fill keys
│
├── rules/                    ← The ruleset — AI reads before every video
│   ├── operation.md          ← master pipeline + pre-production checklist
│   ├── prompting.md          ← how AI reads and uses the ruleset
│   ├── /types
│   │   ├── kinetic.md        ← bold text slam (main Instagram style)
│   │   ├── animation.md      ← character-driven illustrated scenes
│   │   ├── motion.md         ← abstract flow/diagram visualization
│   │   ├── slides_images_hybrid.md
│   ├── /format
│   │   └── formats.md        ← reel 9:16, video 16:9, square 1:1
│   ├── /lens
│   │   ├── camera.md
│   │   ├── transitions.md
│   │   ├── depth.md
│   │   └── timing.md
│   ├── /style
│   │   ├── colors.md         ← THE locked palette — never change
│   │   ├── papercraft.md
│   │   └── typography.md
│   ├── /audio
│   │   ├── voice.md
│   │   ├── music.md
│   │   └── sfx.md
│   └── /series
│       ├── tone.md           ← temy's voice — IMMUTABLE
│       ├── brand.md
│       └── character.md
│
├── src/                      ← Remotion source code
│   ├── Root.tsx
│   ├── types.ts              ← all types + COLORS + SHADOWS + SPRING
│   ├── compositions/
│   │   └── VideoComposition.tsx
│   └── components/
│       ├── scene/
│       │   ├── SceneRenderer.tsx     ← routes to correct type renderer
│       │   ├── KineticScene.tsx      ← bold text, dark bg
│       │   ├── MotionScene.tsx       ← flow diagrams
│       │   ├── SlidesScene.tsx       ← structured slides
│       │   ├── VisualLayer.tsx       ← papercraft elements
│       │   └── SceneTransition.tsx
│       ├── text/
│       │   └── NarrationOverlay.tsx
│       ├── graphics/
│       │   └── index.tsx             ← AnimatedArrow, DrawingLine, HandwritingPath, LottieAsset
│       ├── character/
│       │   └── Character.tsx
│       ├── audio/
│       │   └── SFXManager.tsx
│       └── ui/
│           └── index.tsx             ← BrandMark, PaperTexture, OutroFade, WordReveal
│
├── attachments/              ← All static assets (you fill these)
│   ├── characters/           ← idle.png, talking.png, thinking.png, pointing.png...
│   ├── music/                ← calm.mp3, curious.mp3, reveal.mp3, neutral.mp3
│   ├── icons/                ← SVG icons
│   ├── lottie/               ← .json files from LottieFiles.com
│   └── vfx/                  ← paper_rustle.mp3, whoosh_soft.mp3, teal_appear.mp3,
│                                pop_gentle.mp3, paper_fold.mp3, click.mp3,
│                                paper_texture.png
│
├── videos/                   ← ALL RENDERED VIDEOS — NEVER DELETE
│   └── [slug]/
│       ├── [slug]_reel.mp4
│       ├── [slug]_script.json
│       └── [slug]_voice.mp3
│
└── output/                   ← Temp render folder (current video)
```

---

## STEP 1 — PREREQUISITES

```bash
node --version    # must be >= 18.0.0
npm --version     # must be >= 9.0.0
```

---

## STEP 2 — INSTALL

```bash
cd ProjectStudio
npm install
```

Installs: Remotion v4 + all @remotion/* packages, Mistral TTS/STT via Transformers, Ink CLI, Iconify, TypeScript.

---

## STEP 3 — ENVIRONMENT

```bash
cp .env.example .env
```

Fill in .env:
```
MISTRAL_API_KEY=        ← console.mistral.ai (use for TTS and STT)
MISTRAL_VOICE_ID=       ← Mistral Studio → Voice Lab → Clone Voice → copy ID
SERIES_NAME=            ← your channel name
```

---

## STEP 4 — VERIFY

```bash
npm start
# Opens Remotion Studio at http://localhost:3000
# You should see the default RAG Explained preview
```

---

## STEP 5 — MAKE A VIDEO

```bash
npm run generate
```

Lens uses Ink in the terminal, then:
1. Generates script via Gemini or OpenRouter
2. Generates per-scene emotional voice via Mistral TTS
3. Extracts perfect timestamps via Mistral STT (Voxtral)
4. Renders MP4 via Remotion perfectly synced
5. Saves everything to /videos/[slug]/

CLI mode (skip questions):
```bash
npm run generate -- --topic "How DNS Works" --type kinetic --format reel --duration 30 --sarcasm
```

---

## STEP 6 — ASSETS TO ADD MANUALLY (one time)

### Minimum to ship first video (kinetic type — no character needed):
- `attachments/vfx/click.mp3` → Freesound.org
- `attachments/music/curious.mp3` → Pixabay.com or Uppbeat.io

### For animation type (needs character):
- `attachments/characters/idle.png`
- `attachments/characters/talking.png`
- `attachments/characters/thinking.png`
- `attachments/characters/pointing.png`
- Commission papercraft illustration or generate with Midjourney/Firefly
- Same dimensions, transparent background, all 4 expressions minimum

### For all types:
- `attachments/vfx/paper_texture.png` → Unsplash.com (search "paper texture")
- `attachments/vfx/paper_rustle.mp3` → Freesound.org
- `attachments/vfx/whoosh_soft.mp3` → Freesound.org
- `attachments/vfx/teal_appear.mp3` → Freesound.org
- `attachments/vfx/pop_gentle.mp3` → Freesound.org
- `attachments/vfx/paper_fold.mp3` → Freesound.org

### For Lottie animations (optional):
- Download .json files from LottieFiles.com (use free filter)
- Place in `attachments/lottie/`
- Good starter pack: arrow.json, checkmark.json, loading.json

---

## GRAPHICS — WHAT NEEDS DOWNLOADING VS WHAT'S BUILT IN

### ✅ Built in — zero downloads needed:
- Animated arrows → `AnimatedArrow` component (SVG stroke animation)
- Self-drawing lines → `DrawingLine` component
- Handwriting effect → `HandwritingPath` component
- 200,000+ icons → `@iconify/react` (already in package.json)

### 📥 Download once → /attachments/lottie/:
- Complex animations (confetti, checkmarks, loading spinners)
- Source: LottieFiles.com → free filter → download .json

### 📥 Download once → /attachments/vfx/:
- Sound effects (.mp3)
- Paper texture (.png)
- Source: Freesound.org, Zapsplat.com, Unsplash.com

---

## THE /videos FOLDER

Every rendered video gets its own permanent subfolder:

```
/videos/
  rag-explained/
    rag-explained_reel.mp4      ← final video
    rag-explained_script.json   ← reusable script
    rag-explained_voice.mp3     ← your cloned voice audio
  dns-explained/
    dns-explained_reel.mp4
    ...
```

NEVER delete /videos. It is your library.
If you make a v2: save as [slug]_v2.mp4 in the same subfolder.

---

## RULE READING ORDER (AI must follow every session)

1. establish.md       ← understand the system
2. rules/operation.md ← full pipeline + checklist
3. rules/prompting.md ← how to behave
4. rules/series/tone.md      ← temy's voice — IMMUTABLE
5. rules/series/brand.md     ← visual identity
6. rules/style/colors.md     ← palette — IMMUTABLE
7. rules/types/[type].md     ← kinetic / animation / motion / slides
8. rules/format/formats.md
9. rules/lens/camera.md
10. rules/lens/transitions.md
11. rules/lens/depth.md
12. rules/lens/timing.md

---

## COLOR PALETTE — LOCKED

| Name  | Hex       | Role                                    |
|-------|-----------|-----------------------------------------|
| Navy  | `#16425b` | Dark bg, text on light, depth           |
| Sky   | `#81c3d7` | Accent — one key element per scene      |
| Red   | `#ed1c24` | Emphasis — one use per entire video     |
| Smoke | `#e7e7e7` | Light background, surfaces              |
| Mauve | `#d5c5c8` | Mid-layer, borders, secondary elements  |

---

## VIDEO TYPES

| Type      | Look                          | Best for                          |
|-----------|-------------------------------|-----------------------------------|
| kinetic   | Bold text, dark bg, hard cuts | Instagram reels, quick facts      |
| animation | Illustrated character         | Concept explainers, tutorials     |
| motion    | Abstract flow diagrams        | System architecture, processes    |
| slides    | Structured bullet points      | Lists, comparisons, step-by-step  |
| images    | Photo bg + text overlay       | Real-world examples, trivia       |
| hybrid    | Mix of two types              | Long-form, varied content         |

---

## TROUBLESHOOTING

| Problem                    | Fix                                              |
|----------------------------|--------------------------------------------------|
| `npm start` fails          | Run `npm install` first                          |
| No audio generated         | Check ELEVENLABS_VOICE_ID in .env               |
| Render crashes             | Check Node >= 18, check /output folder exists   |
| Character not showing      | Add PNG files to /attachments/characters/       |
| Lottie not playing         | Check .json file in /attachments/lottie/        |
| Colors look wrong          | Check types.ts COLORS object — never hardcode   |

---

## SYSTEM INFO

Version: Project Studio 2.0
Palette: #16425b #81c3d7 #ed1c24 #e7e7e7 #d5c5c8
Model: gemini / openrouter
Voice: Mistral Voxtral (your cloned voice)
Renderer: Remotion v4.0.290

---

## SYNC RULES — NON-NEGOTIABLE

These rules apply to every single video, every type, no exceptions.

### 1. LOTTIE COLORS — ALWAYS MATCH THE VIDEO PALETTE

Before using any Lottie file, recolor it to match the video palette:
```
Navy  #16425b  → use for dark elements, outlines
Sky   #81c3d7  → use for the animated accent element
Smoke #e7e7e7  → use for light fills
Mauve #d5c5c8  → use for secondary shapes
Red   #ed1c24  → only if this is the one red moment in the video
```

How to recolor Lottie:
- Open .json in LottieFiles.com editor → change colors visually
- Or open .json in text editor → find hex values → replace them
- Save back to /attachments/lottie/
- NEVER use a Lottie with its original colors unless they happen to match

### 2. ICONS APPEAR AT THE EXACT AUDIO MOMENT

Every icon, Lottie, or graphic element must enter at the exact frame
that corresponds to when the narrator says the word it represents.

Rule: if the narrator says "database" at second 4.2 of a scene, set `"triggersOnWord": "database"` in the element spec. The Mistral STT sync engine will automatically extract the exact moment and output `entryFrame`. 

No more guessing words per second. The LLM handles concept logic (`triggersOnWord`), and the physical pipeline handles execution (`entryFrame`).

After first render: if you want an element delayed *after* a word, use `entryDelayMs`.

### 3. CAPTIONS AND TEXT SYNC TO AUDIO — ALWAYS

Whether bold kinetic text, handwritten path, or narration overlay:
- Text reveals word by word
- Each word appears at the frame the narrator speaks it
- Not before. Not after. At the moment.

Word-reveal timing in Remotion:
```tsx
// Handled automatically via SyncedWordReveal component using STT exact frames
```

Adjustments to timing are now precise frame manipulations rather than blind guessing.

### 4. AUDIO IS THE MASTER — EVERYTHING FOLLOWS IT

The audio file is generated first. Its duration is measured.
Remotion composition duration is set to match audio exactly.
Visual scenes are built to fit within audio timing.
Never extend a video beyond audio duration.
Never cut audio short for a visual.
Audio leads. Everything else follows.

### 5. POSITIONING SIMPLICITY RULE

Claude uses percentage-based positions (x: "50%", y: "40%").
For every layout, use only these tested safe positions:

```
Center:        x: "50%", y: "45%"
Upper center:  x: "50%", y: "30%"
Lower center:  x: "50%", y: "65%"
Left third:    x: "25%", y: "45%"
Right third:   x: "75%", y: "45%"
Top left:      x: "25%", y: "30%"
Top right:     x: "75%", y: "30%"
```

Claude uses these presets. It does not invent arbitrary positions.
If a layout needs something outside these presets, it flags it.

### 6. COMPLEXITY HONESTY RULE

If a requested motion or effect is beyond reliable automatic generation:
- Claude admits it directly: "This specific effect is too complex to generate reliably."
- Claude describes exactly what the effect should look like
- Claude gives step-by-step instructions for doing it manually in the JSON
  or suggests which Remotion/Lottie tool to use
- Claude never silently produces a broken approximation

Things Claude can do reliably:
✅ Word-by-word text reveal synced to frame timing
✅ Element spring-in at exact frame
✅ Lottie playing at exact frame
✅ Drawing lines and arrows frame by frame
✅ Color changes on cue
✅ Standard kinetic text slam
✅ Scene transitions (dissolve, smash cut, wipe)

Things Claude flags as manual:
⚠ Lip-sync animation tied to waveform
⚠ Physics simulations (cloth, particles)
⚠ Path-following animation along a curved route
⚠ Real-time audio reactive visuals
⚠ Character rigging with bone animation
